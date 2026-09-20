import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { VisibilityChoice } from '../components/VisibilityChoice'
import { resumeAfterAuth, type AuthFlowState } from '../lib/authFlow'
import { profileAvatarInitial } from '../lib/avatarInitial'
import { IconCamera } from '../lib/icons'
import {
  completeProfileBasics,
  displayNameFromAuthMetadata,
  fetchMyProfile,
  saveMyAvatar,
  uploadProfilePhoto,
} from '../lib/profiles'

function filled(value: string): boolean {
  return Boolean(value.trim())
}

export function BasicsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const routerLocation = useLocation()
  const state = routerLocation.state as AuthFlowState
  const fileRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState('')
  const [headline, setHeadline] = useState('')
  const [about, setAbout] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [publicOverride, setPublicOverride] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!user) return
    void fetchMyProfile(user.id).then((profile) => {
      if (profile?.basics_completed_at) {
        resumeAfterAuth(navigate, state)
        return
      }
      const fromGoogle = displayNameFromAuthMetadata(user.user_metadata)
      setDisplayName(profile?.display_name?.trim() || fromGoogle || '')
      setHeadline(profile?.headline ?? '')
      setAvatarUrl(profile?.avatar_url ?? null)
      setReady(true)
    })
    // Only hydrate once per signed-in user; flow state is for Continue, not this load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const autoPublic = filled(displayName) && filled(headline)
  const isPublic = publicOverride ?? autoPublic

  async function handlePhoto(file: File) {
    if (!user) return
    setUploading(true)
    setError(null)
    try {
      const url = await uploadProfilePhoto(user.id, file, 'avatar')
      await saveMyAvatar(user.id, url)
      setAvatarUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload photo')
    } finally {
      setUploading(false)
    }
  }

  async function handleContinue() {
    if (!user) return
    setSaving(true)
    setError(null)
    try {
      await completeProfileBasics(user.id, {
        display_name: displayName,
        headline,
        is_active: isPublic,
        about,
      })
      resumeAfterAuth(navigate, state)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  if (!ready) {
    return <p style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>Loading…</p>
  }

  return (
    <div className="screen active" id="screen-basics">
      <div className="basics-screen-body">
        <div className="screen-title" style={{ paddingTop: 6 }}>
          A bit about you
        </div>
        <p className="location-sub">
          Fill in what you want. Continue skips the rest — you can add it later.
        </p>

        <button
          type="button"
          className="basics-avatar"
          onClick={() => fileRef.current?.click()}
          aria-label="Add photo"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" />
          ) : (
            <span className="basics-avatar-fallback">{profileAvatarInitial(displayName) || '+'}</span>
          )}
          <span className="basics-avatar-camera">
            <IconCamera />
          </span>
        </button>
        <p className="basics-avatar-hint">{uploading ? 'Uploading…' : 'Photo'}</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void handlePhoto(file)
          }}
        />

        <label className="basics-label">Name</label>
        <input
          className="input-box"
          type="text"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />

        <label className="basics-label">Role</label>
        <input
          className="input-box"
          type="text"
          placeholder="CTO @ xyz company"
          value={headline}
          onChange={(event) => setHeadline(event.target.value)}
        />

        <label className="basics-label">About you</label>
        <textarea
          className="item-text-edit basics-about"
          placeholder="A sentence or two is enough"
          value={about}
          onChange={(event) => setAbout(event.target.value)}
          rows={3}
        />

        <label className="basics-label">Visibility</label>
        <VisibilityChoice
          isPublic={isPublic}
          onChange={(next) => setPublicOverride(next)}
        />
        <p className="basics-vis-hint">
          {isPublic
            ? 'People nearby can find you and message you.'
            : 'You stay Hidden until you go Public.'}
        </p>

        {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 12 }}>{error}</p>}

        <button
          type="button"
          className="save-btn"
          style={{ margin: '20px 0 0', width: '100%' }}
          onClick={() => !saving && void handleContinue()}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
