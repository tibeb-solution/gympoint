import { useState, useRef } from 'react'

export type ProfileData = {
  id: string
  email: string
  full_name: string
  role: string
  avatar_url?: string | null
}

export default function EditProfileModal({
  profile,
  onClose,
  onSave,
}: {
  profile: ProfileData
  onClose: () => void
  onSave: (data: { full_name: string; avatar_url: string | null }) => Promise<void>
}) {
  const [fullName, setFullName] = useState(profile.full_name || '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url || null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      setAvatarUrl(result)
    }
    reader.readAsDataURL(file)
  }

  const handleRemovePhoto = () => {
    setAvatarUrl(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({ full_name: fullName.trim(), avatar_url: avatarUrl })
      onClose()
    } catch {
      // error handled by caller
    } finally {
      setSaving(false)
    }
  }

  const initials = fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'U'

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" role="dialog" aria-modal="true" style={{ width: 'min(100%, 440px)' }}>
        <button className="modal-close" onClick={onClose} aria-label="Close dialog">✕</button>
        <div className="modal-icon">👤</div>
        <h2>Edit Your Profile</h2>
        <p>Update your personal details and profile picture across the workspace.</p>

        <form onSubmit={handleSubmit} className="modal-form">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '10px 0', borderBottom: '1px solid #eff0f3' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#ede7ff',
                color: '#7653e8',
                display: 'grid',
                placeItems: 'center',
                fontSize: '20px',
                fontWeight: 700,
                overflow: 'hidden',
                flexShrink: 0,
                border: '2px solid #ddd6fe',
              }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                initials
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="button button-outline"
                  style={{ padding: '6px 12px', fontSize: '11px' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatarUrl ? 'Change photo' : 'Upload photo'}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    className="button button-outline"
                    style={{ padding: '6px 10px', fontSize: '11px', color: '#dc2626', borderColor: '#fecaca' }}
                    onClick={handleRemovePhoto}
                  >
                    Remove
                  </button>
                )}
              </div>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>PNG, JPG or WebP up to 5MB</span>
            </div>
          </div>

          <label>
            Full Name
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Abebe Bikila"
            />
          </label>

          <label>
            Email Address
            <input
              type="email"
              disabled
              value={profile.email}
              style={{ background: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }}
            />
          </label>

          <label>
            Role
            <div style={{ display: 'flex', alignItems: 'center', height: '38px', padding: '0 10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11px', color: '#475569', textTransform: 'capitalize' }}>
              {profile.role.replace('_', ' ')}
            </div>
          </label>

          <div className="modal-actions">
            <button type="button" className="button button-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="button button-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
