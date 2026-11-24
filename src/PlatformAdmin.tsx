import { useMemo, useState } from 'react'

type CompanyStatus = 'Active' | 'Trial' | 'Suspended'
type Company = {
  id: string
  name: string
  adminName: string
  email: string
  plan: 'Starter' | 'Growth' | 'Scale'
  status: CompanyStatus
  branches: number
  members: number
  created: string
}
type AdminPage = 'Overview' | 'Companies' | 'Subscriptions'

const starterCompanies: Company[] = [
  { id: 'ORG-1001', name: 'Atlas Fitness', adminName: 'Jordan Lee', email: 'jordan@atlasfitness.com', plan: 'Growth', status: 'Active', branches: 3, members: 482, created: 'May 12, 2025' },
  { id: 'ORG-1002', name: 'Core Athletic Club', adminName: 'Morgan Chen', email: 'morgan@coreathletic.com', plan: 'Starter', status: 'Trial', branches: 1, members: 126, created: 'May 16, 2025' },
  { id: 'ORG-1003', name: 'Northstar Strength', adminName: 'Taylor Brooks', email: 'taylor@northstar.fit', plan: 'Scale', status: 'Active', branches: 5, members: 1240, created: 'May 18, 2025' },
]
const plans = [
  { name: 'Starter', price: 49, caption: 'For independent studios', included: '1 branch · Up to 250 members', color: 'starter' },
  { name: 'Growth', price: 129, caption: 'For growing gym teams', included: 'Up to 5 branches · 1,500 members', color: 'growth' },
  { name: 'Scale', price: 299, caption: 'For multi-location brands', included: 'Unlimited branches · 5,000 members', color: 'scale' },
] as const
const formatMoney = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)

