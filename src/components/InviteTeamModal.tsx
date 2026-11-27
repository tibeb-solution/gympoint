import React, { useState } from 'react'

export const STAFF_ROLES = [
  { value: 'manager', label: 'Branch Manager', desc: 'Supervises branch staff, classes, and operations' },
  { value: 'personal_trainer', label: 'Personal Trainer', desc: 'Manages member assessments, workouts, and PT sessions' },
  { value: 'class_instructor', label: 'Group Class Instructor', desc: 'Instructs group classes and tracks attendance' },
  { value: 'receptionist', label: 'Front Desk Receptionist', desc: 'Checks in members, logs visitors, and collects payments' },
  { value: 'sales_officer', label: 'Membership Sales Officer', desc: 'Manages prospects, trials, tours, and sign-ups' },
  { value: 'accountant', label: 'Accountant', desc: 'Manages invoices, member dues, and financial reports' },
  { value: 'inventory_officer', label: 'Inventory & Equipment Officer', desc: 'Manages fitness equipment, supplies, and retail stock' },
  { value: 'org_admin', label: 'Organization Administrator', desc: 'Full administrative access across all branches' },
]

export default function InviteTeamModal({
  branches,
  onClose,
  onSubmit,
}: {
  branches: { id: string; name: string }[]
  onClose: () => void
  onSubmit: (data: {
    fullName: string
    email: string
    role: string
    branchId?: string
  }) => Promise<void>
}) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('receptionist')
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim() || !email.trim()) return

    setSaving(true)
    await onSubmit({
      fullName: fullName.trim(),
      email: email.trim(),
      role,
      branchId: branchId || undefined,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <section className="modal" role="dialog" aria-modal="true" style={{ width: 'min(100%, 480px)' }}>
        <button className="modal-close" onClick={onClose} aria-label="Close dialog">✕</button>
        <div className="modal-icon">👤</div>
        <h2>Invite team member</h2>
        <p>Grant role-based access for gym operations and front-desk duties.</p>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Full name
            <input
              placeholder="e.g. Marcus Vance"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoFocus
            />
          </label>

          <label>
            Work email
            <input
              type="email"
              placeholder="marcus@gym.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label>
            Assigned role
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              {STAFF_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label} — {r.desc}
                </option>
              ))}
            </select>
          </label>

          <label>
            Assigned branch
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">All branches (Multi-branch access)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>

          <div className="modal-actions">
            <button type="button" className="button button-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="button button-primary" disabled={saving || !fullName.trim() || !email.trim()}>
              {saving ? 'Inviting...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
