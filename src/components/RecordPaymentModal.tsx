import React, { useState } from 'react'

export type PaymentMemberOption = {
  id: string
  name: string
  member_code: string
  plan: string
}

export default function RecordPaymentModal({
  members,
  onClose,
  onSubmit,
}: {
  members: PaymentMemberOption[]
  onClose: () => void
  onSubmit: (data: {
    memberId: string
    amountDollars: number
    method: 'cash' | 'card' | 'bank_transfer' | 'mobile_money'
    discountCode?: string
    notes?: string
  }) => Promise<void>
}) {
  const [selectedMemberId, setSelectedMemberId] = useState(members[0]?.id ?? '')
  const [amount, setAmount] = useState('1500')
  const [method, setMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'mobile_money'>('cash')
  const [discountCode, setDiscountCode] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedMemberId) return
    const numericAmount = parseFloat(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) return

    setSaving(true)
    await onSubmit({
      memberId: selectedMemberId,
      amountDollars: numericAmount,
      method,
      discountCode: discountCode.trim() || undefined,
      notes: notes.trim() || undefined,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <section className="modal" role="dialog" aria-modal="true" style={{ width: 'min(100%, 460px)' }}>
        <button className="modal-close" onClick={onClose} aria-label="Close dialog">✕</button>
        <div className="modal-icon">💳</div>
        <h2>Record member payment</h2>
        <p>Log a manual cash, card, transfer, or mobile payment.</p>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Member
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              required
            >
              {members.length === 0 ? (
                <option value="">No members registered</option>
              ) : (
                members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.member_code}) · {m.plan}
                  </option>
                ))
              )}
            </select>
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label>
              Amount (Ethiopian Birr - ETB)
              <input
                type="number"
                step="1"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </label>
            <label>
              Payment Method
              <select value={method} onChange={(e) => setMethod(e.target.value as any)}>
                <option value="cash">Cash</option>
                <option value="card">Credit / Debit Card</option>
                <option value="mobile_money">Mobile Money (Telebirr/CBE)</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </label>
          </div>

          <label>
            Promo Code / Discount <span className="optional">(optional)</span>
            <input
              placeholder="e.g. EARLYBIRD or PROMO10"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
            />
          </label>

          <label>
            Reference / Notes <span className="optional">(optional)</span>
            <input
              placeholder="Receipt note or transaction reference"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="button button-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="button button-primary" disabled={saving || !selectedMemberId}>
              {saving ? 'Recording...' : 'Record & Issue Receipt'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