function readCompanies(): Company[] {
  try {
    const saved = localStorage.getItem('gymflow-companies')
    return saved ? JSON.parse(saved) as Company[] : starterCompanies
  } catch {
    return starterCompanies
  }
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

export default function PlatformAdmin({ email, onLogout, onOpenWorkspace }: { email: string; onLogout: () => void; onOpenWorkspace: () => void }) {
  const [companies, setCompanies] = useState<Company[]>(readCompanies)
  const [activePage, setActivePage] = useState<AdminPage>('Overview')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [toast, setToast] = useState('')

  function saveCompanies(next: Company[]) {
    setCompanies(next)
    localStorage.setItem('gymflow-companies', JSON.stringify(next))
  }

  function createCompany(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('companyName') ?? '').trim()
    const adminName = String(data.get('adminName') ?? '').trim()
    const adminEmail = String(data.get('adminEmail') ?? '').trim()
    if (!name || !adminName || !adminEmail) return
    const plan = String(data.get('plan') ?? 'Starter') as Company['plan']
    const company: Company = {
      id: `ORG-${1001 + companies.length}`,
      name, adminName, email: adminEmail, plan, status: 'Trial', branches: 1, members: 0,
      created: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    }
    saveCompanies([company, ...companies])
    setShowCreate(false)
    setActivePage('Companies')
    setToast(`Workspace created for ${name}. Admin invitation is pending.`)
  }

  const filteredCompanies = useMemo(() => companies.filter((company) => `${company.name} ${company.email} ${company.adminName} ${company.id}`.toLowerCase().includes(search.toLowerCase())), [companies, search])
  const activeCompanies = companies.filter((company) => company.status === 'Active').length
  const trialCompanies = companies.filter((company) => company.status === 'Trial').length
  const monthlyRevenue = companies.filter((company) => company.status === 'Active').reduce((total, company) => total + plans.find((plan) => plan.name === company.plan)!.price, 0)

  return <div className="platform-shell">
    <aside className="platform-sidebar">
      <div className="platform-brand"><div className="platform-mark"><span /></div><strong>gymflow</strong></div>
      <div className="platform-org-label"><span className="platform-live-dot" /> PLATFORM OWNER</div>
      <div className="platform-nav-label">ADMINISTRATION</div>
      <nav className="platform-nav">
        {(['Overview', 'Companies', 'Subscriptions'] as AdminPage[]).map((page) => <button key={page} className={`platform-nav-item ${activePage === page ? 'platform-nav-active' : ''}`} onClick={() => setActivePage(page)}><AdminIcon name={page === 'Overview' ? 'grid' : page === 'Companies' ? 'building' : 'card'} />{page}{page === 'Companies' && <span className="platform-nav-count">{companies.length}</span>}</button>)}
      </nav>
      <div className="platform-sidebar-bottom">
        <div className="platform-provider"><span>GYMFLOW PLATFORM</span><b>Built for better gym management</b></div>
        <div className="platform-account"><div className="platform-user-avatar">AM</div><div title={email}><strong>Aman</strong><span>Super administrator</span><small>{email}</small></div></div>
      </div>
    </aside>
    <main className="platform-main">
      <header className="platform-topbar"><div className="platform-breadcrumb">Platform <span>/</span> <b>{activePage}</b></div><div className="platform-top-actions"><span className="platform-env"><i /> Local demo</span><button className="platform-outline-button" onClick={onOpenWorkspace}><BuildingIcon size={16} /> Preview gym workspace</button><button className="platform-logout" onClick={onLogout}><AdminIcon name="logout" /> Sign out</button></div></header>
      <div className="platform-content">
        {activePage === 'Overview' && <Overview companies={companies} active={activeCompanies} trials={trialCompanies} revenue={monthlyRevenue} onCompanies={() => setActivePage('Companies')} onCreate={() => setShowCreate(true)} />}
        {activePage === 'Companies' && <Companies companies={filteredCompanies} total={companies.length} search={search} setSearch={setSearch} onCreate={() => setShowCreate(true)} />}
        {activePage === 'Subscriptions' && <Subscriptions companies={companies} revenue={monthlyRevenue} />}
        <footer className="platform-footer"><span>© {new Date().getFullYear()} GymFlow Technologies</span><span><i /> All demo data stays in this browser</span><span>Platform admin</span></footer>
      </div>
    </main>
    {showCreate && <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreate(false) }}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="create-company-title"><button className="admin-modal-close" onClick={() => setShowCreate(false)} aria-label="Close dialog"><AdminIcon name="close" /></button><div className="admin-modal-icon"><BuildingIcon /></div><h2 id="create-company-title">Create a company account</h2><p>Set up an organization workspace and its first administrator.</p><form onSubmit={createCompany}><label>Company / gym name<input name="companyName" placeholder="e.g. Summit Fitness" required autoFocus /></label><label>Administrator name<input name="adminName" placeholder="Full name" required /></label><label>Administrator email<input name="adminEmail" type="email" placeholder="admin@company.com" required /></label><label>Subscription plan<select name="plan" defaultValue="Starter"><option>Starter</option><option>Growth</option><option>Scale</option></select></label><div className="admin-invite-note">The company workspace will be created as a trial. An invitation email is only simulated in this local demo.</div><div className="admin-modal-actions"><button type="button" className="admin-cancel-button" onClick={() => setShowCreate(false)}>Cancel</button><button type="submit" className="admin-primary-button"><AdminIcon name="plus" /> Create account</button></div></form></section></div>}
    {toast && <div className="admin-toast"><span>✓</span>{toast}<button onClick={() => setToast('')} aria-label="Dismiss notification"><AdminIcon name="close" /></button></div>}
  </div>
}

function Overview({ companies, active, trials, revenue, onCompanies, onCreate }: { companies: Company[]; active: number; trials: number; revenue: number; onCompanies: () => void; onCreate: () => void }) {
  return <><section className="platform-page-heading"><div><span className="platform-eyebrow">YOUR PLATFORM AT A GLANCE</span><h1>Good morning, Aman</h1><p>Manage your gym network and subscription accounts.</p></div><button className="admin-primary-button" onClick={onCreate}><AdminIcon name="plus" /> Create company</button></section>
    <section className="platform-metric-grid"><AdminMetric title="Total companies" value={companies.length.toString()} note="Gym workspaces" icon="building" /><AdminMetric title="Active accounts" value={active.toString()} note="Currently subscribed" icon="grid" /><AdminMetric title="Trial accounts" value={trials.toString()} note="Require follow-up" icon="card" /><AdminMetric title="Monthly recurring revenue" value={formatMoney(revenue)} note="From active subscriptions" icon="arrow" /></section>
    <section className="platform-panel company-overview-panel"><div className="platform-panel-heading"><div><h2>Company accounts</h2><p>Organizations on the GymFlow platform</p></div><button className="platform-link-button" onClick={onCompanies}>View all companies <span>→</span></button></div><CompanyTable companies={companies.slice(0, 5)} /></section>
    <section className="platform-callout"><span className="platform-callout-icon"><AdminIcon name="building" /></span><div><strong>One platform, separate gym workspaces</strong><p>Each company account represents an independent organization. Member data is demo-only until the backend and tenant isolation are implemented.</p></div></section>
  </>
}

