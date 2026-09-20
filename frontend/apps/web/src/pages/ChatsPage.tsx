import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { ChatsSkeleton } from '../components/skeletons'
import { IconArrowLeft } from '../lib/icons'
import {
  fetchMessagesFor,
  groupIntoConversations,
  subscribeToUnreadChanges,
  type Conversation,
} from '../lib/messages'
import { fetchMyProfile } from '../lib/profiles'
import { fetchHiddenUserIds } from '../lib/safety'
import { formatRelativeTime } from '../lib/time'
import type { ProfileRow } from '../lib/types'

export function ChatsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState<Conversation[] | null>(null)
  const [profiles, setProfiles] = useState<Map<string, ProfileRow>>(new Map())
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) return

    const load = () =>
      void fetchMessagesFor(user.id)
        .then(async (messages) => {
          const hidden = await fetchHiddenUserIds(user.id)
          setBlockedIds(hidden)
          const grouped = groupIntoConversations(user.id, messages)
          setConversations(grouped)

          const entries = await Promise.all(
            grouped.map(async (c) => [c.otherUserId, await fetchMyProfile(c.otherUserId)] as const),
          )
          const map = new Map<string, ProfileRow>()
          for (const [id, profile] of entries) {
            if (profile) map.set(id, profile)
          }
          setProfiles(map)
        })
        .catch(() => setConversations([]))

    load()
    return subscribeToUnreadChanges(user.id, load)
  }, [user])

  if (conversations === null) {
    return <ChatsSkeleton />
  }

  return (
    <div className="screen active" id="screen-chats">
      <div className="back-row" onClick={() => navigate('/')}>
        <IconArrowLeft /> Back to Discover
      </div>
      <div className="screen-title">Chats</div>
      <div className="chat-list">
        {conversations && conversations.length === 0 && (
          <div className="chats-empty">No chats yet. Message someone from Discover to start one.</div>
        )}
        {conversations?.map((c) => {
          const profile = profiles.get(c.otherUserId)
          const name = profile?.display_name || profile?.username || 'Someone'
          const blocked = blockedIds.has(c.otherUserId)
          return (
            <div className="chat-row" key={c.otherUserId} onClick={() => navigate(`/chats/${c.otherUserId}`)}>
              <div
                className="chat-avatar"
                style={
                  profile?.avatar_url
                    ? { backgroundImage: `url(${profile.avatar_url})`, backgroundSize: 'cover' }
                    : undefined
                }
              />
              <div className="chat-meta">
                <div className="top-line">
                  <span className="cname">{name}</span>
                </div>
                <div className="preview">{c.lastMessage.body}</div>
              </div>
              <div className="chat-right">
                <span className="time">{formatRelativeTime(c.lastMessage.created_at)}</span>
                {blocked ? (
                  <span className="blocked-badge">Blocked</span>
                ) : c.unreadCount > 0 ? (
                  <span className="chat-unread-badge">{c.unreadCount}</span>
                ) : (
                  c.waitingForReply && <span className="waiting-badge">Waiting for reply</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
