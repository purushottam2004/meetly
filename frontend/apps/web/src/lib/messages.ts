import { supabase } from './supabaseClient'
import type { MessageRow, Quote } from './types'

export type Conversation = {
  otherUserId: string
  messages: MessageRow[]
  lastMessage: MessageRow
  waitingForReply: boolean
  unreadCount: number
}

export async function fetchMessagesFor(userId: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** Grouping by the other participant and sorting by time happens here, client-side. */
export function groupIntoConversations(userId: string, messages: MessageRow[]): Conversation[] {
  const byOtherUser = new Map<string, MessageRow[]>()
  for (const message of messages) {
    const otherUserId = message.sender_id === userId ? message.recipient_id : message.sender_id
    const existing = byOtherUser.get(otherUserId) ?? []
    existing.push(message)
    byOtherUser.set(otherUserId, existing)
  }

  const conversations = Array.from(byOtherUser.entries()).map(([otherUserId, msgs]) => {
    const sorted = [...msgs].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
    const lastMessage = sorted[sorted.length - 1]
    return {
      otherUserId,
      messages: sorted,
      lastMessage,
      waitingForReply: lastMessage.sender_id === userId,
      unreadCount: sorted.filter((m) => m.recipient_id === userId && !m.is_seen).length,
    }
  })

  return conversations.sort(
    (a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime(),
  )
}

export async function fetchThread(userId: string, otherUserId: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(
      `and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`,
    )
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function sendMessage(
  senderId: string,
  recipientId: string,
  body: string,
  quote?: Quote | null,
): Promise<MessageRow> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: senderId,
      recipient_id: recipientId,
      body,
      quote_kind: quote?.kind ?? null,
      quote_text: quote?.text ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

/** How many distinct conversations have unseen messages (not how many messages). */
export async function countUnreadChats(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('messages')
    .select('sender_id')
    .eq('recipient_id', userId)
    .eq('is_seen', false)
  if (error) throw error
  return new Set((data ?? []).map((m) => m.sender_id)).size
}

/** Marks every not-yet-seen message from `otherUserId` to `userId` as seen. */
export async function markThreadSeen(userId: string, otherUserId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ is_seen: true })
    .eq('recipient_id', userId)
    .eq('sender_id', otherUserId)
    .eq('is_seen', false)
  if (error) throw error
}

// supabase.channel() hands back the *existing* channel for a topic that is
// already open, and binding to one after it has subscribed throws. Several
// components watch unread state at once, so each subscription gets its own topic.
let unreadChannelSeq = 0

/** Fires on any insert/update touching messages addressed to `userId` — used to keep the unread badge live. */
export function subscribeToUnreadChanges(userId: string, onChange: () => void): () => void {
  unreadChannelSeq += 1
  const channel = supabase
    .channel(`unread:${userId}:${unreadChannelSeq}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'messages', filter: `recipient_id=eq.${userId}` },
      onChange,
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}

/** Realtime subscription for a single thread; returns an unsubscribe function. */
export function subscribeToThread(
  userId: string,
  otherUserId: string,
  onInsert: (message: MessageRow) => void,
): () => void {
  const channelName = `messages:${[userId, otherUserId].sort().join(':')}`
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => {
        const message = payload.new as MessageRow
        const touchesThread =
          (message.sender_id === userId && message.recipient_id === otherUserId) ||
          (message.sender_id === otherUserId && message.recipient_id === userId)
        if (touchesThread) onInsert(message)
      },
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}
