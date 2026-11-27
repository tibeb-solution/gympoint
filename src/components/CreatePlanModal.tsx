import React, { useState } from 'react'

export default function CreatePlanModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (data: {
    name: string
    priceDollars: number
    billingCycle: 'month' | 'year' | 'one_time'
    description: string
    branchAccess: 'all' | 'home_only'
  }) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('69.00')
  const [cycle, setCycle] = useState<'month' | 'year' | 'one_time'>('month')
  const [description, setDescription] = useState('Full gym access with premium amenities.')
  const [branchAccess, setBranchAccess] = useState<'all' | 'home_only'>('all')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const numericPrice = parseFloat(price)
    if (isNaN(numericPrice) || numericPrice < 0) return

    setSaving(true)
    await onSubmit({
      name: name.trim(),
      priceDollars: numericPrice,
      billingCycle: cycle,
      description: description.trim(),
      branchAccess,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <section className="modal" role="dialog" aria-modal="true" style={{ width: 'min(100%, 460px)' }}>
        <button className="modal-close" onClick={onClose} aria-label="Close dialog">✕</button>
        <div className="modal-icon">📋</div>
        <h2>Create membership tier</h2>
        <p>Define a new membership offering for your community.</p>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Plan name
            <input
              placeholder="e.g. VIP Multi-Branch Annual"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label>
              Price (USD)
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </label>
            <label>
              Billing frequency
              <select value={cycle} onChange={(e) => setCycle(e.target.value as any)}>
                <option value="month">Monthly recurring</option>
                <option value="year">Annual recurring</option>
                <option value="one_time">One-time / Day pass</option>
              </select>
            </label>
          </div>

          <label>
            Branch access rule
            <select value={branchAccess} onChange={(e) => setBranchAccess(e.target.value as any)}>
              <option value="all">All branches (Reciprocal chain access)</option>
              <option value="home_only">Home branch only (Single location)</option>
            </select>
          </label>

          <label>
            Description
            <input
              placeholder="e.g. Includes locker, towel service, and sauna"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="button button-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="button button-primary" disabled={saving || !name.trim()}>
              {saving ? 'Creating...' : 'Create Plan'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
