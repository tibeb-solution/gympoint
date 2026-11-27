import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'

type CompanyStatus = 'Active' | 'Trial' | 'Suspended'
type PlanTier = 'Starter' | 'Growth' | 'Scale'
type Company = {
  id: string
  org_code: string
  name: string
  admin_name: string
  admin_email: string
  plan: PlanTier
  status: CompanyStatus
  branches: number
  members: number
  created: string
  logo_url?: string | null
}
type PlatformPlan = {
  id: string
  name: PlanTier
  price_cents: number
  caption: string
  included: string
}
type AdminPage = 'Overview' | 'Companies' | 'Subscriptions'

const defaultPlans: PlatformPlan[] = [
  { id: 'starter', name: 'Starter', price_cents: 250000, caption: 'For independent fitness studios', included: '1 branch · Up to 250 members' },
  { id: 'growth', name: 'Growth', price_cents: 550000, caption: 'For growing gym teams', included: 'Up to 5 branches · 1,500 members' },
  { id: 'scale', name: 'Scale', price_cents: 1200000, caption: 'For multi-location brands & chains', included: 'Unlimited branches · Unlimited members' },
]

const formatMoney = (value: number) =>
  `ETB ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)}`

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

function BuildingIcon({ size = 19 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 21V9h6v12M7 7h.01M17 7h.01M7 11h.01M17 11h.01" /></svg>
}

function AdminIcon({
  name,
  size = 19,
}: {
  name: 'grid' | 'building' | 'card' | 'search' | 'plus' | 'logout' | 'arrow' | 'close' | 'pause' | 'play' | 'trash' | 'edit'
  size?: number
}) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></>,
    building: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 21V9h6v12M7 7h.01M17 7h.01M7 11h.01M17 11h.01" /></>,
    card: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M7 15h3" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    plus: <><path d="M12 5v14m-7-7h14" /></>,
    logout: <><path d="M10 17l5-5-5-5m5 5H3" /><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    pause: <><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></>,
    play: <><polygon points="5 3 19 12 5 21 5 3" fill="currentColor" /></>,
    trash: <><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-6 5v6m4-6v6" /></>,
    edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

export default function PlatformAdmin({
  email,
  fullName,
  avatarUrl,
  onLogout,
  onOpenWorkspace,
  onOpenEditProfile,
}: {
  email: string
  fullName: string
  avatarUrl?: string | null
  onLogout: () => void
  onOpenWorkspace: (orgId?: string) => void
  onOpenEditProfile?: () => void
}) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [plans, setPlans] = useState<PlatformPlan[]>(defaultPlans)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activePage, setActivePage] = useState<AdminPage>('Overview')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [editingPlanTier, setEditingPlanTier] = useState<PlatformPlan | null>(null)
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState('')

  async function loadData() {
    setLoading(true)
    const [orgsRes, plansRes] = await Promise.all([
      supabase
        .from('organizations')
        .select('id, org_code, name, admin_name, admin_email, plan, status, created_at, logo_url, branches(count), members(count)')
        .order('created_at', { ascending: false }),
      supabase.from('platform_plans').select('id, name, price_cents, caption, included').order('price_cents', { ascending: true }),
    ])

    if (orgsRes.error) {
      setToast(orgsRes.error.message)
    } else if (orgsRes.data) {
      const mapped: Company[] = orgsRes.data.map((row) => {
        const branchCount = Array.isArray(row.branches) ? (row.branches[0]?.count ?? 0) : 0
        const memberCount = Array.isArray(row.members) ? (row.members[0]?.count ?? 0) : 0
        return {
          id: row.id,
          org_code: row.org_code,
          name: row.name,
          admin_name: row.admin_name,
          admin_email: row.admin_email,
          plan: row.plan as PlanTier,
          status: row.status as CompanyStatus,
          branches: branchCount,
          members: memberCount,
          created: formatDate(row.created_at),
          logo_url: row.logo_url ?? null,
        }
      })
      setCompanies(mapped)
    }

    if (!plansRes.error && plansRes.data && plansRes.data.length > 0) {
      setPlans(plansRes.data as PlatformPlan[])
    }
    setLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  async function togglePauseCompany(company: Company) {
    const nextStatus: CompanyStatus = company.status === 'Suspended' ? 'Active' : 'Suspended'
    const { error } = await supabase
      .from('organizations')
      .update({ status: nextStatus })
      .eq('id', company.id)

    if (error) {
      setToast(`Could not update company status: ${error.message}`)
      return
    }

    setCompanies((prev) =>
      prev.map((c) => (c.id === company.id ? { ...c, status: nextStatus } : c))
    )
    setToast(
      nextStatus === 'Suspended'
        ? `Access paused for ${company.name}. Users in this workspace cannot access the service until resumed.`
        : `Access resumed for ${company.name}.`
    )
  }

  async function handleUpdateCompanySubscription(companyId: string, newPlan: PlanTier, newStatus: CompanyStatus) {
    setSaving(true)
    const { error } = await supabase
      .from('organizations')
      .update({ plan: newPlan, status: newStatus })
      .eq('id', companyId)
    setSaving(false)

    if (error) {
      setToast(`Could not update subscription: ${error.message}`)
      return
    }

    setCompanies((prev) =>
      prev.map((c) => (c.id === companyId ? { ...c, plan: newPlan, status: newStatus } : c))
    )
    setEditingCompany(null)
    setToast(`Subscription updated to ${newPlan} (${newStatus})!`)
  }

  async function handleUpdatePlanTier(planId: string, newPriceETB: number, caption: string, included: string) {
    setSaving(true)
    const priceCents = Math.round(newPriceETB * 100)
    try {
      await supabase.from('platform_plans').upsert({ id: planId, price_cents: priceCents, caption, included })
    } catch {}
    setSaving(false)

    setPlans((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, price_cents: priceCents, caption, included } : p))
    )
    setEditingPlanTier(null)
    setToast('Subscription plan tier updated in Ethiopian Birr!')
  }

  async function confirmDeleteCompany() {
    if (!companyToDelete) return
    const target = companyToDelete
    setDeleting(true)

    try {
      await supabase.from('check_ins').delete().eq('organization_id', target.id)
      try { await supabase.from('payments').delete().eq('organization_id', target.id) } catch {}
      await supabase.from('members').delete().eq('organization_id', target.id)
      await supabase.from('membership_plans').delete().eq('organization_id', target.id)
      await supabase.from('branches').delete().eq('organization_id', target.id)
      try { await supabase.from('invitations').delete().eq('organization_id', target.id) } catch {}
      await supabase.from('profiles').update({ organization_id: null, branch_id: null }).eq('organization_id', target.id)
      const { error } = await supabase.from('organizations').delete().eq('id', target.id)

      if (error) {
        setToast(`Could not delete organization: ${error.message}`)
        setDeleting(false)
        return
      }

      setCompanies((prev) => prev.filter((c) => c.id !== target.id))
      setCompanyToDelete(null)
      setToast(`Deleted "${target.name}" and removed all workspace records.`)
    } catch (err: any) {
      setToast(`Deletion error: ${err?.message ?? 'Unknown error'}`)
    } finally {
      setDeleting(false)
    }
  }

  async function createCompany(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const companyName = String(form.get('companyName') ?? '').trim()
    const adminName = String(form.get('adminName') ?? '').trim()
    const adminEmail = String(form.get('adminEmail') ?? '').trim()
    const adminPassword = String(form.get('adminPassword') ?? '').trim()
    const plan = String(form.get('plan') ?? 'Starter') as PlanTier

    if (!companyName || !adminName || !adminEmail || !adminPassword) {
      setToast('Please complete all company fields including temporary password.')
      return
    }

    setSaving(true)

    try {
      let orgData: any = null
      let authWarning = ''

      try {
        const { data: edgeRes } = await supabase.functions.invoke('create-company', {
          body: {
            companyName,
            adminName,
            adminEmail,
            adminPassword,
            plan,
          },
        })
        if (edgeRes?.organization) {
          orgData = edgeRes.organization
        }
      } catch {
        // Fallback to direct client creation
      }

      if (!orgData) {
        const { data: directOrg, error: directError } = await supabase
          .from('organizations')
          .insert({
            name: companyName,
            admin_name: adminName,
            admin_email: adminEmail,
            contact_email: adminEmail,
            primary_location: 'Central Branch',
            plan,
            status: 'Active',
          })
          .select('id, org_code, name, admin_name, admin_email, plan, status, created_at')
          .single()

        if (directError || !directOrg) {
          throw new Error(directError?.message ?? 'Failed to register company')
        }
        orgData = directOrg

        const { data: branchData } = await supabase
          .from('branches')
          .insert({
            organization_id: directOrg.id,
            name: 'Main branch',
            is_open: true,
          })
          .select('id')
          .single()

        await supabase.from('membership_plans').insert([
          { organization_id: directOrg.id, name: 'Unlimited annual', price_cents: 1800000, billing_cycle: 'year', description: 'Full access to all amenities.', branch_access: 'all' },
          { organization_id: directOrg.id, name: 'Premium monthly', price_cents: 180000, billing_cycle: 'month', description: 'Flexible recurring monthly access.', branch_access: 'all' },
          { organization_id: directOrg.id, name: 'Starter monthly', price_cents: 120000, billing_cycle: 'month', description: 'Essential access for off-peak hours.', branch_access: 'home_only' },
        ])

        const isolatedAuthClient = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          { auth: { persistSession: false, autoRefreshToken: false } },
        )

        const { data: authData, error: authError } = await isolatedAuthClient.auth.signUp({
          email: adminEmail,
          password: adminPassword,
          options: {
            data: {
              full_name: adminName,
              organization_id: directOrg.id,
              role: 'org_admin',
            },
          },
        })

        if (authError) {
          if (authError.message.toLowerCase().includes('rate limit')) {
            authWarning = ' (Note: Email rate limit reached; adjust rate limits in Settings -> Auth or add user in Auth -> Users)'
          } else {
            authWarning = ` (Note: Auth account setup: ${authError.message})`
          }
        } else if (authData.user) {
          await supabase.from('profiles').upsert({
            id: authData.user.id,
            email: adminEmail,
            full_name: adminName,
            role: 'org_admin',
            organization_id: directOrg.id,
            branch_id: branchData?.id ?? null,
          })
        }
      }

      const newCompany: Company = {
        id: orgData.id,
        org_code: orgData.org_code || `GYM-${Math.floor(1000 + Math.random() * 9000)}`,
        name: orgData.name,
        admin_name: orgData.admin_name,
        admin_email: orgData.admin_email,
        plan: orgData.plan as PlanTier,
        status: orgData.status as CompanyStatus,
        branches: 1,
        members: 0,
        created: formatDate(orgData.created_at || new Date().toISOString()),
        logo_url: null,
      }

      setCompanies((prev) => [newCompany, ...prev])
      setShowCreate(false)
      setToast(`Created "${companyName}" with plan ${plan}! Temp password set.${authWarning}`)
    } catch (err: any) {
      setToast(`Could not create company: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const filteredCompanies = useMemo(
    () =>
      companies.filter((company) => {
        const query = search.toLowerCase()
        return (
          company.name.toLowerCase().includes(query) ||
          company.admin_email.toLowerCase().includes(query) ||
          company.admin_name.toLowerCase().includes(query) ||
          company.org_code.toLowerCase().includes(query)
        )
      }),
    [companies, search],
  )

  const activeCompanies = companies.filter((c) => c.status === 'Active').length
  const trialCompanies = companies.filter((c) => c.status === 'Trial').length
  const monthlyRevenue = companies
    .filter((c) => c.status === 'Active')
    .reduce((total, company) => {
      const matched = plans.find((plan) => plan.name === company.plan)
      return total + (matched ? matched.price_cents / 100 : 0)
    }, 0)

  const displayName = fullName || email.split('@')[0] || 'Admin'
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'AD'

  return (
    <div className="platform-shell">
      <aside className="platform-sidebar">
        <div className="platform-brand"><div className="platform-mark"><img src="/gympoint-icon.png" alt="GymPoint logo" /></div><strong>gympoint</strong></div>
        <div className="platform-org-label"><span className="platform-live-dot" /> PLATFORM OWNER</div>
        <div className="platform-nav-label">ADMINISTRATION</div>
        <nav className="platform-nav">
          {(['Overview', 'Companies', 'Subscriptions'] as AdminPage[]).map((page) => (
            <button
              key={page}
              className={`platform-nav-item ${activePage === page ? 'platform-nav-active' : ''}`}
              onClick={() => setActivePage(page)}
            >
              <AdminIcon name={page === 'Overview' ? 'grid' : page === 'Companies' ? 'building' : 'card'} />
              {page}
              {page === 'Companies' && <span className="platform-nav-count">{companies.length}</span>}
            </button>
          ))}
        </nav>
        <div className="platform-sidebar-bottom">
          <div className="platform-provider"><span>GYMPOINT PLATFORM</span><b>Built for better gym management</b></div>
          <div
            className="platform-account"
            style={{ cursor: onOpenEditProfile ? 'pointer' : 'default' }}
            onClick={onOpenEditProfile}
            title={onOpenEditProfile ? 'Click to edit profile picture and name' : undefined}
          >
            <div className="platform-user-avatar" style={avatarUrl ? { overflow: 'hidden', padding: 0 } : undefined}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (
                initials
              )}
            </div>
            <div title={email}>
              <strong>{displayName}</strong>
              <span>Super administrator</span>
              <small>{email}</small>
            </div>
          </div>
        </div>
      </aside>
      <main className="platform-main">
        <header className="platform-topbar">
          <div className="platform-breadcrumb">Platform <span>/</span> <b>{activePage}</b></div>
          <div className="platform-top-actions">
            <button className="platform-logout" onClick={onLogout}><AdminIcon name="logout" /> Sign out</button>
          </div>
        </header>
        <div className="platform-content">
          {activePage === 'Overview' && (
            <Overview
              displayName={displayName}
              companies={companies}
              loading={loading}
              active={activeCompanies}
              trials={trialCompanies}
              revenue={monthlyRevenue}
              onCompanies={() => setActivePage('Companies')}
              onCreate={() => setShowCreate(true)}
              onSelectCompany={(id) => onOpenWorkspace(id)}
              onTogglePause={togglePauseCompany}
              onRequestDelete={(c) => setCompanyToDelete(c)}
              onEditSubscription={(c) => setEditingCompany(c)}
            />
          )}
          {activePage === 'Companies' && (
            <Companies
              companies={filteredCompanies}
              loading={loading}
              total={companies.length}
              search={search}
              setSearch={setSearch}
              onCreate={() => setShowCreate(true)}
              onSelectCompany={(id) => onOpenWorkspace(id)}
              onTogglePause={togglePauseCompany}
              onRequestDelete={(c) => setCompanyToDelete(c)}
              onEditSubscription={(c) => setEditingCompany(c)}
            />
          )}
          {activePage === 'Subscriptions' && (
            <Subscriptions
              plans={plans}
              companies={companies}
              revenue={monthlyRevenue}
              onEditPlanTier={(p) => setEditingPlanTier(p)}
            />
          )}
          <footer className="platform-footer">
            <span>© {new Date().getFullYear()} GymPoint Technologies</span>
            <span><i className="platform-live-dot" /> Cloud synchronized</span>
            <span>Platform admin</span>
          </footer>
        </div>
      </main>

      {/* Create Company Modal */}
      {showCreate && (
        <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreate(false) }}>
          <section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="create-company-title">
            <button className="admin-modal-close" onClick={() => setShowCreate(false)} aria-label="Close dialog"><AdminIcon name="close" /></button>
            <div className="admin-modal-icon"><BuildingIcon /></div>
            <h2 id="create-company-title">Create a company account</h2>
            <p>Set up an organization workspace and its first administrator.</p>
            <form onSubmit={createCompany}>
              <label>Company / gym name<input name="companyName" placeholder="e.g. Summit Fitness" required autoFocus /></label>
              <label>Administrator name<input name="adminName" placeholder="Full name" required /></label>
              <label>Administrator email<input name="adminEmail" type="email" placeholder="admin@company.com" required /></label>
              <label>Temporary password<input name="adminPassword" type="password" minLength={6} placeholder="At least 6 characters" required /></label>
              <label>Subscription plan (in Ethiopian Birr)
                <select name="plan" defaultValue="Starter">
                  {plans.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} — {formatMoney(p.price_cents / 100)} / mo
                    </option>
                  ))}
                </select>
              </label>
              <div className="admin-invite-note">Creates the organization workspace, main branch, and a sign-in account with this temporary password.</div>
              <div className="admin-modal-actions">
                <button type="button" className="admin-cancel-button" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="admin-primary-button" disabled={saving}>
                  <AdminIcon name="plus" /> {saving ? 'Creating...' : 'Create account'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Edit Company Subscription Modal */}
      {editingCompany && (
        <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingCompany(null) }}>
          <section className="admin-modal" role="dialog" aria-modal="true">
            <button className="admin-modal-close" onClick={() => setEditingCompany(null)} aria-label="Close dialog"><AdminIcon name="close" /></button>
            <div className="admin-modal-icon" style={{ background: '#fff7ed', color: '#ea580c' }}>
              <AdminIcon name="card" size={20} />
            </div>
            <h2>Edit Company Subscription</h2>
            <p>Change subscription plan tier and billing status for <strong>{editingCompany.name}</strong>.</p>
            <form onSubmit={(e) => {
              e.preventDefault()
              const form = new FormData(e.currentTarget)
              const plan = form.get('plan') as PlanTier
              const status = form.get('status') as CompanyStatus
              void handleUpdateCompanySubscription(editingCompany.id, plan, status)
            }}>
              <label>
                Subscription Plan (in Ethiopian Birr)
                <select name="plan" defaultValue={editingCompany.plan}>
                  {plans.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} — {formatMoney(p.price_cents / 100)} / month ({p.caption})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Account Access Status
                <select name="status" defaultValue={editingCompany.status}>
                  <option value="Active">Active (Full access)</option>
                  <option value="Trial">Trial (Evaluating)</option>
                  <option value="Suspended">Suspended (Access Paused)</option>
                </select>
              </label>
              <div className="admin-modal-actions" style={{ marginTop: '20px' }}>
                <button type="button" className="admin-cancel-button" onClick={() => setEditingCompany(null)}>Cancel</button>
                <button type="submit" className="admin-primary-button" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Subscription'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Edit Platform Plan Tier Modal */}
      {editingPlanTier && (
        <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingPlanTier(null) }}>
          <section className="admin-modal" role="dialog" aria-modal="true">
            <button className="admin-modal-close" onClick={() => setEditingPlanTier(null)} aria-label="Close dialog"><AdminIcon name="close" /></button>
            <div className="admin-modal-icon" style={{ background: '#eef2ff', color: '#4338ca' }}>
              <AdminIcon name="card" size={20} />
            </div>
            <h2>Edit {editingPlanTier.name} Plan Tier</h2>
            <p>Configure pricing in Ethiopian Birr (ETB) and tier specifications.</p>
            <form onSubmit={(e) => {
              e.preventDefault()
              const form = new FormData(e.currentTarget)
              const priceETB = parseFloat(form.get('priceETB') as string)
              const caption = form.get('caption') as string
              const included = form.get('included') as string
              void handleUpdatePlanTier(editingPlanTier.id, priceETB, caption, included)
            }}>
              <label>
                Monthly Price (Ethiopian Birr - ETB)
                <input
                  name="priceETB"
                  type="number"
                  min="0"
                  step="100"
                  defaultValue={editingPlanTier.price_cents / 100}
                  required
                  autoFocus
                />
              </label>
              <label>
                Plan Caption / Subtitle
                <input name="caption" defaultValue={editingPlanTier.caption} required />
              </label>
              <label>
                Included Features &amp; Limits
                <input name="included" defaultValue={editingPlanTier.included} required />
              </label>
              <div className="admin-modal-actions" style={{ marginTop: '20px' }}>
                <button type="button" className="admin-cancel-button" onClick={() => setEditingPlanTier(null)}>Cancel</button>
                <button type="submit" className="admin-primary-button" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Plan Tier'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Delete Company Modal */}
      {companyToDelete && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) setCompanyToDelete(null)
          }}
        >
          <section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="delete-company-title">
            <button
              className="admin-modal-close"
              onClick={() => !deleting && setCompanyToDelete(null)}
              aria-label="Close dialog"
              disabled={deleting}
            >
              <AdminIcon name="close" />
            </button>
            <div className="admin-modal-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>
              <AdminIcon name="trash" size={20} />
            </div>
            <h2 id="delete-company-title" style={{ color: '#111827' }}>
              Delete &quot;{companyToDelete.name}&quot;?
            </h2>
            <p style={{ color: '#4b5563', lineHeight: 1.6, margin: '10px 0 16px' }}>
              Are you sure you want to permanently delete <strong>{companyToDelete.name}</strong>?
              This will remove all associated members ({companyToDelete.members}), branches ({companyToDelete.branches}),
              membership tiers, and check-in logs.
            </p>
            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, padding: '12px 14px', fontSize: 11, color: '#be123c', marginBottom: 16 }}>
              <strong>⚠️ Irreversible action:</strong> The company administrator ({companyToDelete.admin_email}) and all members will immediately lose access to this workspace.
            </div>
            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-cancel-button"
                onClick={() => setCompanyToDelete(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-primary-button"
                onClick={() => void confirmDeleteCompany()}
                disabled={deleting}
                style={{ background: '#dc2626', borderColor: '#b91c1c' }}
              >
                <AdminIcon name="trash" size={14} />
                {deleting ? 'Deleting company...' : 'Permanently Delete'}
              </button>
            </div>
          </section>
        </div>
      )}
      {toast && <div className="platform-toast"><span>✓</span>{toast}<button onClick={() => setToast('')} aria-label="Dismiss notification"><AdminIcon name="close" /></button></div>}
    </div>
  )
}

function Overview({
  displayName,
  companies,
  loading,
  active,
  trials,
  revenue,
  onCompanies,
  onCreate,
  onSelectCompany,
  onTogglePause,
  onRequestDelete,
  onEditSubscription,
}: {
  displayName: string
  companies: Company[]
  loading: boolean
  active: number
  trials: number
  revenue: number
  onCompanies: () => void
  onCreate: () => void
  onSelectCompany: (id: string) => void
  onTogglePause: (company: Company) => void
  onRequestDelete: (company: Company) => void
  onEditSubscription: (company: Company) => void
}) {
  return (
    <>
      <section className="platform-page-heading">
        <div>
          <span className="platform-eyebrow">YOUR PLATFORM AT A GLANCE</span>
          <h1>Good morning, {displayName}</h1>
          <p>Manage your gym network and subscription accounts in Ethiopian Birr (ETB).</p>
        </div>
        <button className="admin-primary-button" onClick={onCreate}><AdminIcon name="plus" /> Create company</button>
      </section>
      <section className="platform-metric-grid">
        <AdminMetric title="Total companies" value={companies.length.toString()} note="Gym workspaces" icon="building" />
        <AdminMetric title="Active accounts" value={active.toString()} note="Currently subscribed" icon="grid" />
        <AdminMetric title="Trial accounts" value={trials.toString()} note="Require follow-up" icon="card" />
        <AdminMetric title="Monthly recurring revenue" value={formatMoney(revenue)} note="From active subscriptions" icon="arrow" />
      </section>
      <section className="platform-panel company-overview-panel">
        <div className="platform-panel-heading">
          <div><h2>Company accounts</h2><p>Organizations on the GymPoint platform</p></div>
          <button className="platform-link-button" onClick={onCompanies}>View all companies <span>→</span></button>
        </div>
        <CompanyTable
          companies={companies.slice(0, 5)}
          emptyText={loading ? 'Loading companies...' : 'No company accounts yet.'}
          onSelectCompany={onSelectCompany}
          onTogglePause={onTogglePause}
          onRequestDelete={onRequestDelete}
          onEditSubscription={onEditSubscription}
        />
      </section>
      <section className="platform-callout">
        <span className="platform-callout-icon"><AdminIcon name="building" /></span>
        <div>
          <strong>One platform, separate gym workspaces</strong>
          <p>Each company account represents an independent organization with secure data isolation. Click or touch any registered company to preview its workspace.</p>
        </div>
      </section>
    </>
  )
}

function Companies({
  companies,
  loading,
  total,
  search,
  setSearch,
  onCreate,
  onSelectCompany,
  onTogglePause,
  onRequestDelete,
  onEditSubscription,
}: {
  companies: Company[]
  loading: boolean
  total: number
  search: string
  setSearch: (value: string) => void
  onCreate: () => void
  onSelectCompany: (id: string) => void
  onTogglePause: (company: Company) => void
  onRequestDelete: (company: Company) => void
  onEditSubscription: (company: Company) => void
}) {
  return (
    <>
      <section className="platform-page-heading">
        <div><span className="platform-eyebrow">ORGANIZATION MANAGEMENT</span><h1>Company accounts</h1><p>Create and manage gym workspaces on the platform.</p></div>
        <button className="admin-primary-button" onClick={onCreate}><AdminIcon name="plus" /> Create company</button>
      </section>
      <section className="platform-panel platform-directory">
        <div className="platform-panel-heading">
          <div><h2>All companies <span className="platform-count">{total}</span></h2><p>Company details and subscription status</p></div>
          <label className="platform-search"><AdminIcon name="search" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search companies..." /></label>
        </div>
        <CompanyTable
          companies={companies}
          emptyText={loading ? 'Loading companies...' : 'No companies match your search.'}
          onSelectCompany={onSelectCompany}
          onTogglePause={onTogglePause}
          onRequestDelete={onRequestDelete}
          onEditSubscription={onEditSubscription}
        />
      </section>
    </>
  )
}

function Subscriptions({
  plans,
  companies,
  revenue,
  onEditPlanTier,
}: {
  plans: PlatformPlan[]
  companies: Company[]
  revenue: number
  onEditPlanTier: (plan: PlatformPlan) => void
}) {
  return (
    <>
      <section className="platform-page-heading">
        <div><span className="platform-eyebrow">PLANS & REVENUE</span><h1>Subscriptions</h1><p>Review platform plan tiers in Ethiopian Birr (ETB) and assigned company accounts.</p></div>
        <div className="platform-revenue-total"><span>Estimated monthly recurring</span><strong>{formatMoney(revenue)}</strong></div>
      </section>
      <section className="platform-plan-grid">
        {plans.map((plan) => (
          <article className="platform-panel platform-plan-card" key={plan.id}>
            <div className={`platform-plan-icon ${plan.name.toLowerCase()}`}><AdminIcon name="card" /></div>
            <span className="platform-plan-caption">{plan.caption}</span>
            <div className="platform-plan-price"><strong>{formatMoney(plan.price_cents / 100)}</strong><span>/ company / month</span></div>
            <h2>{plan.name}</h2>
            <p>{plan.included}</p>
            <div className="platform-plan-company-count"><b>{companies.filter((company) => company.plan === plan.name).length}</b><span>company accounts</span></div>
            <button
              type="button"
              onClick={() => onEditPlanTier(plan)}
              style={{
                marginTop: '14px',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                color: '#334155',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <AdminIcon name="edit" size={13} /> Edit Tier &amp; Pricing (ETB)
            </button>
          </article>
        ))}
      </section>
      <section className="platform-panel subscription-note">
        <strong>Subscription tiers active</strong>
        <p>Plan definitions are stored in Ethiopian Birr (ETB). Pricing and specs can be updated dynamically at any time.</p>
      </section>
    </>
  )
}

function CompanyTable({
  companies,
  emptyText = 'No company accounts yet.',
  onSelectCompany,
  onTogglePause,
  onRequestDelete,
  onEditSubscription,
}: {
  companies: Company[]
  emptyText?: string
  onSelectCompany: (id: string) => void
  onTogglePause: (company: Company) => void
  onRequestDelete: (company: Company) => void
  onEditSubscription: (company: Company) => void
}) {
  return (
    <div className="platform-table-wrap">
      <table className="platform-company-table">
        <thead>
          <tr>
            <th>COMPANY</th>
            <th>PLAN (ETB)</th>
            <th>BRANCHES</th>
            <th>MEMBERS</th>
            <th>STATUS</th>
            <th>CREATED</th>
            <th style={{ textAlign: 'right', paddingRight: '16px' }}>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((company) => (
            <tr key={company.id} onClick={() => onSelectCompany(company.id)} style={{ cursor: 'pointer' }}>
              <td>
                <div className="platform-company-cell">
                  <div className="company-monogram" style={company.logo_url ? { overflow: 'hidden', padding: 0 } : undefined}>
                    {company.logo_url ? (
                      <img src={company.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      company.name.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div><strong>{company.name}</strong><span>{company.admin_email}</span></div>
                </div>
              </td>
              <td>
                <span
                  className={`platform-plan-badge plan-${company.plan.toLowerCase()}`}
                  style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  title="Click to edit subscription"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditSubscription(company)
                  }}
                >
                  {company.plan} ✎
                </span>
              </td>
              <td>{company.branches}</td>
              <td>{company.members.toLocaleString()}</td>
              <td><span className={`company-status status-${company.status.toLowerCase()}`}><i />{company.status}</span></td>
              <td>{company.created}</td>
              <td style={{ textAlign: 'right', paddingRight: '16px', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    title={`Open workspace preview for ${company.name}`}
                    onClick={() => onSelectCompany(company.id)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      border: '1px solid #c7d2fe',
                      background: '#eef2ff',
                      color: '#4338ca',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <AdminIcon name="arrow" size={13} />
                    Preview
                  </button>
                  <button
                    type="button"
                    title={`Edit subscription plan for ${company.name}`}
                    onClick={() => onEditSubscription(company)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      border: '1px solid #fed7aa',
                      background: '#fff7ed',
                      color: '#c2410c',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <AdminIcon name="edit" size={13} />
                    Edit Plan
                  </button>
                  <button
                    type="button"
                    title={company.status === 'Suspended' ? 'Resume access for this company' : 'Pause access for this company'}
                    onClick={() => onTogglePause(company)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      border: '1px solid',
                      transition: 'all 0.15s ease',
                      ...(company.status === 'Suspended'
                        ? { background: '#f0fdf4', borderColor: '#86efac', color: '#15803d' }
                        : { background: '#fffbeb', borderColor: '#fde68a', color: '#b45309' }),
                    }}
                  >
                    <AdminIcon name={company.status === 'Suspended' ? 'play' : 'pause'} size={13} />
                    {company.status === 'Suspended' ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    type="button"
                    title="Permanently delete company"
                    onClick={() => onRequestDelete(company)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      border: '1px solid #fecaca',
                      background: '#fef2f2',
                      color: '#b91c1c',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <AdminIcon name="trash" size={13} />
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {companies.length === 0 && <div className="platform-empty">{emptyText}</div>}
    </div>
  )
}

function AdminMetric({ title, value, note, icon }: { title: string; value: string; note: string; icon: 'building' | 'grid' | 'card' | 'arrow' }) {
  return (
    <article className="platform-metric">
      <span className={`platform-metric-icon platform-metric-${icon}`}><AdminIcon name={icon} /></span>
      <span className="platform-metric-title">{title}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  )
}
