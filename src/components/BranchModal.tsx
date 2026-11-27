import React, { useState } from 'react'

export default function BranchModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (data: {
    name: string
    address: string
    phone: string
    isOpen: boolean
  }) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [isOpen, setIsOpen] = useState(true)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    await onSubmit({
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      isOpen,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <section className="modal" role="dialog" aria-modal="true" style={{ width: 'min(100%, 460px)' }}>
        <button className="modal-close" onClick={onClose} aria-label="Close dialog">✕</button>
        <div className="modal-icon">🏢</div>
        <h2>Add gym branch</h2>
        <p>Expand your gym presence with a new facility location.</p>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Branch name
            <input
              placeholder="e.g. Westside Studio or Downtown Branch"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </label>

          <label>
            Physical address / Location
            <input
              placeholder="e.g. 104 Bole Rd, Floor 3"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </label>

          <label>
            Branch phone contact
            <input
              type="tel"
              placeholder="+1 (555) 234-5678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '4px' }}>
            <input
              type="checkbox"
              checked={isOpen}
              onChange={(e) => setIsOpen(e.target.checked)}
              style={{ width: 'auto', height: 'auto' }}
            />
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#374151' }}>Open for daily operations</span>
          </label>

          <div className="modal-actions">
            <button type="button" className="button button-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="button button-primary" disabled={saving || !name.trim()}>
              {saving ? 'Adding...' : 'Add Branch'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
