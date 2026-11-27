import { useState } from 'react'
import { STAFF_ROLES } from './InviteTeamModal'

export type EditableTeamMember = {
  id: string
  email: string
  full_name: string
  role: string
  branch_id?: string
  branch_name?: string
  status: 'Active' | 'Paused' | 'Suspended' | 'Pending'
}

export default function EditTeamModal({
  member,
  branches,
  onClose,
  onSave,
}: {
  member: EditableTeamMember
  branches: { id: string; name: string }[]
  onClose: () => void
  onSave: (data: {
    id: string
    full_name: string
    role: string
    branch_id?: string
    status: 'Active' | 'Paused' | 'Suspended'
  }) => Promise<void>
}) {
  const [fullName, setFullName] = useState(member.full_name)
  const [role, setRole] = useState(() => {
    // Match role label or value
    const found = STAFF_ROLES.find(
      (r) => r.label.toLowerCase() === member.role.toLowerCase() || r.value === member.role.toLowerCase()
    )
    return found ? found.label : member.role
  })
  const [branchId, setBranchId] = useState(member.branch_id || '')
  const [status, setStatus] = useState<'Active' | 'Paused' | 'Suspended'>(
    member.status === 'Pending' ? 'Active' : member.status
  )
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) return

    setSaving(true)
    try {
      await onSave({
        id: member.id,
        full_name: fullName.trim(),
        role,
        branch_id: branchId || undefined,
        status,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <section className="modal" role="dialog" aria-modal="true" style={{ width: 'min(100%, 480px)' }}>
        <button className="modal-close" onClick={onClose} aria-label="Close dialog">✕</button>
        <div className="modal-icon">👥</div>
        <h2>Edit Team Member</h2>
        <p>Update assigned duties, branch scope, or suspend/pause workspace access.</p>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Full Name
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Marcus Vance"
            />
          </label>

          <label>
            Email Address
            <input
              type="email"
              disabled
              value={member.email}
              style={{ background: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label>
              Assigned Role
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                {STAFF_ROLES.map((r) => (
                  <option key={r.value} value={r.label}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Branch Scope
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                <option value="">All branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Workspace Access Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'Active' | 'Paused' | 'Suspended')}
              style={{
                borderColor: status === 'Active' ? '#86efac' : '#fca5a5',
                color: status === 'Active' ? '#15803d' : '#b91c1c',
                fontWeight: 600,
              }}
            >
              <option value="Active">● Active (Full Workspace Access)</option>
              <option value="Paused">⏸ Paused (Temporary Hold)</option>
              <option value="Suspended">⛔ Suspended (Access Locked)</option>
            </select>
          </label>

          {status !== 'Active' && (
            <div
              style={{
                padding: '10px 12px',
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                borderRadius: '8px',
                fontSize: '11px',
                color: '#be123c',
                lineHeight: 1.5,
              }}
            >
              <strong>Notice:</strong> When set to {status}, this staff member will be immediately blocked from logging in or making changes to your gym workspace until reactivated.
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="button button-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button button-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
