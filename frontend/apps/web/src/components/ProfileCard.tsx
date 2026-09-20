import { Fragment } from 'react'
import type { SharedPool } from '../lib/pools'
import type { LatLng, ProfileItemRow, ProfileRow, Quote } from '../lib/types'
import { IconComment, IconPin } from '../lib/icons'
import { MapBlock } from './MapBlock'
import { SocialRow } from './SocialRow'

type ProfileCardProps = {
  profile: ProfileRow
  items: ProfileItemRow[]
  myLocation: LatLng | null
  sharedPools?: SharedPool[]
  onComment?: (quote: Quote) => void
}

function CommentButton({ onPhoto, onClick }: { onPhoto: boolean; onClick: () => void }) {
  return (
    <div className={`comment-btn ${onPhoto ? 'on-photo' : 'on-text'}`} onClick={onClick}>
      <IconComment />
    </div>
  )
}

export function ProfileCard({ profile, items, myLocation, sharedPools = [], onComment }: ProfileCardProps) {
  const name = profile.display_name || profile.username || 'Someone new'

  // Unfinished items (a photo slot with no upload, a blank text block) are the
  // owner's business — they shouldn't show up as empty blocks to anyone else.
  const visibleItems = items.filter((item) =>
    item.kind === 'photo' ? Boolean(item.photo_url) : Boolean(item.body?.trim()),
  )
  const photoCount = visibleItems.filter((item) => item.kind === 'photo').length + 1

  const profileLocation: LatLng | null =
    profile.latitude != null && profile.longitude != null
      ? { lat: profile.latitude, lng: profile.longitude }
      : null

  const itemsWithPhotoIndex = visibleItems.reduce<{ item: ProfileItemRow; photoIndex: number }[]>((acc, item) => {
    const previousIndex = acc.length > 0 ? acc[acc.length - 1].photoIndex : 1
    const photoIndex = item.kind === 'photo' ? previousIndex + 1 : previousIndex
    return [...acc, { item, photoIndex }]
  }, [])

  return (
    <Fragment>
      <div className="photo-block first">
        {profile.avatar_url && <img src={profile.avatar_url} alt="" />}
        <div className="name-overlay">
          <span className="name">{name}</span>
          {profile.headline && <div className="role">{profile.headline}</div>}
          {sharedPools.length > 0 && (
            <div className="shared-pool-row">
              {sharedPools.map((pool) => (
                <span className="shared-pool-chip" key={pool.id}>
                  {pool.name}
                </span>
              ))}
            </div>
          )}
          <SocialRow profile={profile} lastActiveAt={profile.last_active_at} />
        </div>
        {onComment && (
          <CommentButton onPhoto onClick={() => onComment({ kind: 'photo', text: 'Main photo' })} />
        )}
      </div>

      {itemsWithPhotoIndex.map(({ item, photoIndex }) => {
        if (item.kind === 'text') {
          const text = item.body || ''
          return (
            <div className="prompt-block" key={item.id}>
              <div className="a">{text}</div>
              {onComment && (
                <div className="prompt-actions">
                  <CommentButton onPhoto={false} onClick={() => onComment({ kind: 'text', text })} />
                </div>
              )}
            </div>
          )
        }

        const label = `Photo ${photoIndex} of ${photoCount}`
        return (
          <div className="photo-block" key={item.id}>
            {item.photo_url && <img src={item.photo_url} alt="" />}
            {onComment && (
              <CommentButton onPhoto onClick={() => onComment({ kind: 'photo', text: label })} />
            )}
          </div>
        )
      })}

      {profile.location_text && (
        <div className="map-block">
          <div className="location-line">
            <IconPin /> {profile.location_text}
          </div>
          {profileLocation && <MapBlock primary={profileLocation} secondary={myLocation} />}
        </div>
      )}
    </Fragment>
  )
}
