import React, { useState } from 'react'

export type MemberDetail = {
  id: string
  member_code: string
  name: string
  email: string
  phone: string
  plan: string
  status: 'Active' | 'Pending' | 'Frozen' | 'Expired' | 'Cancelled'
  joined: string
  initials: string
  color: string
  emergency_contact?: string
  health_notes?: string
  waiver_accepted_at?: string
  expires_at?: string
  freeze_reason?: string
  cancellation_reason?: string
  home_branch_name?: string
  discount_code?: string
}

type TabKey = 'overview' | 'health' | 'checkins' | 'billing' | 'lifecycle'

export default function MemberProfileModal({
  member,
  checkIns,
  payments,
  orgName,
  onClose,
  onStatusChange,
  onToast,
}: {
  member: MemberDetail
  checkIns: { id: string; time: string; branch: string; status: string }[]
  payments: { id: string; amount_cents: number; method: string; paid_at: string; invoice_number?: string }[]
  orgName: string
  onClose: () => void
  onStatusChange: (memberId: string, newStatus: MemberDetail['status'], reason?: string) => Promise<void>
  onToast: (msg: string) => void
}) {
  const [tab, setTab] = useState<TabKey>('overview')
  const [freezeReason, setFreezeReason] = useState('Medical condition / injury')
  const [freezeDuration, setFreezeDuration] = useState('1 month')
  const [cancelReason, setCancelReason] = useState('Relocation / Moving')
  const [saving, setSaving] = useState(false)

  const memberCheckIns = checkIns.slice(0, 10)
  const memberPayments = payments.slice(0, 10)

  async function handleFreeze(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onStatusChange(member.id, 'Frozen', `${freezeReason} (${freezeDuration})`)
    setSaving(false)
    onToast(`Membership frozen for ${member.name}. Reason: ${freezeReason}`)
    onClose()
  }

  async function handleCancel(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onStatusChange(member.id, 'Cancelled', cancelReason)
    setSaving(false)
    onToast(`Membership cancelled for ${member.name}. Reason: ${cancelReason}`)
    onClose()
  }

  async function handleReactivate() {
    setSaving(true)
    await onStatusChange(member.id, 'Active')
    setSaving(false)
    onToast(`Membership reactivated for ${member.name}!`)
    onClose()
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal profile-modal" role="dialog" aria-modal="true" style={{ width: 'min(100%, 640px)', maxHeight: '90vh', overflowY: 'auto' }}>
        <button className="modal-close" onClick={onClose} aria-label="Close dialog">✕</button>

        {/* Member Header Card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingBottom: '16px', borderBottom: '1px solid #eff0f3' }}>
          <div className={`avatar avatar-${member.color}`} style={{ width: '52px', height: '52px', fontSize: '18px', borderRadius: '12px', flexShrink: 0 }}>
            {member.initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, font: '700 19px Manrope, sans-serif', color: '#1f2937' }}>{member.name}</h2>
              <span className={`status-badge status-${member.status.toLowerCase()}`}>
                <i />{member.status}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#6b7280', marginTop: '4px', flexWrap: 'wrap' }}>
              <span>ID: <strong style={{ color: '#374151' }}>{member.member_code}</strong></span>
              <span>·</span>
              <span>{member.email}</span>
              {member.phone && <><span>·</span><span>{member.phone}</span></>}
            </div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid #eff0f3', padding: '10px 0 0', overflowX: 'auto' }}>
          {[
            { key: 'overview', label: 'Membership' },
            { key: 'health', label: 'Health & Screening' },
            { key: 'checkins', label: `Visits (${memberCheckIns.length})` },
            { key: 'billing', label: `Billing (${memberPayments.length})` },
            { key: 'lifecycle', label: 'Actions' },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key as TabKey)}
              style={{
                padding: '8px 12px',
                border: 'none',
                background: 'none',
                borderBottom: tab === t.key ? '2px solid #7c3aed' : '2px solid transparent',
                color: tab === t.key ? '#7c3aed' : '#6b7280',
                fontWeight: tab === t.key ? 600 : 500,
                fontSize: '11px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ padding: '16px 0' }}>
          {tab === 'overview' && (
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Plan</span>
                  <div style={{ font: '600 13px Manrope', color: '#1e293b', marginTop: '4px' }}>{member.plan}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Member Code</span>
                  <div style={{ font: '600 13px monospace', color: '#7c3aed', marginTop: '4px' }}>{member.member_code}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Joined Date</span>
                  <div style={{ font: '600 13px Manrope', color: '#1e293b', marginTop: '4px' }}>{member.joined}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Home Branch</span>
                  <div style={{ font: '600 13px Manrope', color: '#1e293b', marginTop: '4px' }}>{member.home_branch_name || 'Main branch'}</div>
                </div>
              </div>

              {/* Digital Member QR Card */}
              <div style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)', color: '#fff', borderRadius: '12px', padding: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '9px', letterSpacing: '1.2px', color: '#c7d2fe', fontWeight: 700 }}>DIGITAL MEMBERSHIP PASS</span>
                  <h3 style={{ margin: '4px 0', fontSize: '16px', fontWeight: 700 }}>{member.name}</h3>
                  <div style={{ fontSize: '11px', color: '#a5b4fc' }}>{orgName} · {member.plan}</div>
                  <div style={{ marginTop: '8px', fontSize: '12px', fontFamily: 'monospace', background: 'rgba(255,255,255,0.12)', display: 'inline-block', padding: '2px 8px', borderRadius: '4px' }}>
                    {member.member_code}
                  </div>
                </div>
                <div style={{ background: '#fff', padding: '8px', borderRadius: '8px', display: 'grid', placeItems: 'center' }}>
                  {/* Visual QR Code Simulator representation */}
                  <svg width="68" height="68" viewBox="0 0 100 100" fill="#1e1b4b">
                    <rect width="30" height="30" x="5" y="5" rx="3" />
                    <rect width="18" height="18" x="11" y="11" fill="#fff" />
                    <rect width="10" height="10" x="15" y="15" fill="#1e1b4b" />
                    <rect width="30" height="30" x="65" y="5" rx="3" />
                    <rect width="18" height="18" x="71" y="11" fill="#fff" />
                    <rect width="10" height="10" x="75" y="15" fill="#1e1b4b" />
                    <rect width="30" height="30" x="5" y="65" rx="3" />
                    <rect width="18" height="18" x="11" y="71" fill="#fff" />
                    <rect width="10" height="10" x="15" y="75" fill="#1e1b4b" />
                    <rect width="8" height="8" x="46" y="16" />
                    <rect width="8" height="8" x="46" y="46" />
                    <rect width="8" height="8" x="66" y="46" />
                    <rect width="8" height="8" x="80" y="66" />
                    <rect width="8" height="8" x="46" y="76" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {tab === 'health' && (
            <div style={{ display: 'grid', gap: '14px' }}>
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <strong style={{ fontSize: '11px', color: '#475569', display: 'block', marginBottom: '6px' }}>Emergency Contact</strong>
                <div style={{ fontSize: '13px', color: '#1e293b' }}>{member.emergency_contact || 'None registered on file.'}</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <strong style={{ fontSize: '11px', color: '#475569', display: 'block', marginBottom: '6px' }}>Medical Conditions & Allergies</strong>
                <div style={{ fontSize: '13px', color: '#1e293b', lineHeight: 1.5 }}>
                  {member.health_notes || 'No known injuries, medical alerts, or allergies reported.'}
                </div>
              </div>
              <div style={{ background: member.waiver_accepted_at ? '#f0fdf4' : '#fffbeb', padding: '14px', borderRadius: '8px', border: `1px solid ${member.waiver_accepted_at ? '#bbf7d0' : '#fde68a'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>{member.waiver_accepted_at ? '✓' : '⚠️'}</span>
                  <div>
                    <strong style={{ fontSize: '12px', color: member.waiver_accepted_at ? '#15803d' : '#b45309' }}>
                      {member.waiver_accepted_at ? 'Digital Liability Waiver Accepted' : 'Waiver Pending Signature'}
                    </strong>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      {member.waiver_accepted_at
                        ? `Signed electronically on ${new Date(member.waiver_accepted_at).toLocaleDateString()}`
                        : 'Member must sign the gym policy and physical readiness waiver before high-intensity training.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'checkins' && (
            <div>
              {memberCheckIns.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '12px' }}>No check-in history found for this member.</div>
              ) : (
                <div style={{ display: 'grid', gap: '8px' }}>
                  {memberCheckIns.map((ci) => (
                    <div key={ci.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: '6px', fontSize: '11px' }}>
                      <div>
                        <strong style={{ color: '#1e293b' }}>{ci.branch} branch</strong>
                        <span style={{ color: '#64748b', marginLeft: '8px' }}>{ci.time}</span>
                      </div>
                      <span className={`access-badge ${ci.status === 'Access denied' ? 'access-denied' : ''}`}>
                        <i />{ci.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'billing' && (
            <div>
              {memberPayments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '12px' }}>No payments recorded yet for this member.</div>
              ) : (
                <div style={{ display: 'grid', gap: '8px' }}>
                  {memberPayments.map((p) => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: '6px', fontSize: '11px' }}>
                      <div>
                        <strong style={{ color: '#1e293b' }}>Receipt #{p.invoice_number || p.id.slice(0, 8)}</strong>
                        <span style={{ color: '#64748b', marginLeft: '8px' }}>{new Date(p.paid_at).toLocaleDateString()} via {p.method}</span>
                      </div>
                      <strong style={{ color: '#059669', fontSize: '12px' }}>${(p.amount_cents / 100).toFixed(2)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'lifecycle' && (
            <div style={{ display: 'grid', gap: '16px' }}>
              {member.status === 'Active' && (
                <>
                  <form onSubmit={handleFreeze} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '14px', display: 'grid', gap: '10px' }}>
                    <div>
                      <strong style={{ fontSize: '13px', color: '#b45309' }}>Freeze Membership</strong>
                      <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#78350f' }}>Temporarily pause check-in access and billing. Reason is required for audit logs.</p>
                    </div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#451a03', display: 'grid', gap: '4px' }}>
                      Reason for freezing
                      <select value={freezeReason} onChange={(e) => setFreezeReason(e.target.value)} style={{ height: '34px', fontSize: '11px', borderRadius: '6px', border: '1px solid #f59e0b', background: '#fff' }}>
                        <option>Medical condition / injury</option>
                        <option>Work / Travel</option>
                        <option>Temporary leave</option>
                        <option>Personal / Other</option>
                      </select>
                    </label>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#451a03', display: 'grid', gap: '4px' }}>
                      Duration
                      <select value={freezeDuration} onChange={(e) => setFreezeDuration(e.target.value)} style={{ height: '34px', fontSize: '11px', borderRadius: '6px', border: '1px solid #f59e0b', background: '#fff' }}>
                        <option>2 weeks</option>
                        <option>1 month</option>
                        <option>2 months</option>
                        <option>3 months</option>
                      </select>
                    </label>
                    <button type="submit" disabled={saving} className="button" style={{ background: '#d97706', color: '#fff', justifySelf: 'start', padding: '6px 14px', fontSize: '11px', fontWeight: 600, border: 'none' }}>
                      {saving ? 'Processing...' : 'Confirm Freeze'}
                    </button>
                  </form>

                  <form onSubmit={handleCancel} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '14px', display: 'grid', gap: '10px' }}>
                    <div>
                      <strong style={{ fontSize: '13px', color: '#b91c1c' }}>Cancel Membership</strong>
                      <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#7f1d1d' }}>Terminates member contract. Record the exit reason for churn analytics.</p>
                    </div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#450a0a', display: 'grid', gap: '4px' }}>
                      Cancellation reason
                      <select value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} style={{ height: '34px', fontSize: '11px', borderRadius: '6px', border: '1px solid #ef4444', background: '#fff' }}>
                        <option>Relocation / Moving</option>
                        <option>Financial reasons</option>
                        <option>Not using gym facilities</option>
                        <option>Joining another gym</option>
                        <option>Dissatisfied with facilities</option>
                        <option>Other</option>
                      </select>
                    </label>
                    <button type="submit" disabled={saving} className="button" style={{ background: '#dc2626', color: '#fff', justifySelf: 'start', padding: '6px 14px', fontSize: '11px', fontWeight: 600, border: 'none' }}>
                      {saving ? 'Cancelling...' : 'Confirm Cancellation'}
                    </button>
                  </form>
                </>
              )}

              {(member.status === 'Frozen' || member.status === 'Cancelled' || member.status === 'Expired') && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px', display: 'grid', gap: '10px' }}>
                  <strong style={{ fontSize: '13px', color: '#15803d' }}>Reactivate Membership</strong>
                  <p style={{ margin: 0, fontSize: '11px', color: '#166534' }}>
                    Restore {member.name}&apos;s membership to <strong>Active</strong> status. The member will immediately be allowed through check-in scanners.
                  </p>
                  <button type="button" onClick={handleReactivate} disabled={saving} className="button" style={{ background: '#16a34a', color: '#fff', justifySelf: 'start', padding: '7px 16px', fontSize: '11px', fontWeight: 600, border: 'none' }}>
                    {saving ? 'Reactivating...' : 'Reactivate Membership'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