function Companies({ companies, total, search, setSearch, onCreate }: { companies: Company[]; total: number; search: string; setSearch: (value: string) => void; onCreate: () => void }) {
  return <><section className="platform-page-heading"><div><span className="platform-eyebrow">ORGANIZATION MANAGEMENT</span><h1>Company accounts</h1><p>Create and manage gym workspaces on the platform.</p></div><button className="admin-primary-button" onClick={onCreate}><AdminIcon name="plus" /> Create company</button></section><section className="platform-panel platform-directory"><div className="platform-panel-heading"><div><h2>All companies <span className="platform-count">{total}</span></h2><p>Company details and subscription status</p></div><label className="platform-search"><AdminIcon name="search" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search companies..." /></label></div><CompanyTable companies={companies} emptyText="No companies match your search." /></section></>
}

function Subscriptions({ companies, revenue }: { companies: Company[]; revenue: number }) {
  return <><section className="platform-page-heading"><div><span className="platform-eyebrow">PLANS & REVENUE</span><h1>Subscriptions</h1><p>Review demo plan tiers and assigned company accounts.</p></div><div className="platform-revenue-total"><span>Estimated monthly recurring</span><strong>{formatMoney(revenue)}</strong></div></section><section className="platform-plan-grid">{plans.map((plan) => <article className="platform-panel platform-plan-card" key={plan.name}><div className={`platform-plan-icon ${plan.color}`}><AdminIcon name="card" /></div><span className="platform-plan-caption">{plan.caption}</span><div className="platform-plan-price"><strong>{formatMoney(plan.price)}</strong><span>/ company / month</span></div><h2>{plan.name}</h2><p>{plan.included}</p><div className="platform-plan-company-count"><b>{companies.filter((company) => company.plan === plan.name).length}</b><span>company accounts</span></div></article>)}</section><section className="platform-panel subscription-note"><strong>Billing is a preview only</strong><p>No subscription is charged or invoiced in this local prototype. Connect payment processing after backend setup.</p></section></>
}

function CompanyTable({ companies, emptyText = 'No company accounts yet.' }: { companies: Company[]; emptyText?: string }) {
  return <div className="platform-table-wrap"><table className="platform-company-table"><thead><tr><th>COMPANY</th><th>PLAN</th><th>BRANCHES</th><th>MEMBERS</th><th>STATUS</th><th>CREATED</th></tr></thead><tbody>{companies.map((company) => <tr key={company.id}><td><div className="platform-company-cell"><div className="company-monogram">{company.name.slice(0, 1).toUpperCase()}</div><div><strong>{company.name}</strong><span>{company.email}</span></div></div></td><td><span className={`platform-plan-badge plan-${company.plan.toLowerCase()}`}>{company.plan}</span></td><td>{company.branches}</td><td>{company.members.toLocaleString()}</td><td><span className={`company-status status-${company.status.toLowerCase()}`}><i />{company.status}</span></td><td>{company.created}</td></tr>)}</tbody></table>{companies.length === 0 && <div className="platform-empty">{emptyText}</div>}</div>
}

function AdminMetric({ title, value, note, icon }: { title: string; value: string; note: string; icon: 'building' | 'grid' | 'card' | 'arrow' }) {
  return <article className="platform-metric"><span className={`platform-metric-icon platform-metric-${icon}`}><AdminIcon name={icon} /></span><span className="platform-metric-title">{title}</span><strong>{value}</strong><small>{note}</small></article>
}
