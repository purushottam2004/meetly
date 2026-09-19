import { useEffect } from 'react'
import { LoginForm } from '@repo/auth'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../lib/supabaseClient'
import { IconArrowLeft, IconGoogle } from '../lib/icons'
import { resumeAfterAuth, type AuthFlowState } from '../lib/authFlow'
import { fetchMyProfile } from '../lib/profiles'

export function LoginPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const routerLocation = useLocation()
  const state = routerLocation.state as AuthFlowState

  useEffect(() => {
    if (loading || !user) return

    let cancelled = false
    void fetchMyProfile(user.id).then((profile) => {
      if (cancelled) return
      if (profile && profile.latitude == null) {
        navigate('/location', { replace: true, state })
        return
      }
      resumeAfterAuth(navigate, state)
    })
    return () => {
      cancelled = true
    }
  }, [loading, user, state, navigate])

  async function handleGoogleLogin() {
    const redirectTo = window.location.origin + (state?.from?.pathname ?? '/')
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
  }

  return (
    <div className="screen active" id="screen-login">
      <div className="back-row" onClick={() => navigate('/')}>
        <IconArrowLeft /> Back
      </div>
      <div className="login-body">
        <div className="login-logo">meetly</div>
        <div className="login-tagline">Sign in to message people and view your chats.</div>
        <div className="google-btn" onClick={() => void handleGoogleLogin()}>
          <IconGoogle className="g-icon" />
          Continue with Google
        </div>

        <div style={{ marginTop: '28px', width: '100%', maxWidth: 280 }}>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Or sign in with email</p>
          <LoginForm client={supabase} />
        </div>
      </div>
    </div>
  )
}
