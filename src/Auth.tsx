import { useState } from 'react'

const demoEmail = 'aman@gmai.com'
const demoPassword = 'aman1234'

export default function Auth({ onSuccess }: { onSuccess: (email: string) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (email.trim().toLowerCase() !== demoEmail || password !== demoPassword) {
      setError('That email and password do not match the demo admin account.')
      return
    }
    setError('')
    onSuccess(demoEmail)
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div className="auth-brand-lockup">
          <div className="auth-brand-mark"><span /></div>
          <strong>gymflow</strong>
        </div>
        <div className="auth-brand-copy">
          <span className="auth-kicker"><i /> PLATFORM ADMINISTRATION</span>
          <h1>One platform.<br />Every gym moving forward.</h1>
          <p>Manage your gym network, subscriptions, and organization accounts from one place.</p>
        </div>
        <div className="auth-brand-footer"><span>GYMFLOW PLATFORM</span><span>Secure workspace access</span></div>
        <div className="auth-orbit auth-orbit-one" /><div className="auth-orbit auth-orbit-two" />
      </section>
      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand"><div className="auth-brand-mark"><span /></div><strong>gymflow</strong></div>
          <div className="auth-heading">
            <span className="auth-kicker">WELCOME BACK</span>
            <h2>Sign in to GymFlow</h2>
            <p>Enter your platform administrator account to continue.</p>
          </div>
          <form className="auth-form" onSubmit={signIn}>
            <label>Email address<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" required /></label>
            <label>Password
              <span className="password-field"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button></span>
            </label>
            {error && <div className="auth-error" role="alert">{error}</div>}
            <button type="submit" className="auth-submit">Sign in <span>→</span></button>
          </form>
          <div className="demo-credential-card">
            <div className="demo-card-heading"><span className="demo-lock">✓</span><div><strong>Demo administrator</strong><small>For local preview only</small></div></div>
            <div className="demo-credential-row"><span>Email</span><code>{demoEmail}</code></div>
            <div className="demo-credential-row"><span>Password</span><code>{demoPassword}</code></div>
            <button className="fill-demo-button" type="button" onClick={() => { setEmail(demoEmail); setPassword(demoPassword); setError('') }}>Use demo credentials</button>
          </div>
          <p className="auth-disclaimer">Demo sign-in is client-side only. It is not secure authentication and must be replaced before real accounts or data are used.</p>
        </div>
        <footer className="auth-footer"><span>© {new Date().getFullYear()} GymFlow Technologies</span><span>Platform administration</span></footer>
      </section>
    </main>
  )
}
