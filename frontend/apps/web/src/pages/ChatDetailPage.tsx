import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { IconArrowLeft, IconCamera, IconLightbulb, IconSend } from '../lib/icons'
import { shouldSendOnEnter } from '../lib/keyboard'
import { fetchThread, markThreadSeen, sendMessage, subscribeToThread } from '../lib/messages'
import { fetchMyProfile } from '../lib/profiles'
import type { MessageRow, ProfileRow } from '../lib/types'

const TIPS = [
  'Ask for social media for verification',
  'A mystery room, or shared adventure activity might help making friendships',
  'Find common interests using profiles.',
  'Suggest meeting in a public place first, like a cafe near you both',
  "Ask what got them into one of their listed interests, it's an easy conversation opener",
]

export function ChatDetailPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { userId: otherUserId } = useParams<{ userId: string }>()

  const [otherProfile, setOtherProfile] = useState<ProfileRow | null>(null)
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [draft, setDraft] = useState('')
  const [tipsExpanded, setTipsExpanded] = useState(false)
  const [currentTipIndex] = useState(() => Math.floor(Math.random() * TIPS.length))
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!otherUserId) return
    void fetchMyProfile(otherUserId).then(setOtherProfile)
  }, [otherUserId])

  useEffect(() => {
    if (!user || !otherUserId) return
    void fetchThread(user.id, otherUserId).then((thread) => {
      setMessages(thread)
      void markThreadSeen(user.id, otherUserId)
    })
    return subscribeToThread(user.id, otherUserId, (message) => {
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]))
      if (message.recipient_id === user.id) {
        void markThreadSeen(user.id, otherUserId)
      }
    })
  }, [user, otherUserId])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages])

  const waitingForReply = useMemo(() => {
    const last = messages[messages.length - 1]
    return Boolean(last && user && last.sender_id === user.id)
  }, [messages, user])

  async function handleSend() {
    if (!user || !otherUserId) return
    const text = draft.trim()
    if (!text) return
    setDraft('')
    await sendMessage(user.id, otherUserId, text)
  }

  const name = otherProfile?.display_name || otherProfile?.username || 'Someone'

  return (
    <div className="screen active" id="screen-chat-detail">
      <div className="chat-detail-header">
        <span className="arrow" onClick={() => navigate('/chats')}>
          <IconArrowLeft />
        </span>
        <div
          className="chat-person"
          title="View profile"
          onClick={() => otherUserId && navigate(`/profile/${otherUserId}`)}
        >
          <div
            className="cavatar"
            style={
              otherProfile?.avatar_url
                ? { backgroundImage: `url(${otherProfile.avatar_url})`, backgroundSize: 'cover' }
                : undefined
            }
          />
          <div className="cname">{name}</div>
        </div>
      </div>

      <div id="tipsBar">
        {tipsExpanded ? (
          <div className="tip-bar-expanded">
            <div className="tip-bar-header" onClick={() => setTipsExpanded(false)}>
              <IconArrowLeft /> Conversation tips
            </div>
            <div className="tip-list">
              {TIPS.map((tip) => (
                <div className="tip-item" key={tip}>
                  <IconLightbulb /> {tip}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="tip-bar-collapsed" onClick={() => setTipsExpanded(true)}>
            <IconLightbulb /> {TIPS[currentTipIndex]}
          </div>
        )}
      </div>

      <div className="message-list" id="messageList" ref={listRef}>
        {messages.map((m) => (
          <div className={`bubble ${m.sender_id === user?.id ? 'me' : 'them'}`} key={m.id}>
            {m.quote_text && (
              <div className="bubble-quote">
                {m.quote_kind === 'photo' && <IconCamera />}
                <span>{m.quote_text}</span>
              </div>
            )}
            {m.body}
          </div>
        ))}
        {waitingForReply && <div className="waiting-note">Waiting for {name} to reply</div>}
      </div>

      <div id="chatInputArea">
        <div className="chat-input-row">
          <textarea
            className="input-box"
            id="chatReplyInput"
            placeholder="Type a message..."
            rows={1}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            enterKeyHint="enter"
            onKeyDown={(event) => {
              if (shouldSendOnEnter(event)) {
                event.preventDefault()
                void handleSend()
              }
            }}
          />
          <div className="send-btn" onClick={() => void handleSend()}>
            <IconSend />
          </div>
        </div>
      </div>
    </div>
  )
}
