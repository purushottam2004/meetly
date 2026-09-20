import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../lib/supabaseClient'
import { LoginForm } from '@repo/auth'
import { IconArrowLeft, IconGoogle } from '../lib/icons'
import { resumeAfterAuth, type AuthFlowState } from '../lib/authFlow'
import { isLocalSeedEnabled } from '../lib/localSupabase'

export function LoginPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const routerLocation = useLocation()
  const state = routerLocation.state as AuthFlowState

  // AppShell handles the location prompt once the session lands anywhere in
  // the app, which is where the OAuth redirect drops the user.
  useEffect(() => {
    if (loading || !user) return
    resumeAfterAuth(navigate, state)
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
        {isLocalSeedEnabled() && (
          <div className="login-seed">
            <p className="login-seed-hint">
              Local seed: <code>seed_user@gmail.com</code> / <code>password123</code>
            </p>
            <LoginForm client={supabase} />
            <div className="login-or">or</div>
          </div>
        )}
        <div className="google-btn" onClick={() => void handleGoogleLogin()}>
          <IconGoogle className="g-icon" />
          Continue with Google
        </div>
      </div>
    </div>
  )
}
