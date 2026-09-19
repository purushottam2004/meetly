import { useEffect, useRef, useState } from 'react'
import type { ProfileRow, Quote } from '../lib/types'
import { IconCamera, IconClose, IconSend } from '../lib/icons'

type ComposeOverlayProps = {
  profile: ProfileRow
  quote: Quote | null
  onClearQuote: () => void
  onCancel: () => void
  onSend: (text: string) => Promise<void>
}

export function ComposeOverlay({ profile, quote, onClearQuote, onCancel, onSend }: ComposeOverlayProps) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  async function handleSend() {
    if (sending) return
    setSending(true)
    try {
      await onSend(text.trim() || 'Hey, would love to connect!')
      setText('')
    } finally {
      setSending(false)
    }
  }

  const name = profile.display_name || profile.username || 'them'

  return (
    <div className="compose-overlay open">
      <div className="compose-box">
        <div className="title">Message {name}</div>

        {quote && (
          <div className="compose-quote" style={{ display: 'flex' }}>
            <div className="quote-body">
              <div className="quote-name">{name}</div>
              <div className="quote-text">
                {quote.kind === 'photo' && <IconCamera />}
                <span>{quote.text}</span>
              </div>
            </div>
            <div className="quote-close" onClick={onClearQuote}>
              <IconClose />
            </div>
          </div>
        )}

        <textarea
          ref={textareaRef}
          placeholder="Say something..."
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void handleSend()
            }
          }}
        />

        <div className="compose-actions">
          <div className="btn" onClick={onCancel}>
            Cancel
          </div>
          <div className="btn send" onClick={() => void handleSend()}>
            <IconSend />
            {sending ? 'Sending…' : 'Send'}
          </div>
        </div>
      </div>
    </div>
  )
}
