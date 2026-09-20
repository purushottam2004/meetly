import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { SocialRow } from '../components/SocialRow'
import {
  createdPoolCount,
  checkPoolName,
  createPool,
  fetchMyPools,
  joinPool,
  MAX_CUSTOM_POOLS,
  setEveryoneVisible,
  setPoolVisible,
} from '../lib/pools'
import {
  addProfileItem,
  deleteProfileItem,
  fetchMyProfile,
  fetchProfileItems,
  reorderProfileItems,
  saveMyActiveState,
  saveMyAvatar,
  saveMyOpenToChat,
  saveMyProfileHeader,
  updateProfileItem,
  uploadProfilePhoto,
} from '../lib/profiles'
import type { MyPool, ProfileItemRow, ProfileRow } from '../lib/types'
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
  const [uploadingPhotoItemId, setUploadingPhotoItemId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [pendingPhotoItemId, setPendingPhotoItemId] = useState<string | null>(null)
  const [pools, setPools] = useState<MyPool[]>([])
  const [joinCode, setJoinCode] = useState('')
  const [newPoolName, setNewPoolName] = useState('')
  const [poolError, setPoolError] = useState<string | null>(null)
  const [poolBusy, setPoolBusy] = useState(false)
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([])
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null)
  const nameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nameCheckGen = useRef(0)

  useEffect(() => {
    if (!user) return
    void fetchMyProfile(user.id).then(setProfile)
    void fetchProfileItems(user.id).then(setItems)
    void fetchMyPools(user.id).then(setPools)
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
    setUploadError(null)
    try {
      const url = await uploadProfilePhoto(user.id, file, 'avatar')
      await saveMyAvatar(user.id, url)
      setProfile(await fetchMyProfile(user.id))
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Could not upload photo')
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function handleItemPhotoChosen(itemId: string, file: File) {
    if (!user) return
    setUploadingPhotoItemId(itemId)
    setUploadError(null)
    try {
      const url = await uploadProfilePhoto(user.id, file, 'gallery')
      await updateProfileItem(itemId, { photo_url: url })
      setItems(await fetchProfileItems(user.id))
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Could not upload photo')
    } finally {
      setUploadingPhotoItemId(null)
    }
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

  async function toggleOpenToChat() {
    if (!user || !profile) return
    const next = !profile.open_to_chat
    setProfile({ ...profile, open_to_chat: next })
    await saveMyOpenToChat(user.id, next)
  }

  async function reloadPools() {
    if (!user) return
    setPools(await fetchMyPools(user.id))
  }

  async function toggleEveryoneVisible() {
    if (!user || !profile) return
    const next = !profile.visible_in_everyone
    setProfile({ ...profile, visible_in_everyone: next })
    await setEveryoneVisible(user.id, next)
  }

  async function togglePoolMembershipVisible(pool: MyPool) {
    if (!user) return
    const next = !pool.visible
    setPools((current) => current.map((row) => (row.id === pool.id ? { ...row, visible: next } : row)))
    await setPoolVisible(user.id, pool.id, next)
  }

  async function handleJoinPool() {
    if (!user) return
    const code = joinCode.trim().toUpperCase().replace(/\s+/g, '')
    const already = pools.some(
      (pool) =>
        pool.join_code === code || pool.name.replace(/\s+/g, '') === code,
    )
    if (already) {
      setJoinCode('')
      setPoolError(null)
      return
    }
    setPoolBusy(true)
    setPoolError(null)
    try {
      await joinPool(code)
      setJoinCode('')
      await reloadPools()
    } catch (err) {
      const raw = err instanceof Error ? err.message : ''
      if (/at most 3/i.test(raw)) setPoolError(raw)
      else setPoolError('Pool does not exist')
    } finally {
      setPoolBusy(false)
    }
  }

  async function handleCreatePool(name = newPoolName) {
    if (!user) return
    const pooledName = name.trim().toUpperCase()
    nameCheckGen.current += 1
    if (nameCheckTimer.current) clearTimeout(nameCheckTimer.current)
    setPoolBusy(true)
    setPoolError(null)
    setNameSuggestions([])
    try {
      const check = await checkPoolName(pooledName)
      if (!check.available) {
        setNameAvailable(false)
        setNameSuggestions(check.suggestions)
        setPoolError('That name is taken')
        return
      }
      await createPool(pooledName)
      setNewPoolName('')
      setNameSuggestions([])
      setNameAvailable(true)
      await reloadPools()
    } catch (err) {
      const raw = err instanceof Error ? err.message : ''
      if (/taken/i.test(raw)) {
        const check = await checkPoolName(pooledName).catch(() => null)
        setNameAvailable(false)
        setNameSuggestions(check?.suggestions ?? [])
        setPoolError('That name is taken')
        return
      }
      setPoolError(raw || 'Could not create pool')
    } finally {
      setPoolBusy(false)
    }
  }

  function onNewPoolNameChange(value: string) {
    const next = value.toUpperCase()
    setNewPoolName(next)
    setPoolError(null)
    setNameSuggestions([])
    setNameAvailable(null)
    if (nameCheckTimer.current) clearTimeout(nameCheckTimer.current)
    const trimmed = next.trim()
    if (!trimmed) return
    const gen = ++nameCheckGen.current
    nameCheckTimer.current = setTimeout(() => {
      void checkPoolName(trimmed).then((check) => {
        if (gen !== nameCheckGen.current) return
        setNameAvailable(check.available)
        setNameSuggestions(check.available ? [] : check.suggestions)
      })
    }, 350)
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
            onToggleOpenToChat={() => void toggleOpenToChat()}
          />
        ) : (
          <div className="profile-header-card">
            <div className="photo-block first photo-variant-0">
              {profile.avatar_url && <img src={profile.avatar_url} alt="" />}
              <OpenToChatToggle on={profile.open_to_chat} onToggle={() => void toggleOpenToChat()} />
              <div className="name-overlay">
                <span className="name">{profile.display_name || 'You'}</span>
                <div className="role">{profile.headline || 'Add your role or headline'}</div>
                <SocialRow profile={profile} lastActiveAt={profile.last_active_at} showOpenToChat={false} />
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

      {uploadError && (
        <p style={{ color: 'var(--danger)', fontSize: 13, margin: '12px 0 0' }}>{uploadError}</p>
      )}

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
                  onClick={() => {
                    if (uploadingPhotoItemId) return
                    setPendingPhotoItemId(item.id)
                    photoInputRef.current?.click()
                  }}
                >
                  {item.photo_url ? <img src={item.photo_url} alt="" /> : <IconCamera />}
                  {uploadingPhotoItemId === item.id && (
                    <div className="change-photo-btn">Uploading…</div>
                  )}
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

      <div className="settings-section pool-block">
        <div className="pool-chip-row">
          <button
            type="button"
            className={`pool-chip ${profile.visible_in_everyone ? 'on' : ''}`}
            onClick={() => void toggleEveryoneVisible()}
          >
            Everyone
          </button>
          {pools.map((pool) => (
            <button
              type="button"
              key={pool.id}
              className={`pool-chip ${pool.visible ? 'on' : ''}`}
              onClick={() => void togglePoolMembershipVisible(pool)}
            >
              {pool.name}
            </button>
          ))}
        </div>

        <div className="pool-line">
          <span>Join pool</span>
          <input
            type="text"
            value={joinCode}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Code"
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleJoinPool()
            }}
          />
          <button type="button" className="pool-action-btn" disabled={poolBusy} onClick={() => void handleJoinPool()}>
            Join
          </button>
        </div>

        {user && createdPoolCount(user.id, pools) < MAX_CUSTOM_POOLS && pools.length < MAX_CUSTOM_POOLS && (
          <>
            <div className="pool-line">
              <span>Create pool</span>
              <input
                type="text"
                value={newPoolName}
                maxLength={48}
                placeholder="Name"
                onChange={(event) => onNewPoolNameChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void handleCreatePool()
                }}
              />
              <button
                type="button"
                className="pool-action-btn"
                disabled={poolBusy}
                onClick={() => void handleCreatePool()}
              >
                Create
              </button>
            </div>
            {nameAvailable === false && nameSuggestions.length > 0 && (
              <div className="pool-suggest-row">
                {nameSuggestions.map((suggestion) => (
                  <button
                    type="button"
                    key={suggestion}
                    className="pool-suggest"
                    onClick={() => {
                      setNewPoolName(suggestion)
                      setNameAvailable(true)
                      setNameSuggestions([])
                      void handleCreatePool(suggestion)
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        {poolError && <p className="pool-error">{poolError}</p>}
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

function OpenToChatToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="open-to-chat-control"
      aria-pressed={on}
      onClick={onToggle}
    >
      <span>Open to chat</span>
      <span className={`toggle-switch ${on ? 'on' : ''}`}>
        <span className="toggle-thumb" />
      </span>
    </button>
  )
}

function ProfileHeaderEditor({
  profile,
  uploadingAvatar,
  onChangePhoto,
  onCancel,
  onSave,
  onToggleOpenToChat,
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
  onToggleOpenToChat: () => void
}) {
  const [displayName, setDisplayName] = useState(profile.display_name ?? '')
  const [headline, setHeadline] = useState(profile.headline ?? '')
  const [age, setAge] = useState(profile.age != null ? String(profile.age) : '')
  const [linkedin, setLinkedin] = useState(profile.linkedin_url ?? '')
  const [instagram, setInstagram] = useState(profile.instagram_url ?? '')
  const [twitter, setTwitter] = useState(profile.twitter_url ?? '')

  return (
    <div className="profile-header-card">
      <div className="photo-block first header-photo-edit photo-variant-0">
        {profile.avatar_url && <img src={profile.avatar_url} alt="" />}
        <OpenToChatToggle on={profile.open_to_chat} onToggle={onToggleOpenToChat} />
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
