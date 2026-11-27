import { useState } from 'react'

export default function ForceChangePasswordModal({
  userEmail,
  onPasswordChanged,
  onSignOut,
}: {
  userEmail: string
  onPasswordChanged: (newPassword: string) => Promise<void>
  onSignOut: () => void
}) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.')
      return
    }

    setLoading(true)
    try {
      await onPasswordChanged(newPassword)
    } catch (err: any) {
      setError(err?.message || 'Failed to update password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#0d1017',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#151824',
          border: '1px solid #282c3f',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.65)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#2e2547',
              color: '#a78bfa',
              display: 'grid',
              placeItems: 'center',
              fontSize: '24px',
              margin: '0 auto 16px',
              border: '1px solid #5b21b6',
            }}
          >
            🔒
          </div>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '1.5px',
              color: '#c084fc',
              textTransform: 'uppercase',
            }}
          >
            Security Requirement
          </span>
          <h1 style={{ font: '800 22px Manrope, sans-serif', margin: '6px 0 8px', color: '#fff' }}>
            Change Temporary Password
          </h1>
          <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
            You signed in to <strong>{userEmail}</strong> with a temporary password. Choose a new permanent password to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
          <label style={{ display: 'grid', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#cbd5e1' }}>
            New Password
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                style={{
                  width: '100%',
                  height: '42px',
                  borderRadius: '8px',
                  border: '1px solid #33394d',
                  background: '#0d1017',
                  color: '#fff',
                  padding: '0 40px 0 12px',
                  fontSize: '13px',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <label style={{ display: 'grid', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#cbd5e1' }}>
            Confirm New Password
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
              style={{
                width: '100%',
                height: '42px',
                borderRadius: '8px',
                border: '1px solid #33394d',
                background: '#0d1017',
                color: '#fff',
                padding: '0 12px',
                fontSize: '13px',
              }}
            />
          </label>

          {error && (
            <div
              style={{
                padding: '10px 12px',
                background: '#451a1a',
                border: '1px solid #7f1d1d',
                borderRadius: '8px',
                color: '#fca5a5',
                fontSize: '11px',
                lineHeight: 1.4,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <div style={{ marginTop: '8px', display: 'grid', gap: '10px' }}>
            <button
              type="submit"
              disabled={loading}
              className="button button-primary"
              style={{
                width: '100%',
                height: '42px',
                fontSize: '12px',
                fontWeight: 700,
                background: '#7c3aed',
                borderColor: '#7c3aed',
                justifyContent: 'center',
              }}
            >
              {loading ? 'Setting New Password...' : '✓ Set New Password & Access Workspace'}
            </button>

            <button
              type="button"
              onClick={onSignOut}
              className="button button-outline"
              style={{
                width: '100%',
                height: '38px',
                fontSize: '11px',
                background: 'transparent',
                borderColor: '#2d3345',
                color: '#94a3b8',
                justifyContent: 'center',
              }}
            >
              Sign out instead
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
