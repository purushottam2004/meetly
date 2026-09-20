import type { ProfileRow } from '../lib/types'
import { IconInstagram, IconLinkedin, IconTwitter } from '../lib/icons'
import { formatLastSeen } from '../lib/time'

const SOCIAL_ICONS = {
  linkedin: IconLinkedin,
  instagram: IconInstagram,
  twitter: IconTwitter,
} as const

type SocialLinks = Pick<ProfileRow, 'linkedin_url' | 'instagram_url' | 'twitter_url' | 'open_to_chat'>
type SocialUrlKey = keyof Omit<SocialLinks, 'open_to_chat'>

const SOCIAL_FIELDS: { key: SocialUrlKey; icon: keyof typeof SOCIAL_ICONS }[] = [
  { key: 'linkedin_url', icon: 'linkedin' },
  { key: 'instagram_url', icon: 'instagram' },
  { key: 'twitter_url', icon: 'twitter' },
]

export function SocialRow({
  profile,
  lastActiveAt,
  showOpenToChat = true,
}: {
  profile: SocialLinks
  lastActiveAt?: string | null
  showOpenToChat?: boolean
}) {
  const openToChat = showOpenToChat && profile.open_to_chat
  const links = SOCIAL_FIELDS.filter((field) => profile[field.key])
  if (links.length === 0 && !lastActiveAt && !openToChat) return null

  return (
    <div className="social-row">
      {lastActiveAt && <span className="last-seen-badge">{formatLastSeen(lastActiveAt)}</span>}
      {openToChat && <span className="open-to-chat-badge">Open to chat</span>}
      {links.map(({ key, icon }) => {
        const Icon = SOCIAL_ICONS[icon]
        return (
          <a
            key={key}
            className="social-btn"
            href={profile[key] ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
          >
            <Icon />
          </a>
        )
      })}
    </div>
  )
}
