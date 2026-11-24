import { useState } from 'react'
import { supabase } from './lib/supabase'

export default function Auth({ onSuccess }: { onSuccess?: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setLoading(false)
    if (authError) {
      setError(authError.message)
      return
    }

    onSuccess?.()
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div className="auth-brand-lockup">
          <div className="auth-brand-mark"><img src="/gympoint-icon.png" alt="GymPoint logo" /></div>
          <strong>gympoint</strong>
        </div>
        <div className="auth-brand-copy">
          <span className="auth-kicker"><i /> PLATFORM ADMINISTRATION</span>
          <h1>One platform.<br />Every gym moving forward.</h1>
          <p>Manage your gym network, subscriptions, and organization accounts from one place.</p>
        </div>
        <div className="auth-brand-footer"><span>GYMPOINT PLATFORM</span><span>Secure workspace access</span></div>
        <div className="auth-orbit auth-orbit-one" /><div className="auth-orbit auth-orbit-two" />
      </section>
      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand"><div className="auth-brand-mark"><img src="/gympoint-icon.png" alt="GymPoint logo" /></div><strong>gympoint</strong></div>
          <div className="auth-heading">
            <span className="auth-kicker">WELCOME BACK</span>
            <h2>Sign in to GymPoint</h2>
            <p>Enter your Supabase account credentials to continue.</p>
          </div>
          <form className="auth-form" onSubmit={signIn}>
            <label>Email address<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" required /></label>
            <label>Password
              <span className="password-field"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button></span>
            </label>
            {error && <div className="auth-error" role="alert">{error}</div>}
            <button type="submit" className="auth-submit" disabled={loading}>{loading ? 'Signing in...' : <>Sign in <span>→</span></>}</button>
          </form>
          <p className="auth-disclaimer">Authenticated via Supabase Auth. Accounts and roles are managed in your Supabase project.</p>
        </div>
        <footer className="auth-footer"><span>© {new Date().getFullYear()} GymPoint Technologies</span><span>Platform administration</span></footer>
      </section>
    </main>
  )
}
