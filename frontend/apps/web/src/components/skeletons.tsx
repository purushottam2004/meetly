import type { CSSProperties, ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { IconArrowLeft } from '../lib/icons'

type BoneProps = {
  className?: string
  width?: number | string
  height?: number | string
  radius?: number | string
  style?: CSSProperties
}

function Bone({ className = '', width, height, radius, style }: BoneProps) {
  return (
    <span
      className={`skeleton-bone ${className}`}
      style={{ width, height, borderRadius: radius, ...style }}
    />
  )
}

function Screen({
  id,
  children,
}: {
  id: string
  children: ReactNode
}) {
  return (
    <div className="screen active" id={id} aria-busy="true">
      <span className="sr-only" role="status">
        Loading
      </span>
      {children}
    </div>
  )
}

function BackRow({ label, to }: { label: string; to: string }) {
  const navigate = useNavigate()
  return (
    <div className="back-row" onClick={() => navigate(to)}>
      <IconArrowLeft /> {label}
    </div>
  )
}

function ProfileCardSkeleton({ withMap = true }: { withMap?: boolean }) {
  return (
    <div className="card skeleton-card">
      <div className="photo-block first skeleton-shimmer">
        <div className="name-overlay">
          <Bone width="42%" height={22} radius={8} />
          <Bone width="58%" height={12} radius={6} style={{ marginTop: 8 }} />
          <div className="social-row">
            <Bone width={28} height={28} radius="50%" />
            <Bone width={72} height={18} radius={9} />
          </div>
        </div>
      </div>
      <div className="prompt-block">
        <Bone width="92%" height={14} />
        <Bone width="74%" height={14} style={{ marginTop: 8 }} />
        <Bone width="40%" height={14} style={{ marginTop: 8 }} />
      </div>
      <div className="photo-block skeleton-shimmer" style={{ minHeight: 180 }} />
      {withMap && (
        <div className="map-block">
          <Bone width="46%" height={16} />
          <div className="map-box skeleton-shimmer" style={{ marginTop: 10 }} />
        </div>
      )}
    </div>
  )
}

function DiscoverFiltersSkeleton() {
  return (
    <div className="discover-filters" aria-hidden>
      <div className="discover-filter-section">
        <div className="discover-filter-label">Groups you are visible to</div>
        <div className="discover-filter-chips">
          <Bone width={88} height={26} radius={999} />
          <Bone width={72} height={26} radius={999} />
        </div>
      </div>
      <div className="discover-filter-section">
        <div className="discover-filter-label">Groups visible to you</div>
        <div className="discover-filter-chips">
          <Bone width={88} height={26} radius={999} />
          <Bone width={64} height={26} radius={999} />
          <Bone width={76} height={26} radius={999} />
        </div>
      </div>
    </div>
  )
}

export function DiscoverSkeleton({ filters }: { filters?: ReactNode }) {
  return (
    <Screen id="screen-discover">
      {filters ?? <DiscoverFiltersSkeleton />}
      <ProfileCardSkeleton withMap={false} />
      <div className="floating-actions" aria-hidden>
        <span className="float-btn skeleton-shimmer" />
        <span className="float-btn skeleton-shimmer" />
      </div>
    </Screen>
  )
}

export function ChatsSkeleton() {
  return (
    <Screen id="screen-chats">
      <BackRow label="Back to Discover" to="/" />
      <div className="screen-title">Chats</div>
      <div className="chat-list">
        {Array.from({ length: 6 }, (_, index) => (
          <div className="chat-row" key={index} aria-hidden>
            <Bone className="chat-avatar" width={46} height={46} radius="50%" />
            <div className="chat-meta">
              <Bone width="42%" height={13} />
              <Bone width="78%" height={12} style={{ marginTop: 8 }} />
            </div>
            <div className="chat-right">
              <Bone width={36} height={10} />
            </div>
          </div>
        ))}
      </div>
    </Screen>
  )
}

export function ChatDetailSkeleton() {
  const navigate = useNavigate()
  return (
    <Screen id="screen-chat-detail">
      <div className="chat-detail-header">
        <span className="arrow" onClick={() => navigate('/chats')}>
          <IconArrowLeft />
        </span>
        <div className="chat-person" aria-hidden>
          <Bone className="cavatar" width={34} height={34} radius="50%" />
          <Bone width={120} height={14} />
        </div>
        <Bone width={26} height={26} radius={8} />
      </div>
      <div id="tipsBar" aria-hidden>
        <div className="tip-bar-collapsed">
          <Bone width="88%" height={12} />
        </div>
      </div>
      <div className="message-list" aria-hidden>
        <Bone className="bubble them skeleton-bubble" width="58%" height={42} radius={16} />
        <Bone className="bubble me skeleton-bubble" width="46%" height={36} radius={16} />
        <Bone className="bubble them skeleton-bubble" width="70%" height={54} radius={16} />
        <Bone className="bubble me skeleton-bubble" width="38%" height={36} radius={16} />
      </div>
      <div id="chatInputArea" aria-hidden>
        <div className="chat-input-row">
          <Bone height={40} radius={20} style={{ flex: 1 }} />
          <Bone width={40} height={40} radius="50%" />
        </div>
      </div>
    </Screen>
  )
}

export function ProfileSkeleton() {
  return (
    <Screen id="screen-profile">
      <BackRow label="Back to Discover" to="/" />
      <div className="screen-title-row">
        <div className="screen-title">Your profile</div>
        <Bone width={118} height={28} radius={20} />
      </div>
      <div className="profile-header-card" aria-hidden>
        <div className="photo-block first skeleton-shimmer">
          <div className="name-overlay">
            <Bone width="36%" height={22} radius={8} />
            <Bone width="52%" height={12} radius={6} style={{ marginTop: 8 }} />
          </div>
        </div>
      </div>
      <div id="profileItemsList" style={{ marginTop: 14 }} aria-hidden>
        <div className="profile-item">
          <div className="item-top">
            <Bone width={48} height={12} />
          </div>
          <div className="item-body">
            <Bone width="100%" height={14} />
            <Bone width="72%" height={14} style={{ marginTop: 8 }} />
          </div>
        </div>
        <div className="profile-item">
          <div className="item-top">
            <Bone width={48} height={12} />
          </div>
          <div className="item-body">
            <div className="item-photo skeleton-shimmer" />
          </div>
        </div>
      </div>
    </Screen>
  )
}

export function UserProfileSkeleton({ backTo = '/chats' }: { backTo?: string }) {
  return (
    <Screen id="screen-user-profile">
      <BackRow label="Back to chat" to={backTo} />
      <ProfileCardSkeleton />
    </Screen>
  )
}

export function BasicsSkeleton() {
  return (
    <Screen id="screen-basics">
      <div className="basics-screen-body">
        <div className="screen-title" style={{ paddingTop: 6 }}>
          A bit about you
        </div>
        <Bone width="86%" height={12} style={{ margin: '12px 0 8px' }} />
        <Bone width={96} height={96} radius="50%" style={{ margin: '8px auto 0' }} />
        <Bone width={48} height={12} style={{ margin: '10px auto 0' }} />
        <label className="basics-label">Name</label>
        <Bone height={40} radius={10} style={{ marginTop: 6, width: '100%' }} />
        <label className="basics-label">Role</label>
        <Bone height={40} radius={10} style={{ marginTop: 6, width: '100%' }} />
        <label className="basics-label">About you</label>
        <Bone height={72} radius={10} style={{ marginTop: 6, width: '100%' }} />
        <label className="basics-label">Visibility</label>
        <Bone width={160} height={32} radius={20} style={{ marginTop: 8 }} />
        <Bone height={44} radius={10} style={{ margin: '20px 0 0', width: '100%' }} />
      </div>
    </Screen>
  )
}

export function LocationSkeleton() {
  return (
    <Screen id="screen-location">
      <BackRow label="Back" to="/" />
      <div className="location-screen-body">
        <div className="screen-title" style={{ paddingTop: 6 }}>
          Location
        </div>
        <Bone height={46} radius={10} style={{ marginTop: 18, width: '100%' }} />
        <Bone height={46} radius={10} style={{ marginTop: 12, width: '100%' }} />
        <div className="location-suggestions" aria-hidden>
          {Array.from({ length: 5 }, (_, index) => (
            <div className="location-suggestion-row" key={index}>
              <Bone width={15} height={15} radius={4} />
              <Bone width={`${58 - index * 6}%`} height={14} />
            </div>
          ))}
        </div>
      </div>
    </Screen>
  )
}

export function LoginSkeleton() {
  return (
    <Screen id="screen-login">
      <BackRow label="Back" to="/" />
      <div className="login-body">
        <div className="login-logo">meetly</div>
        <Bone width={220} height={14} style={{ marginBottom: 32 }} />
        <Bone height={46} radius={10} style={{ width: '100%', maxWidth: 280 }} />
        <Bone width={24} height={12} style={{ margin: '16px 0' }} />
        <Bone height={46} radius={10} style={{ width: '100%', maxWidth: 280 }} />
      </div>
    </Screen>
  )
}

export function RouteSkeleton() {
  const { pathname } = useLocation()
  if (pathname === '/chats') return <ChatsSkeleton />
  if (pathname.startsWith('/chats/')) return <ChatDetailSkeleton />
  if (pathname === '/profile') return <ProfileSkeleton />
  if (pathname.startsWith('/profile/')) return <UserProfileSkeleton />
  if (pathname === '/basics') return <BasicsSkeleton />
  if (pathname === '/location') return <LocationSkeleton />
  return <DiscoverSkeleton />
}
