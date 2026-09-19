import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import {
  addProfileItem,
  deleteProfileItem,
  fetchMyProfile,
  fetchProfileItems,
  reorderProfileItems,
  saveMyActiveState,
  saveMyAvatar,
  saveMyProfileHeader,
  updateProfileItem,
  uploadProfilePhoto,
} from '../lib/profiles'
import type { ProfileItemRow, ProfileRow } from '../lib/types'
import {
  IconArrowLeft,
  IconCamera,
  IconChevronDown,
  IconChevronRight,
  IconChevronUp,
  IconEdit,
  IconTrash,
} from '../lib/icons'

export function ProfilePage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [items, setItems] = useState<ProfileItemRow[]>([])
  const [editingHeader, setEditingHeader] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [pendingPhotoItemId, setPendingPhotoItemId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    void fetchMyProfile(user.id).then(setProfile)
    void fetchProfileItems(user.id).then(setItems)
  }, [user])

  async function saveHeader(fields: {
    display_name: string
    headline: string
    age: string
    linkedin_url: string
    instagram_url: string
    twitter_url: string
  }) {
    if (!user) return
    const age = Number.parseInt(fields.age, 10)
    await saveMyProfileHeader(user.id, {
      display_name: fields.display_name || undefined,
      headline: fields.headline || undefined,
      age: Number.isFinite(age) ? age : undefined,
      linkedin_url: fields.linkedin_url,
      instagram_url: fields.instagram_url,
      twitter_url: fields.twitter_url,
    })
    setProfile(await fetchMyProfile(user.id))
    setEditingHeader(false)
  }

  async function handleAvatarChosen(file: File) {
    if (!user) return
    setUploadingAvatar(true)
    try {
      const url = await uploadProfilePhoto(user.id, file)
      await saveMyAvatar(user.id, url)
      setProfile(await fetchMyProfile(user.id))
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function handleItemPhotoChosen(itemId: string, file: File) {
    if (!user) return
    const url = await uploadProfilePhoto(user.id, file)
    await updateProfileItem(itemId, { photo_url: url })
    setItems(await fetchProfileItems(user.id))
  }

  async function addItem(kind: 'photo' | 'text') {
    if (!user) return
    const position = items.length
    const created = await addProfileItem(user.id, kind, position, kind === 'text' ? { body: '' } : {})
    setItems((prev) => [...prev, created])
    if (kind === 'text') setEditingItemId(created.id)
    else {
      setPendingPhotoItemId(created.id)
      photoInputRef.current?.click()
    }
  }

  async function removeItem(itemId: string) {
    await deleteProfileItem(itemId)
    setItems((prev) => prev.filter((item) => item.id !== itemId))
    if (editingItemId === itemId) setEditingItemId(null)
  }

  async function moveItem(index: number, direction: -1 | 1) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= items.length) return
    const next = [...items]
    ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
    const withPositions = next.map((item, i) => ({ ...item, position: i }))
    setItems(withPositions)
    await reorderProfileItems(withPositions.map((item) => ({ id: item.id, position: item.position })))
  }

  async function saveItemText(itemId: string, body: string) {
    await updateProfileItem(itemId, { body })
    setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, body } : item)))
  }

  async function toggleActive() {
    if (!user || !profile) return
    const nextActive = !profile.is_active
    setProfile({ ...profile, is_active: nextActive })
    await saveMyActiveState(user.id, nextActive)
  }

  if (!profile) {
    return <p style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>Loading…</p>
  }

  return (
    <div className="screen active" id="screen-profile">
      <div className="back-row" onClick={() => navigate('/')}>
        <IconArrowLeft /> Back to Discover
      </div>
      <div className="screen-title-row">
        <div className="screen-title">Your profile</div>
        <label className="toggle-row">
          <span>Activate Profile</span>
          <span className={`toggle-switch ${profile.is_active ? 'on' : ''}`} onClick={() => void toggleActive()}>
            <span className="toggle-thumb" />
          </span>
        </label>
      </div>

      <div id="profileHeader">
        {editingHeader ? (
          <ProfileHeaderEditor
            profile={profile}
            uploadingAvatar={uploadingAvatar}
            onChangePhoto={() => avatarInputRef.current?.click()}
            onCancel={() => setEditingHeader(false)}
            onSave={saveHeader}
          />
        ) : (
          <div className="profile-header-card">
            <div
              className="photo-block first photo-variant-0"
              style={
                profile.avatar_url
                  ? { backgroundImage: `url(${profile.avatar_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : undefined
              }
            >
              <div className="name-overlay">
                <span className="name">{profile.display_name || 'You'}</span>
                <div className="role">{profile.headline || 'Add your role or headline'}</div>
              </div>
            </div>
            <div className="header-edit-btn" onClick={() => setEditingHeader(true)}>
              <IconEdit /> Edit
            </div>
          </div>
        )}
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void handleAvatarChosen(file)
          }}
        />
      </div>

      <div id="profileItemsList" style={{ marginTop: 14 }}>
        {items.map((item, index) => (
          <div className="profile-item" key={item.id}>
            <div className="item-top">
              <div className="item-kind">{item.kind === 'photo' ? 'Photo' : 'Text'}</div>
              <div className="item-actions">
                <div
                  className="icon-action"
                  aria-disabled={index === 0}
                  onClick={() => index > 0 && void moveItem(index, -1)}
                >
                  <IconChevronUp />
                </div>
                <div
                  className="icon-action"
                  aria-disabled={index === items.length - 1}
                  onClick={() => index < items.length - 1 && void moveItem(index, 1)}
                >
                  <IconChevronDown />
                </div>
                {item.kind === 'text' && (
                  <div
                    className="icon-action"
                    onClick={() => setEditingItemId(editingItemId === item.id ? null : item.id)}
                  >
                    <IconEdit />
                  </div>
                )}
                <div className="icon-action delete" onClick={() => void removeItem(item.id)}>
                  <IconTrash />
                </div>
              </div>
            </div>
            <div className="item-body">
              {item.kind === 'photo' ? (
                <div
                  className="item-photo"
                  style={
                    item.photo_url
                      ? { backgroundImage: `url(${item.photo_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                      : undefined
                  }
                  onClick={() => {
                    setPendingPhotoItemId(item.id)
                    photoInputRef.current?.click()
                  }}
                >
                  {!item.photo_url && <IconCamera />}
                </div>
              ) : editingItemId === item.id ? (
                <textarea
                  className="item-text-edit"
                  defaultValue={item.body ?? ''}
                  placeholder="Say something about yourself..."
                  onBlur={(event) => {
                    void saveItemText(item.id, event.target.value)
                    setEditingItemId(null)
                  }}
                />
              ) : (
                <div className="item-text">{item.body || 'Tap edit to write something...'}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(event) => {
          const file = event.target.files?.[0]
          const itemId = pendingPhotoItemId
          event.target.value = ''
          setPendingPhotoItemId(null)
          if (file && itemId) void handleItemPhotoChosen(itemId, file)
        }}
      />

      <div className="add-row-group">
        <div className="add-row-btn" onClick={() => void addItem('photo')}>
          <IconCamera /> Add photo
        </div>
        <div className="add-row-btn" onClick={() => void addItem('text')}>
          <IconEdit /> Add text
        </div>
      </div>

      <div className="settings-section">
        <div className="sec-title">Settings</div>
        <div className="settings-row danger" onClick={() => void signOut().then(() => navigate('/'))}>
          Log out
          <span className="chev">
            <IconChevronRight />
          </span>
        </div>
      </div>
    </div>
  )
}

function ProfileHeaderEditor({
  profile,
  uploadingAvatar,
  onChangePhoto,
  onCancel,
  onSave,
}: {
  profile: ProfileRow
  uploadingAvatar: boolean
  onChangePhoto: () => void
  onCancel: () => void
  onSave: (fields: {
    display_name: string
    headline: string
    age: string
    linkedin_url: string
    instagram_url: string
    twitter_url: string
  }) => void
}) {
  const [displayName, setDisplayName] = useState(profile.display_name ?? '')
  const [headline, setHeadline] = useState(profile.headline ?? '')
  const [age, setAge] = useState(profile.age != null ? String(profile.age) : '')
  const [linkedin, setLinkedin] = useState(profile.linkedin_url ?? '')
  const [instagram, setInstagram] = useState(profile.instagram_url ?? '')
  const [twitter, setTwitter] = useState(profile.twitter_url ?? '')

  return (
    <div className="profile-header-card">
      <div
        className="photo-block first header-photo-edit photo-variant-0"
        style={
          profile.avatar_url
            ? {
                backgroundImage: `url(${profile.avatar_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        <div className="change-photo-btn" onClick={onChangePhoto}>
          <IconCamera /> {uploadingAvatar ? 'Uploading…' : 'Change photo'}
        </div>
      </div>
      <div className="profile-header-edit">
        <label>Name</label>
        <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <label>Headline</label>
        <input type="text" value={headline} onChange={(e) => setHeadline(e.target.value)} />
        <label>Age</label>
        <input type="number" value={age} onChange={(e) => setAge(e.target.value)} />
        <label>LinkedIn (optional)</label>
        <input
          type="text"
          placeholder="https://linkedin.com/in/you"
          value={linkedin}
          onChange={(e) => setLinkedin(e.target.value)}
        />
        <label>Instagram (optional)</label>
        <input
          type="text"
          placeholder="https://instagram.com/you"
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
        />
        <label>X / Twitter (optional)</label>
        <input
          type="text"
          placeholder="https://x.com/you"
          value={twitter}
          onChange={(e) => setTwitter(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <div
            className="save-btn"
            style={{ flex: 1, background: 'var(--surface-sunk)', color: 'var(--text-soft)', boxShadow: 'none' }}
            onClick={onCancel}
          >
            Cancel
          </div>
          <div
            className="save-btn"
            style={{ flex: 1, margin: 0 }}
            onClick={() =>
              onSave({
                display_name: displayName,
                headline,
                age,
                linkedin_url: linkedin,
                instagram_url: instagram,
                twitter_url: twitter,
              })
            }
          >
            Done
          </div>
        </div>
      </div>
    </div>
  )
}
