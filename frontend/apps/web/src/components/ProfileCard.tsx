import { Fragment } from 'react'
import type { LatLng, ProfileItemRow, ProfileRow, Quote } from '../lib/types'
import { IconComment, IconPin } from '../lib/icons'
import { MapBlock } from './MapBlock'
import { SocialRow } from './SocialRow'

type ProfileCardProps = {
  profile: ProfileRow
  items: ProfileItemRow[]
  myLocation: LatLng | null
  onComment: (quote: Quote) => void
}

function CommentButton({ onPhoto, onClick }: { onPhoto: boolean; onClick: () => void }) {
  return (
    <div className={`comment-btn ${onPhoto ? 'on-photo' : 'on-text'}`} onClick={onClick}>
      <IconComment />
    </div>
  )
}

export function ProfileCard({ profile, items, myLocation, onComment }: ProfileCardProps) {
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
      <div
        className="photo-block first"
        style={
          profile.avatar_url
            ? { backgroundImage: `url(${profile.avatar_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : undefined
        }
      >
        <div className="name-overlay">
          <span className="name">{name}</span>
          {profile.age != null && <span className="age">, {profile.age}</span>}
          {profile.headline && <div className="role">{profile.headline}</div>}
          <SocialRow profile={profile} lastActiveAt={profile.last_active_at} />
        </div>
        <CommentButton onPhoto onClick={() => onComment({ kind: 'photo', text: 'Main photo' })} />
      </div>

      {itemsWithPhotoIndex.map(({ item, photoIndex }) => {
        if (item.kind === 'text') {
          const text = item.body || ''
          return (
            <div className="prompt-block" key={item.id}>
              <div className="a">{text}</div>
              <div className="prompt-actions">
                <CommentButton onPhoto={false} onClick={() => onComment({ kind: 'text', text })} />
              </div>
            </div>
          )
        }

        const label = `Photo ${photoIndex} of ${photoCount}`
        return (
          <div
            className="photo-block"
            key={item.id}
            style={{
              backgroundImage: `url(${item.photo_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <CommentButton onPhoto onClick={() => onComment({ kind: 'photo', text: label })} />
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
