import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { ChatDetailSkeleton } from '../components/skeletons'
import { IconArrowLeft, IconCamera, IconLightbulb, IconMore, IconSend } from '../lib/icons'
import { shouldSendOnEnter } from '../lib/keyboard'
import { fetchThread, markThreadSeen, sendMessage, subscribeToThread } from '../lib/messages'
import { fetchMyProfile } from '../lib/profiles'
import {
  REPORT_REASONS,
  blockUser,
  fetchHiddenUserIds,
  fetchIBlockedUser,
  reportUser,
  unblockUser,
  type ReportReason,
} from '../lib/safety'
import type { MessageRow, ProfileRow } from '../lib/types'

const TIPS = [
  'Ask for social media for verification',
  'A mystery room, or shared adventure activity might help making friendships',
  'Find common interests using profiles.',
  'Suggest meeting in a public place first, like a cafe near you both',
  "Ask what got them into one of their listed interests, it's an easy conversation opener",
]

type SafetyPanel = 'menu' | 'block' | 'report' | null

export function ChatDetailPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { userId: otherUserId } = useParams<{ userId: string }>()

  const [otherProfile, setOtherProfile] = useState<ProfileRow | null>(null)
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [loadedThreadUserId, setLoadedThreadUserId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [tipsExpanded, setTipsExpanded] = useState(false)
  const [currentTipIndex] = useState(() => Math.floor(Math.random() * TIPS.length))
  const listRef = useRef<HTMLDivElement>(null)
  const safetyRef = useRef<HTMLDivElement>(null)

  const [safetyPanel, setSafetyPanel] = useState<SafetyPanel>(null)
  const [iBlocked, setIBlocked] = useState(false)
  const [threadHidden, setThreadHidden] = useState(false)
  const [reportReason, setReportReason] = useState<ReportReason>(REPORT_REASONS[0])
  const [reportDetails, setReportDetails] = useState('')
  const [safetyBusy, setSafetyBusy] = useState(false)
  const [safetyNote, setSafetyNote] = useState<string | null>(null)

  useEffect(() => {
    if (!otherUserId) return
    void fetchMyProfile(otherUserId).then(setOtherProfile)
  }, [otherUserId])

  useEffect(() => {
    if (!user || !otherUserId) return
    void Promise.all([fetchIBlockedUser(user.id, otherUserId), fetchHiddenUserIds(user.id)]).then(
      ([blocked, hidden]) => {
        setIBlocked(blocked)
        setThreadHidden(hidden.has(otherUserId))
      },
    )
  }, [user, otherUserId])

  useEffect(() => {
    if (!user || !otherUserId) return
    void fetchThread(user.id, otherUserId)
      .then((thread) => {
        setMessages(thread)
        setLoadedThreadUserId(otherUserId)
        void markThreadSeen(user.id, otherUserId)
      })
      .catch(() => {
        setMessages([])
        setLoadedThreadUserId(otherUserId)
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

  useEffect(() => {
    if (!safetyPanel) return
    function onPointerDown(event: PointerEvent) {
      if (safetyRef.current && !safetyRef.current.contains(event.target as Node)) {
        setSafetyPanel(null)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [safetyPanel])

  const waitingForReply = useMemo(() => {
    const last = messages[messages.length - 1]
    return Boolean(last && user && last.sender_id === user.id)
  }, [messages, user])

  async function handleSend() {
    if (!user || !otherUserId || threadHidden) return
    const text = draft.trim()
    if (!text) return
    setDraft('')
    await sendMessage(user.id, otherUserId, text)
  }

  async function handleBlock() {
    if (!user || !otherUserId) return
    setSafetyBusy(true)
    try {
      await blockUser(user.id, otherUserId)
      setIBlocked(true)
      setThreadHidden(true)
      setSafetyPanel(null)
      setSafetyNote('You blocked this person. Unblock from the menu to message again.')
    } catch {
      setSafetyNote('Could not block. Try again.')
    } finally {
      setSafetyBusy(false)
    }
  }

  async function handleUnblock() {
    if (!user || !otherUserId) return
    setSafetyBusy(true)
    try {
      await unblockUser(user.id, otherUserId)
      setIBlocked(false)
      setThreadHidden(false)
      setSafetyPanel(null)
      setSafetyNote(null)
    } catch {
      setSafetyNote('Could not unblock. Try again.')
    } finally {
      setSafetyBusy(false)
    }
  }

  async function handleReport() {
    if (!user || !otherUserId) return
    setSafetyBusy(true)
    try {
      await reportUser(user.id, otherUserId, reportReason, reportDetails)
      setSafetyPanel(null)
      setReportDetails('')
      setSafetyNote('Thanks — we received your report.')
    } catch {
      setSafetyNote('Could not send the report. Try again.')
    } finally {
      setSafetyBusy(false)
    }
  }

  const name = otherProfile?.display_name || otherProfile?.username || 'Someone'

  if (!otherUserId || loadedThreadUserId !== otherUserId) {
    return <ChatDetailSkeleton />
  }

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
        <div className="chat-safety" ref={safetyRef}>
          <button
            type="button"
            className="chat-safety-btn"
            aria-label="Block or report"
            aria-expanded={safetyPanel != null}
            onClick={() => setSafetyPanel((open) => (open ? null : 'menu'))}
          >
            <IconMore />
          </button>
          {safetyPanel === 'menu' && (
            <div className="chat-safety-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => setSafetyPanel('report')}>
                Report
              </button>
              {iBlocked ? (
                <button type="button" role="menuitem" disabled={safetyBusy} onClick={() => void handleUnblock()}>
                  Unblock
                </button>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  className="danger"
                  onClick={() => setSafetyPanel('block')}
                >
                  Block
                </button>
              )}
            </div>
          )}
          {safetyPanel === 'block' && (
            <div className="chat-safety-sheet">
              <div className="chat-safety-sheet-title">Block {name}?</div>
              <p>They won’t see you on Discover, and neither of you can send new messages.</p>
              <div className="chat-safety-sheet-actions">
                <button type="button" disabled={safetyBusy} onClick={() => setSafetyPanel('menu')}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="danger"
                  disabled={safetyBusy}
                  onClick={() => void handleBlock()}
                >
                  Block
                </button>
              </div>
            </div>
          )}
          {safetyPanel === 'report' && (
            <div className="chat-safety-sheet">
              <div className="chat-safety-sheet-title">Report {name}</div>
              <label className="chat-safety-field">
                Reason
                <select
                  value={reportReason}
                  onChange={(event) => setReportReason(event.target.value as ReportReason)}
                >
                  {REPORT_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </label>
              <label className="chat-safety-field">
                Details (optional)
                <textarea
                  rows={2}
                  value={reportDetails}
                  onChange={(event) => setReportDetails(event.target.value)}
                  placeholder="Anything we should know?"
                />
              </label>
              <div className="chat-safety-sheet-actions">
                <button type="button" disabled={safetyBusy} onClick={() => setSafetyPanel('menu')}>
                  Cancel
                </button>
                <button type="button" disabled={safetyBusy} onClick={() => void handleReport()}>
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {safetyNote && <div className="chat-safety-note">{safetyNote}</div>}

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
        {waitingForReply && !threadHidden && <div className="waiting-note">Waiting for {name} to reply</div>}
        {threadHidden && (
          <div className="waiting-note">
            {iBlocked ? 'You blocked this person. Unblock from the menu to message again.' : 'Messaging is unavailable.'}
          </div>
        )}
      </div>

      <div id="chatInputArea">
        <div className="chat-input-row">
          <textarea
            className="input-box"
            id="chatReplyInput"
            placeholder={threadHidden ? 'Messaging unavailable' : 'Type a message...'}
            rows={1}
            value={draft}
            disabled={threadHidden}
            onChange={(event) => setDraft(event.target.value)}
            enterKeyHint="enter"
            onKeyDown={(event) => {
              if (shouldSendOnEnter(event)) {
                event.preventDefault()
                void handleSend()
              }
            }}
          />
          <div
            className={`send-btn${threadHidden ? ' disabled' : ''}`}
            onClick={() => {
              if (!threadHidden) void handleSend()
            }}
          >
            <IconSend />
          </div>
        </div>
      </div>
    </div>
  )
}
