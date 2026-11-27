import { useState, type FormEvent } from 'react'

export type MembershipPlanToEdit = {
  id: string
  name: string
  price_cents: number
  billing_cycle: 'month' | 'year' | 'one_time'
  description: string
  branch_access?: 'all' | 'home_only'
}

export default function EditPlanModal({
  plan,
  onClose,
  onSubmit,
  onDelete,
}: {
  plan: MembershipPlanToEdit
  onClose: () => void
  onSubmit: (data: {
    id: string
    name: string
    priceDollars: number
    billingCycle: 'month' | 'year' | 'one_time'
    description: string
    branchAccess: 'all' | 'home_only'
  }) => Promise<void>
  onDelete?: (planId: string) => Promise<void>
}) {
  const [name, setName] = useState(plan.name)
  const [price, setPrice] = useState((plan.price_cents / 100).toString())
  const [cycle, setCycle] = useState<'month' | 'year' | 'one_time'>(plan.billing_cycle)
  const [description, setDescription] = useState(plan.description)
  const [branchAccess, setBranchAccess] = useState<'all' | 'home_only'>(plan.branch_access ?? 'all')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const numericPrice = parseFloat(price)
    if (isNaN(numericPrice) || numericPrice < 0) return

    setSaving(true)
    await onSubmit({
      id: plan.id,
      name: name.trim(),
      priceDollars: numericPrice,
      billingCycle: cycle,
      description: description.trim(),
      branchAccess,
    })
    setSaving(false)
  }

  async function handleDelete() {
    if (!onDelete) return
    setSaving(true)
    await onDelete(plan.id)
    setSaving(false)
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose() }}>
      <section className="modal" role="dialog" aria-modal="true" style={{ width: 'min(100%, 460px)' }}>
        <button className="modal-close" onClick={onClose} aria-label="Close dialog" disabled={saving}>✕</button>
        <div className="modal-icon">✏️</div>
        <h2>Edit Membership Plan</h2>
        <p>Modify plan pricing in Ethiopian Birr (ETB) and branch access rules.</p>

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
              Price (Ethiopian Birr - ETB)
              <input
                type="number"
                step="1"
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
                <option value="one_time">One-time / Drop-in pass</option>
              </select>
            </label>
          </div>

          <label>
            Branch access rule
            <select value={branchAccess} onChange={(e) => setBranchAccess(e.target.value as any)}>
              <option value="all">All branches (Reciprocal chain access)</option>
              <option value="home_only">Home branch only (Single facility)</option>
            </select>
          </label>

          <label>
            Description / Perks included
            <input
              placeholder="e.g. Full weights, classes, locker, towel service"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          {confirmDelete ? (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px', borderRadius: '8px', margin: '8px 0' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#991b1b', marginBottom: '6px' }}>
                Are you sure you want to delete &quot;{plan.name}&quot;?
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="table-btn table-btn-danger"
                  onClick={() => void handleDelete()}
                  disabled={saving}
                >
                  Yes, Delete Plan
                </button>
                <button
                  type="button"
                  className="button button-outline"
                  onClick={() => setConfirmDelete(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {onDelete && !confirmDelete && (
                <button
                  type="button"
                  className="table-btn table-btn-danger"
                  onClick={() => setConfirmDelete(true)}
                  disabled={saving}
                >
                  Delete Plan
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="button button-outline" onClick={onClose} disabled={saving}>Cancel</button>
              <button type="submit" className="button button-primary" disabled={saving || !name.trim()}>
                {saving ? 'Saving...' : 'Save Plan Changes'}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  )
}
