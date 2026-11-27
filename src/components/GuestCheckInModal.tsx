import React, { useState } from 'react'

export default function GuestCheckInModal({
  branches,
  selectedBranchId,
  onClose,
  onSubmit,
}: {
  branches: { id: string; name: string }[]
  selectedBranchId: string
  onClose: () => void
  onSubmit: (data: {
    guestName: string
    phone: string
    passType: string
    feePaid: number
    hostMember?: string
  }) => Promise<void>
}) {
  const [guestName, setGuestName] = useState('')
  const [phone, setPhone] = useState('')
  const [passType, setPassType] = useState('Day Pass (ETB 250)')
  const [hostMember, setHostMember] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!guestName.trim()) return

    setSaving(true)
    const fee = passType.includes('250') ? 250 : passType.includes('1,200') || passType.includes('1200') ? 1200 : 0
    await onSubmit({
      guestName: guestName.trim(),
      phone: phone.trim(),
      passType,
      feePaid: fee,
      hostMember: hostMember.trim() || undefined,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <section className="modal" role="dialog" aria-modal="true" style={{ width: 'min(100%, 460px)' }}>
        <button className="modal-close" onClick={onClose} aria-label="Close dialog">✕</button>
        <div className="modal-icon">🎟️</div>
        <h2>Guest & visitor check-in</h2>
        <p>Log a drop-in pass, trial visit, or guest brought by a member.</p>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Guest full name
            <input
              placeholder="e.g. Jordan Smith"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              required
              autoFocus
            />
          </label>

          <label>
            Phone number <span className="optional">(for emergency & follow-up)</span>
            <input
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>

          <label>
            Visitor pass type
            <select value={passType} onChange={(e) => setPassType(e.target.value)}>
              <option>Day Pass (ETB 250)</option>
              <option>One-Week Trial Pass (ETB 1,200)</option>
              <option>Complimentary Guest of Member</option>
              <option>VIP Prospect Tour</option>
            </select>
          </label>

          {passType.includes('Guest') && (
            <label>
              Host member name or ID
              <input
                placeholder="e.g. Alex Morgan or GP-01001"
                value={hostMember}
                onChange={(e) => setHostMember(e.target.value)}
                required
              />
            </label>
          )}

          <div className="checkin-hint" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
            <span>✓ Visitor is granted access for today&apos;s open session at {branches.find((b) => b.id === selectedBranchId)?.name || 'Main branch'}.</span>
          </div>

          <div className="modal-actions">
            <button type="button" className="button button-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="button button-primary" disabled={saving || !guestName.trim()}>
              {saving ? 'Checking in...' : 'Admit & Record Visit'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
