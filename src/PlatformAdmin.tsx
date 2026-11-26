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
  { id: 'starter', name: 'Starter', price_cents: 4900, caption: 'For independent studios', included: '1 branch · Up to 250 members' },
  { id: 'growth', name: 'Growth', price_cents: 12900, caption: 'For growing gym teams', included: 'Up to 5 branches · 1,500 members' },
  { id: 'scale', name: 'Scale', price_cents: 29900, caption: 'For multi-location brands', included: 'Unlimited branches · 5,000 members' },
]

const formatMoney = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

function BuildingIcon({ size = 19 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 21V9h6v12M7 7h.01M17 7h.01M7 11h.01M17 11h.01" /></svg>
}

function AdminIcon({ name }: { name: 'grid' | 'building' | 'card' | 'search' | 'plus' | 'logout' | 'arrow' | 'close' }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></>,
    building: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 21V9h6v12M7 7h.01M17 7h.01M7 11h.01M17 11h.01" /></>,
    card: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M7 15h3" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    plus: <><path d="M12 5v14m-7-7h14" /></>,
    logout: <><path d="M10 17l5-5-5-5m5 5H3" /><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
  }
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

export default function PlatformAdmin({
  email,
  fullName,
  onLogout,
  onOpenWorkspace,
}: {
  email: string
  fullName: string
  onLogout: () => void
  onOpenWorkspace: (orgId?: string) => void
}) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [plans, setPlans] = useState<PlatformPlan[]>(defaultPlans)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activePage, setActivePage] = useState<AdminPage>('Overview')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
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

  async function createCompany(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('companyName') ?? '').trim()
    const adminName = String(data.get('adminName') ?? '').trim()
    const adminEmail = String(data.get('adminEmail') ?? '').trim()
    const adminPassword = String(data.get('adminPassword') ?? '')
    if (!name || !adminName || !adminEmail || !adminPassword) return
    if (adminPassword.length < 6) {
      setToast('Temporary password must be at least 6 characters.')
      return
    }
    const plan = String(data.get('plan') ?? 'Starter') as PlanTier

    setSaving(true)
    try {
      let createdOrg: { id: string; org_code: string; name: string; admin_name: string; admin_email: string; plan: string; status: string; created_at: string; logo_url?: string | null } | null = null

      // 1. Try edge function if deployed
      try {
        const { data: edgeRes } = await supabase.functions.invoke('create-company', {
          body: { name, adminName, adminEmail, adminPassword, plan },
        })
        if (edgeRes?.organization) {
          createdOrg = edgeRes.organization
        }
      } catch {
        // Fall back to client-side creation
      }

      // 2. Direct client-side user registration & company creation
      if (!createdOrg) {
        // Create organization in database first
        const { data: directOrg, error: directError } = await supabase
          .from('organizations')
          .insert({
            name,
            admin_name: adminName,
            admin_email: adminEmail,
            contact_email: adminEmail,
            plan,
            status: 'Trial',
          })
          .select('id, org_code, name, admin_name, admin_email, plan, status, created_at, logo_url')
          .single()

        if (directError || !directOrg) {
          throw new Error(directError?.message ?? 'Failed to create organization')
        }

        // Create default branch
        const { data: branchData } = await supabase
          .from('branches')
          .insert({ organization_id: directOrg.id, name: 'Main branch', is_open: true })
          .select('id')
          .single()

        // Create default membership tiers
        await supabase.from('membership_plans').insert([
          { organization_id: directOrg.id, name: 'Unlimited annual', price_cents: 59900, billing_cycle: 'year', description: 'Full access to all branches, all year round.' },
          { organization_id: directOrg.id, name: 'Premium monthly', price_cents: 7900, billing_cycle: 'month', description: 'Unlimited gym access with premium amenities.' },
          { organization_id: directOrg.id, name: 'Off-peak monthly', price_cents: 4900, billing_cycle: 'month', description: 'Flexible access during off-peak hours.' },
        ])

        // Register user in Supabase Auth without affecting current platform_admin session
        const authClient = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
              detectSessionInUrl: false,
            },
          },
        )

        let authWarning = ''
        const { data: authData, error: authErr } = await authClient.auth.signUp({
          email: adminEmail.toLowerCase(),
          password: adminPassword,
          options: {
            data: { full_name: adminName },
          },
        })

        if (authErr) {
          if (authErr.message.toLowerCase().includes('rate limit')) {
            authWarning = ' (Note: Supabase email rate limit reached; adjust rate limits in Supabase Settings or add user in Auth -> Users)'
          } else if (!authErr.message.toLowerCase().includes('already registered')) {
            authWarning = ` (${authErr.message})`
          }
        }

        const newUserId = authData?.user?.id

        // Assign administrator role and link to organization
        if (newUserId) {
          await supabase.from('profiles').upsert({
            id: newUserId,
            email: adminEmail.toLowerCase(),
            full_name: adminName,
            role: 'org_admin',
            organization_id: directOrg.id,
            branch_id: branchData?.id ?? null,
          })
        }

        createdOrg = directOrg
        if (authWarning) {
          setToast(`Workspace created for ${name}!${authWarning}`)
        } else {
          setToast(`Workspace created for ${name}! Administrator can sign in with their temporary password.`)
        }
      }

      const company: Company = {
        id: createdOrg.id,
        org_code: createdOrg.org_code,
        name: createdOrg.name,
        admin_name: createdOrg.admin_name,
        admin_email: createdOrg.admin_email,
        plan: createdOrg.plan as PlanTier,
        status: createdOrg.status as CompanyStatus,
        branches: 1,
        members: 0,
        created: formatDate(createdOrg.created_at),
        logo_url: createdOrg.logo_url ?? null,
      }

      setCompanies((prev) => [company, ...prev])
      setShowCreate(false)
      setActivePage('Companies')
      setToast(`Workspace created for ${name}! Administrator can sign in with their temporary password.`)
    } catch (error) {
      setToast(`Could not create company: ${error instanceof Error ? error.message : 'Unexpected error.'}`)
    } finally {
      setSaving(false)
    }
  }

  const filteredCompanies = useMemo(
    () =>
      companies.filter((company) =>
        `${company.name} ${company.admin_email} ${company.admin_name} ${company.org_code}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [companies, search],
  )
  const activeCompanies = companies.filter((company) => company.status === 'Active').length
  const trialCompanies = companies.filter((company) => company.status === 'Trial').length
  const monthlyRevenue = companies
    .filter((company) => company.status === 'Active')
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
          <div className="platform-account">
            <div className="platform-user-avatar">{initials}</div>
            <div title={email}><strong>{displayName}</strong><span>Super administrator</span><small>{email}</small></div>
          </div>
        </div>
      </aside>
      <main className="platform-main">
        <header className="platform-topbar">
          <div className="platform-breadcrumb">Platform <span>/</span> <b>{activePage}</b></div>
          <div className="platform-top-actions">
            <span className="platform-env"><i /> Supabase connected</span>
            <button className="platform-outline-button" onClick={() => onOpenWorkspace(companies[0]?.id)}>
              <BuildingIcon size={16} /> Preview gym workspace
            </button>
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
            />
          )}
          {activePage === 'Subscriptions' && <Subscriptions plans={plans} companies={companies} revenue={monthlyRevenue} />}
          <footer className="platform-footer">
            <span>© {new Date().getFullYear()} GymPoint Technologies</span>
            <span><i /> Synced with Supabase</span>
            <span>Platform admin</span>
          </footer>
        </div>
      </main>
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
              <label>Subscription plan<select name="plan" defaultValue="Starter"><option>Starter</option><option>Growth</option><option>Scale</option></select></label>
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
}) {
  return (
    <>
      <section className="platform-page-heading">
        <div>
          <span className="platform-eyebrow">YOUR PLATFORM AT A GLANCE</span>
          <h1>Good morning, {displayName}</h1>
          <p>Manage your gym network and subscription accounts.</p>
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
        <CompanyTable companies={companies.slice(0, 5)} emptyText={loading ? 'Loading companies...' : 'No company accounts yet.'} onSelectCompany={onSelectCompany} />
      </section>
      <section className="platform-callout">
        <span className="platform-callout-icon"><AdminIcon name="building" /></span>
        <div>
          <strong>One platform, separate gym workspaces</strong>
          <p>Each company account represents an independent organization with Row Level Security isolation in Supabase. Click any company row to preview its workspace.</p>
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
}: {
  companies: Company[]
  loading: boolean
  total: number
  search: string
  setSearch: (value: string) => void
  onCreate: () => void
  onSelectCompany: (id: string) => void
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
        <CompanyTable companies={companies} emptyText={loading ? 'Loading companies...' : 'No companies match your search.'} onSelectCompany={onSelectCompany} />
      </section>
    </>
  )
}

function Subscriptions({ plans, companies, revenue }: { plans: PlatformPlan[]; companies: Company[]; revenue: number }) {
  return (
    <>
      <section className="platform-page-heading">
        <div><span className="platform-eyebrow">PLANS & REVENUE</span><h1>Subscriptions</h1><p>Review platform plan tiers and assigned company accounts.</p></div>
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
          </article>
        ))}
      </section>
      <section className="platform-panel subscription-note">
        <strong>Subscription tiers synced from Supabase</strong>
        <p>Plan definitions are stored in the <code>platform_plans</code> table. Connect Stripe webhooks when you are ready for automated billing.</p>
      </section>
    </>
  )
}

function CompanyTable({
  companies,
  emptyText = 'No company accounts yet.',
  onSelectCompany,
}: {
  companies: Company[]
  emptyText?: string
  onSelectCompany: (id: string) => void
}) {
  return (
    <div className="platform-table-wrap">
      <table className="platform-company-table">
        <thead><tr><th>COMPANY</th><th>PLAN</th><th>BRANCHES</th><th>MEMBERS</th><th>STATUS</th><th>CREATED</th></tr></thead>
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
              <td><span className={`platform-plan-badge plan-${company.plan.toLowerCase()}`}>{company.plan}</span></td>
              <td>{company.branches}</td>
              <td>{company.members.toLocaleString()}</td>
              <td><span className={`company-status status-${company.status.toLowerCase()}`}><i />{company.status}</span></td>
              <td>{company.created}</td>
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
