import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { IconArrowLeft, IconNavigation, IconPin, IconSearch } from '../lib/icons'
import { LOCATION_SUGGESTIONS } from '../lib/locations'
import { fetchMyProfile, saveMyLocation } from '../lib/profiles'
import { needsBasics, resumeAfterAuth, type AuthFlowState } from '../lib/authFlow'

export function LocationPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const routerLocation = useLocation()
  const state = routerLocation.state as AuthFlowState
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = q
      ? LOCATION_SUGGESTIONS.filter((s) => s.label.toLowerCase().includes(q))
      : LOCATION_SUGGESTIONS.slice(0, 5)
    return matches
  }, [query])

  async function selectLocation(label: string, latitude: number, longitude: number) {
    if (!user) return
    setSaving(true)
    setError(null)
    try {
      await saveMyLocation(user.id, { location_text: label, latitude, longitude })
      const profile = await fetchMyProfile(user.id)
      if (needsBasics(profile)) {
        navigate('/basics', { replace: true, state: state ?? undefined })
        return
      }
      resumeAfterAuth(navigate, state)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save location')
    } finally {
      setSaving(false)
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError('Geolocation is not available in this browser')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void selectLocation('Current location', position.coords.latitude, position.coords.longitude)
      },
      () => setError('Could not get your current location'),
    )
  }

  return (
    <div className="screen active" id="screen-location">
      <div className="back-row" onClick={() => navigate('/')}>
        <IconArrowLeft /> Back
      </div>
      <div className="location-screen-body">
        <div className="screen-title" style={{ paddingTop: 6 }}>
          Location
        </div>

        <div className="location-search-box">
          <IconSearch />
          <input
            type="text"
            placeholder="Search for your city or area"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="current-location-btn" onClick={useCurrentLocation}>
          <IconNavigation />
          Use current location
        </div>

        {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 12 }}>{error}</p>}
        {saving && <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 12 }}>Saving…</p>}

        <div className="location-suggestions">
          {suggestions.map((s) => (
            <div
              className="location-suggestion-row"
              key={s.label}
              onClick={() => void selectLocation(s.label, s.latitude, s.longitude)}
            >
              <IconPin />
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
