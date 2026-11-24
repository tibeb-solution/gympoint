import { useEffect, useMemo, useState } from 'react'
import Auth from './Auth'
import PlatformAdmin from './PlatformAdmin'

type MemberStatus = 'Active' | 'Pending' | 'Frozen' | 'Expired'
type Page = 'Overview' | 'Members' | 'Memberships' | 'Check-in' | 'Branches' | 'Team' | 'Billing' | 'Reports' | 'Settings'
type AppSession = { email: string; role: 'platform_admin' }
type Member = {
  id: string
  name: string
  email: string
  phone: string
  plan: string
  status: MemberStatus
  joined: string
  initials: string
  color: string
}
type CheckIn = { id: string; member: string; initials: string; time: string; branch: string; status: 'Checked in' | 'Access denied' }

const initialMembers: Member[] = [
  { id: 'GF-2048', name: 'Olivia Rhye', email: 'olivia.rhye@email.com', phone: '+1 (555) 012-3345', plan: 'Unlimited annual', status: 'Active', joined: 'Jan 12, 2025', initials: 'OR', color: 'violet' },
  { id: 'GF-2047', name: 'Phoenix Baker', email: 'phoenix.baker@email.com', phone: '+1 (555) 013-8821', plan: 'Premium monthly', status: 'Active', joined: 'Feb 04, 2025', initials: 'PB', color: 'peach' },
  { id: 'GF-2046', name: 'Lana Steiner', email: 'lana.steiner@email.com', phone: '+1 (555) 014-2208', plan: 'Off-peak monthly', status: 'Pending', joined: 'Feb 16, 2025', initials: 'LS', color: 'blue' },
  { id: 'GF-2045', name: 'Demi Wilkinson', email: 'demi.wilkinson@email.com', phone: '+1 (555) 015-7610', plan: 'Unlimited annual', status: 'Active', joined: 'Mar 02, 2025', initials: 'DW', color: 'pink' },
  { id: 'GF-2044', name: 'Candice Wu', email: 'candice.wu@email.com', phone: '+1 (555) 017-0913', plan: 'Premium monthly', status: 'Frozen', joined: 'Mar 14, 2025', initials: 'CW', color: 'green' },
  { id: 'GF-2043', name: 'Natali Craig', email: 'natali.craig@email.com', phone: '+1 (555) 018-5012', plan: 'Unlimited annual', status: 'Active', joined: 'Apr 08, 2025', initials: 'NC', color: 'blue' },
  { id: 'GF-2042', name: 'Drew Cano', email: 'drew.cano@email.com', phone: '+1 (555) 019-4452', plan: 'Starter monthly', status: 'Expired', joined: 'Apr 21, 2025', initials: 'DC', color: 'yellow' },
]
const initialCheckIns: CheckIn[] = [
  { id: '1', member: 'Olivia Rhye', initials: 'OR', time: '09:42 AM', branch: 'Downtown', status: 'Checked in' },
  { id: '2', member: 'Phoenix Baker', initials: 'PB', time: '09:38 AM', branch: 'Downtown', status: 'Checked in' },
  { id: '3', member: 'Lana Steiner', initials: 'LS', time: '09:31 AM', branch: 'Downtown', status: 'Access denied' },
  { id: '4', member: 'Demi Wilkinson', initials: 'DW', time: '09:16 AM', branch: 'Downtown', status: 'Checked in' },
]
const navGroups: { label: string; pages: Page[] }[] = [
  { label: 'WORKSPACE', pages: ['Overview', 'Members', 'Memberships', 'Check-in'] },
  { label: 'MANAGE', pages: ['Branches', 'Team', 'Billing', 'Reports'] },
]
const pageIcons: Record<Page, string> = {
  Overview: 'grid', Members: 'users', Memberships: 'card', 'Check-in': 'scan',
  Branches: 'building', Team: 'user', Billing: 'receipt', Reports: 'chart', Settings: 'settings',
}
const plans = ['Unlimited annual', 'Premium monthly', 'Off-peak monthly', 'Starter monthly']
const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
const longDate = () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()
const shortDate = () => new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    card: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M7 15h3" /></>,
    scan: <><path d="M4 8V5a1 1 0 0 1 1-1h3m8 0h3a1 1 0 0 1 1 1v3m0 8v3a1 1 0 0 1-1 1h-3m-8 0H5a1 1 0 0 1-1-1v-3M4 12h16" /><path d="M8 12v4m4-4v4m4-4v4" /></>,
    building: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 21V9h6v12M7 7h.01M17 7h.01M7 11h.01M17 11h.01" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></>,
    receipt: <><path d="M4 2v20l4-2 4 2 4-2 4 2V2l-4 2-4-2-4 2-4-2Z" /><path d="M8 9h8m-8 4h8" /></>,
    chart: <><path d="M3 3v18h18M18 17V9m-5 8V5m-5 12v-5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.8 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.8-1l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.8-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.8 1l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z" transform="translate(-1 -1)" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0" /></>,
    plus: <><path d="M12 5v14m-7-7h14" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    down: <path d="m7 10 5 5 5-5" />,
    dots: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    filter: <><path d="M4 7h16M7 12h10m-7 5h4" /><circle cx="8" cy="7" r="2" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    trend: <><path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5 5 5 5-5m-5 5V3" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.grid}</svg>
}

function getStored<T,>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) as T : fallback
  } catch {
    return fallback
  }
}

function App() {
  const [session, setSession] = useState<AppSession | null>(() => getStored<AppSession | null>('gymflow-session', null))
  const [adminView, setAdminView] = useState(true)
  const [page, setPage] = useState<Page>('Overview')
  const [members, setMembers] = useState<Member[]>(() => getStored('gymflow-members', initialMembers))
  const [checkIns, setCheckIns] = useState<CheckIn[]>(() => getStored('gymflow-checkins', initialCheckIns))
  const [query, setQuery] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All status')
  const [modal, setModal] = useState<'member' | 'checkin' | null>(null)
  const [toast, setToast] = useState('')
  const [branch, setBranch] = useState('Downtown branch')
  const [mobileNav, setMobileNav] = useState(false)

  useEffect(() => { localStorage.setItem('gymflow-members', JSON.stringify(members)) }, [members])
  useEffect(() => { localStorage.setItem('gymflow-checkins', JSON.stringify(checkIns)) }, [checkIns])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const filteredMembers = useMemo(() => members.filter((member) => {
    const matchesText = `${member.name} ${member.email} ${member.id} ${member.plan}`.toLowerCase().includes(memberSearch.toLowerCase())
    return matchesText && (statusFilter === 'All status' || member.status === statusFilter)
  }), [members, memberSearch, statusFilter])

  const displayName = 'Jordan Lee'
  const totalActive = members.filter((member) => member.status === 'Active').length

  function addMember(formData: FormData) {
    const name = String(formData.get('name') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim()
    if (!name || !email) return
    const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
    const colors = ['violet', 'peach', 'blue', 'pink', 'green', 'yellow']
    const newMember: Member = {
      id: `GF-${2049 + members.length - initialMembers.length}`,
      name, email, phone: String(formData.get('phone') ?? ''),
      plan: String(formData.get('plan') ?? plans[0]), status: 'Active',
      joined: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      initials, color: colors[members.length % colors.length],
    }
    setMembers((previous) => [newMember, ...previous])
    setModal(null)
    setToast(`${name} added to your members`)
  }

  function recordCheckIn(formData: FormData) {
    const lookup = String(formData.get('member') ?? '').trim().toLowerCase()
    const found = members.find((member) => member.name.toLowerCase().includes(lookup) || member.id.toLowerCase() === lookup)
    if (!found) {
      setToast('No member found. Check the name or member ID.')
      return
    }
    const allowed = found.status === 'Active'
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    setCheckIns((previous) => [{ id: `${Date.now()}`, member: found.name, initials: found.initials, time, branch: branch.replace(' branch', ''), status: allowed ? 'Checked in' : 'Access denied' }, ...previous])
    setModal(null)
    setToast(allowed ? `Welcome in, ${found.name.split(' ')[0]}!` : `Entry denied — membership is ${found.status.toLowerCase()}.`)
  }

  function navigate(nextPage: Page) {
    setPage(nextPage)
    setMobileNav(false)
  }

  const searchedMembers = filteredMembers.filter((member) => member.name.toLowerCase().includes(query.toLowerCase()) || member.id.toLowerCase().includes(query.toLowerCase()))

  function signIn(email: string) {
    const newSession: AppSession = { email, role: 'platform_admin' }
    localStorage.setItem('gymflow-session', JSON.stringify(newSession))
    setSession(newSession)
    setAdminView(true)
  }

  function signOut() {
    localStorage.removeItem('gymflow-session')
    setSession(null)
    setAdminView(true)
  }

  if (!session) return <Auth onSuccess={signIn} />
  if (adminView) return <PlatformAdmin email={session.email} onLogout={signOut} onOpenWorkspace={() => setAdminView(false)} />

  return (
    <div className="app-shell">
      {mobileNav && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><span /></div>
          <div><strong>gymflow</strong><small>MANAGEMENT PLATFORM</small></div>
        </div>
        <div className="org-switcher">
          <div className="org-avatar">A</div>
          <div className="org-copy"><strong>Atlas Fitness</strong><span>Organization</span></div>
          <Icon name="down" size={16} />
        </div>
        <div className="branch-select">
          <span className="branch-dot" />
          <select aria-label="Choose branch" value={branch} onChange={(event) => setBranch(event.target.value)}>
            <option>Downtown branch</option><option>Westside branch</option><option>North Park branch</option>
          </select>
          <Icon name="down" size={15} />
        </div>
        <nav className="navigation">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-label">{group.label}</p>
              {group.pages.map((item) => (
                <button className={`nav-item ${page === item ? 'nav-active' : ''}`} key={item} onClick={() => navigate(item)}>
                  <Icon name={pageIcons[item]} size={19} /><span>{item}</span>
                  {item === 'Members' && <span className="nav-count">{members.length}</span>}
                </button>
              ))}
            </div>
          ))}
          <div className="nav-group">
            <p className="nav-label">PREFERENCES</p>
            <button className="nav-item" onClick={() => setAdminView(true)}><Icon name="building" size={19} /><span>Platform admin</span></button>
            <button className={`nav-item ${page === 'Settings' ? 'nav-active' : ''}`} onClick={() => navigate('Settings')}><Icon name="settings" size={19} /><span>Settings</span></button>
          </div>
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><div className="help-icon">?</div><strong>Need a hand?</strong><span>Visit our help center</span><button onClick={() => setToast('Help center will be available soon.')}>Get support <span>↗</span></button></div>
          <div className="platform-label"><span className="platform-dot" /> Powered by <b>gymflow</b></div>
          <button className="profile-button" onClick={() => navigate('Settings')}>
            <div className="avatar avatar-purple">JL</div><div className="profile-copy"><strong>{displayName}</strong><span>Organization admin</span></div><Icon name="dots" size={19} />
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileNav(true)}><span /><span /><span /></button>
          <div className="breadcrumbs"><span>Atlas Fitness</span><span className="crumb-slash">/</span><strong>{page}</strong></div>
          <div className="top-actions">
            <label className="global-search"><Icon name="search" size={18} /><input placeholder="Search anything..." value={query} onChange={(event) => { setQuery(event.target.value); if (event.target.value) setPage('Members') }} /><kbd>⌘ K</kbd></label>
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setToast('You’re all caught up!')}><Icon name="bell" size={19} /><i /></button>
            <div className="top-divider" />
            <button className="top-avatar" aria-label="Your profile" onClick={() => navigate('Settings')}>JL</button>
          </div>
        </header>

        <div className="page-content">
          {page === 'Overview' ? (
            <Dashboard
              members={members}
              totalActive={totalActive}
              checkIns={checkIns}
              onAddMember={() => setModal('member')}
              onCheckIn={() => setModal('checkin')}
              onViewMembers={() => navigate('Members')}
              onNavigate={navigate}
            />
          ) : page === 'Members' ? (
            <MembersPage members={searchedMembers} total={members.length} search={memberSearch} setSearch={setMemberSearch} status={statusFilter} setStatus={setStatusFilter} onAdd={() => setModal('member')} />
          ) : page === 'Check-in' ? (
            <CheckInPage checkIns={checkIns} onCheckIn={() => setModal('checkin')} />
          ) : (
            <ModulePage page={page} members={members} totalActive={totalActive} onNavigate={navigate} onToast={setToast} />
          )}
          <footer className="page-footer"><span>© {new Date().getFullYear()} GymFlow Technologies</span><span><i className="footer-status" /> All systems operational</span><button onClick={() => setToast('Your workspace data is stored locally in this browser.')}>Privacy &amp; security</button></footer>
        </div>
      </main>

      {modal && <Modal title={modal === 'member' ? 'Add a new member' : 'Check in a member'} subtitle={modal === 'member' ? 'Create a member profile for your gym.' : 'Search by member name or ID to validate access.'} onClose={() => setModal(null)}>
        {modal === 'member' ? (
          <form onSubmit={(event) => { event.preventDefault(); addMember(new FormData(event.currentTarget)) }} className="modal-form">
            <label>Full name<input name="name" placeholder="e.g. Alex Morgan" required autoFocus /></label>
            <label>Email address<input name="email" type="email" placeholder="alex@email.com" required /></label>
            <label>Phone number <span className="optional">(optional)</span><input name="phone" type="tel" placeholder="+1 (555) 000-0000" /></label>
            <label>Membership plan<select name="plan" defaultValue={plans[0]}>{plans.map((plan) => <option key={plan}>{plan}</option>)}</select></label>
            <div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="button button-primary"><Icon name="plus" size={17} /> Create member</button></div>
          </form>
        ) : (
          <form onSubmit={(event) => { event.preventDefault(); recordCheckIn(new FormData(event.currentTarget)) }} className="modal-form">
            <label>Member name or ID<input name="member" placeholder="Try “Olivia” or “GF-2048”" required autoFocus /></label>
            <div className="checkin-hint"><Icon name="scan" size={19} /><span>Members with an active plan can check in. Frozen, expired, or pending memberships are denied.</span></div>
            <div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="button button-primary"><Icon name="check" size={17} /> Validate &amp; check in</button></div>
          </form>
        )}
      </Modal>}
      {toast && <div className="toast"><span className="toast-check"><Icon name="check" size={15} /></span>{toast}<button aria-label="Dismiss notification" onClick={() => setToast('')}><Icon name="close" size={15} /></button></div>}
    </div>
  )
}

function Dashboard({ members, totalActive, checkIns, onAddMember, onCheckIn, onViewMembers, onNavigate }: {
  members: Member[]; totalActive: number; checkIns: CheckIn[]; onAddMember: () => void; onCheckIn: () => void; onViewMembers: () => void; onNavigate: (page: Page) => void
}) {
  return <div className="dashboard">
    <section className="welcome-row">
      <div><div className="eyebrow"><span className="eyebrow-line" /> {longDate()}</div><h1>Good morning, Jordan <span className="wave">✦</span></h1><p>Here’s what’s happening at your gym today.</p></div>
      <div className="welcome-actions"><button className="button button-outline" onClick={onCheckIn}><Icon name="scan" size={17} /> Check in</button><button className="button button-primary" onClick={onAddMember}><Icon name="plus" size={17} /> Add member</button></div>
    </section>

    <section className="metric-grid">
      <MetricCard title="Active members" value={totalActive.toLocaleString()} change="+12.8%" note="vs. last month" icon="users" tone="purple" chart="m0 21 9-7 7 3 12-12 8 5 11-7" />
      <MetricCard title="Revenue this month" value={money(24850)} change="+8.2%" note="vs. last month" icon="receipt" tone="green" chart="m0 22 8-4 8 2 10-10 9 2 12-9" />
      <MetricCard title="Today's check-ins" value={checkIns.filter((item) => item.status === 'Checked in').length.toString().padStart(2, '0')} change="+4.3%" note="vs. last week" icon="scan" tone="orange" chart="m0 22 8-8 9 5 9-10 10 5 11-10" />
      <MetricCard title="Renewals due" value="18" change="Next 7 days" note="Needs attention" icon="clock" tone="blue" chart="m0 20 8-5 9 4 9-9 10 5 11-10" quiet />
    </section>

    <section className="overview-grid">
      <div className="panel revenue-panel">
        <div className="panel-heading"><div><h2>Revenue overview</h2><p>Track how your gym is performing</p></div><button className="select-button">This month <Icon name="down" size={15} /></button></div>
        <div className="revenue-summary"><strong>$24,850</strong><span className="growth-tag"><Icon name="trend" size={14} /> 8.2%</span><small>vs. $22,950 last month</small></div>
        <div className="chart-wrap">
          <div className="chart-y-labels"><span>$30k</span><span>$20k</span><span>$10k</span><span>$0</span></div>
          <svg className="revenue-chart" viewBox="0 0 640 190" preserveAspectRatio="none" role="img" aria-label="Revenue chart, rising throughout the month">
            <defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#8057ee" stopOpacity=".16" /><stop offset="100%" stopColor="#8057ee" stopOpacity="0" /></linearGradient></defs>
            <path className="gridline" d="M0 16H640M0 66H640M0 116H640M0 166H640" />
            <path d="M0 148C24 141 31 130 53 136S83 120 107 126 134 96 160 106 192 88 213 99 241 76 267 84 297 64 320 78 347 55 373 63 400 48 427 58 451 38 480 48 504 32 533 39 559 27 586 37 612 15 640 20V180H0Z" fill="url(#chartFill)" />
            <path d="M0 148C24 141 31 130 53 136S83 120 107 126 134 96 160 106 192 88 213 99 241 76 267 84 297 64 320 78 347 55 373 63 400 48 427 58 451 38 480 48 504 32 533 39 559 27 586 37 612 15 640 20" fill="none" stroke="#7952e8" strokeWidth="3" vectorEffect="non-scaling-stroke" />
            <circle cx="640" cy="20" r="5" fill="#7952e8" stroke="white" strokeWidth="3" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
        <div className="chart-x-labels"><span>May 1</span><span>May 5</span><span>May 9</span><span>May 13</span><span>May 17</span><span>May 19</span></div>
      </div>
      <div className="panel attendance-panel">
        <div className="panel-heading"><div><h2>Attendance</h2><p>Today’s member activity</p></div><button className="more-button" aria-label="More attendance options"><Icon name="dots" /></button></div>
        <div className="attendance-total"><div className="donut"><div><strong>{checkIns.filter((item) => item.status === 'Checked in').length + 124}</strong><span>visits</span></div></div><div className="attendance-legend"><div><span className="legend-dot purple-dot" /> Members <b>82%</b></div><div><span className="legend-dot light-purple-dot" /> Day pass <b>12%</b></div><div><span className="legend-dot pale-dot" /> Guests <b>6%</b></div></div></div>
        <div className="peak-hour"><span className="peak-icon"><Icon name="clock" size={17} /></span><span><strong>Peak hour</strong><small>5:00 PM – 6:00 PM</small></span><b>32 <small>visits</small></b></div>
      </div>
    </section>

    <section className="lower-grid">
      <div className="panel members-panel">
        <div className="panel-heading"><div><h2>Recent members</h2><p>Your newest sign-ups</p></div><button className="text-button" onClick={onViewMembers}>View all <span>→</span></button></div>
        <div className="member-table-wrap">
          <table><thead><tr><th>MEMBER</th><th>PLAN</th><th>STATUS</th><th>JOINED</th><th /></tr></thead><tbody>
            {members.slice(0, 5).map((member) => <tr key={member.id}><td><div className="member-cell"><Avatar member={member} /><div><strong>{member.name}</strong><span>{member.email}</span></div></div></td><td>{member.plan}</td><td><StatusBadge status={member.status} /></td><td>{member.joined}</td><td><button className="row-menu" aria-label={`Options for ${member.name}`}><Icon name="dots" size={18} /></button></td></tr>)}
          </tbody></table>
        </div>
      </div>
      <div className="panel activity-panel">
        <div className="panel-heading"><div><h2>Recent check-ins</h2><p>Live activity at your gym</p></div><button className="text-button" onClick={() => onNavigate('Check-in')}>View all <span>→</span></button></div>
        <div className="activity-list">{checkIns.slice(0, 4).map((item) => <div className="activity-item" key={item.id}><div className={`avatar activity-avatar ${item.status === 'Access denied' ? 'avatar-muted' : ''}`}>{item.initials}</div><div className="activity-info"><strong>{item.member}</strong><span>{item.branch} <span className="activity-separator">·</span> {item.time}</span></div><span className={`activity-check ${item.status === 'Access denied' ? 'check-denied' : ''}`}>{item.status === 'Access denied' ? 'Denied' : <Icon name="check" size={15} />}</span></div>)}</div>
      </div>
    </section>
  </div>
}

function MetricCard({ title, value, change, note, icon, tone, chart, quiet = false }: { title: string; value: string; change: string; note: string; icon: string; tone: string; chart: string; quiet?: boolean }) {
  return <div className="metric-card"><div className="metric-top"><span className={`metric-icon ${tone}`}><Icon name={icon} size={19} /></span><button className="metric-more" aria-label={`${title} details`}><Icon name="dots" size={18} /></button></div><span className="metric-title">{title}</span><div className="metric-value">{value}</div><div className="metric-bottom">{quiet ? <span className="due-tag">{change}</span> : <span className="metric-change"><Icon name="trend" size={13} /> {change}</span>}<span>{note}</span><svg className={`sparkline ${tone}`} viewBox="0 0 62 32" aria-hidden="true"><path d={`${chart}V32H0Z`} opacity=".08" fill="currentColor" /><path d={chart} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div></div>
}
function Avatar({ member }: { member: Member }) { return <div className={`avatar avatar-${member.color}`}>{member.initials}</div> }
function StatusBadge({ status }: { status: MemberStatus }) { return <span className={`status-badge status-${status.toLowerCase()}`}><i />{status}</span> }

function MembersPage({ members, total, search, setSearch, status, setStatus, onAdd }: { members: Member[]; total: number; search: string; setSearch: (value: string) => void; status: string; setStatus: (value: string) => void; onAdd: () => void }) {
  return <div className="module-page"><section className="module-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> PEOPLE</div><h1>Members</h1><p>Manage your member profiles, memberships, and activity.</p></div><button className="button button-primary" onClick={onAdd}><Icon name="plus" size={17} /> Add member</button></section>
    <div className="member-stats"><div><span>Total members</span><strong>{total.toLocaleString()}</strong><small><b>+8</b> this month</small></div><div><span>Active members</span><strong>{members.filter((member) => member.status === 'Active').length}</strong><small>Across all branches</small></div><div><span>Pending renewal</span><strong>18</strong><small><b className="warning-text">Due this week</b></small></div><div><span>Avg. member value</span><strong>$68</strong><small>Per month</small></div></div>
    <div className="panel directory-panel"><div className="directory-heading"><div><h2>All members <span className="table-count">{members.length}</span></h2><p>A directory of everyone in your gym.</p></div><div className="directory-controls"><label className="table-search"><Icon name="search" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search members..." /></label><label className="filter-select"><Icon name="filter" size={16} /><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All status</option><option>Active</option><option>Pending</option><option>Frozen</option><option>Expired</option></select></label><button className="button button-outline export-button" onClick={() => window.print()}><Icon name="download" size={16} /> Export</button></div></div>
      <div className="member-table-wrap"><table className="directory-table"><thead><tr><th>MEMBER</th><th>MEMBER ID</th><th>PLAN</th><th>STATUS</th><th>JOINED DATE</th><th /></tr></thead><tbody>{members.map((member) => <tr key={member.id}><td><div className="member-cell"><Avatar member={member} /><div><strong>{member.name}</strong><span>{member.email}</span></div></div></td><td className="id-cell">{member.id}</td><td>{member.plan}</td><td><StatusBadge status={member.status} /></td><td>{member.joined}</td><td><button className="row-menu" aria-label={`Options for ${member.name}`}><Icon name="dots" size={18} /></button></td></tr>)}</tbody></table>
      {members.length === 0 && <div className="empty-state"><div><Icon name="search" size={22} /></div><strong>No members found</strong><span>Try adjusting your search or status filter.</span></div>}</div>
      <div className="pagination"><span>Showing <b>{members.length === 0 ? 0 : 1}–{members.length}</b> of <b>{members.length}</b> members</span><div><button disabled>← Previous</button><button disabled>Next →</button></div></div>
    </div>
  </div>
}

function CheckInPage({ checkIns, onCheckIn }: { checkIns: CheckIn[]; onCheckIn: () => void }) {
  const checkedIn = checkIns.filter((item) => item.status === 'Checked in').length
  return <div className="module-page"><section className="module-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> FRONT DESK</div><h1>Member check-in</h1><p>Validate membership access and see today's activity.</p></div><button className="button button-primary" onClick={onCheckIn}><Icon name="scan" size={17} /> Check in member</button></section>
    <div className="member-stats checkin-stats"><div><span>Today's visits</span><strong>{checkedIn + 124}</strong><small><b>+4.3%</b> vs. last week</small></div><div><span>Currently checked in</span><strong>{Math.max(checkedIn, 38)}</strong><small>Members in the gym</small></div><div><span>Access denied</span><strong>{checkIns.filter((item) => item.status === 'Access denied').length}</strong><small>Membership needs attention</small></div><div><span>Peak hour</span><strong>5–6 PM</strong><small>32 visits expected</small></div></div>
    <div className="panel directory-panel"><div className="directory-heading"><div><h2>Today's activity</h2><p>Check-in activity is stored on this device.</p></div><button className="select-button">Today, {shortDate()} <Icon name="down" size={15} /></button></div>
      <div className="checkin-activity-list">{checkIns.map((item) => <div className="checkin-row" key={item.id}><div className={`avatar activity-avatar ${item.status === 'Access denied' ? 'avatar-muted' : ''}`}>{item.initials}</div><div className="checkin-row-name"><strong>{item.member}</strong><span>{item.branch} branch</span></div><span className="checkin-time"><Icon name="clock" size={15} /> {item.time}</span><span className={`access-badge ${item.status === 'Access denied' ? 'access-denied' : ''}`}><i />{item.status}</span></div>)}</div>
      {checkIns.length === 0 && <div className="empty-state"><strong>No check-ins yet</strong><span>Check in the first member to see activity here.</span></div>}
    </div>
  </div>
}

function ModulePage({ page, members, totalActive, onNavigate, onToast }: { page: Page; members: Member[]; totalActive: number; onNavigate: (page: Page) => void; onToast: (message: string) => void }) {
  const copy: Record<Exclude<Page, 'Overview' | 'Members' | 'Check-in'>, { eyebrow: string; title: string; subtitle: string; primary: string; metric1: string; value1: string; metric2: string; value2: string; metric3: string; value3: string }> = {
    Memberships: { eyebrow: 'PLANS & BILLING', title: 'Memberships', subtitle: 'Build plans that keep your community moving.', primary: 'Create a plan', metric1: 'Active plans', value1: '4', metric2: 'Members enrolled', value2: `${totalActive}`, metric3: 'Monthly recurring', value3: '$18,420' },
    Branches: { eyebrow: 'YOUR ORGANIZATION', title: 'Branches', subtitle: 'Manage your locations and branch operations.', primary: 'Add branch', metric1: 'Total branches', value1: '3', metric2: 'Active members', value2: `${totalActive}`, metric3: 'Locations status', value3: 'All open' },
    Team: { eyebrow: 'PEOPLE & ACCESS', title: 'Team members', subtitle: 'Manage staff, roles, and branch permissions.', primary: 'Invite team member', metric1: 'Team members', value1: '12', metric2: 'Roles assigned', value2: '6', metric3: 'Pending invites', value3: '2' },
    Billing: { eyebrow: 'FINANCIALS', title: 'Billing & payments', subtitle: 'Track member payments, invoices, and renewals.', primary: 'Record payment', metric1: 'Collected this month', value1: '$24,850', metric2: 'Outstanding', value2: '$2,460', metric3: 'Upcoming renewals', value3: '18' },
    Reports: { eyebrow: 'INSIGHTS', title: 'Reports & analytics', subtitle: 'Understand the numbers behind your gym.', primary: 'Export report', metric1: 'Active members', value1: `${totalActive}`, metric2: 'Revenue this month', value2: '$24,850', metric3: 'Visits this month', value3: '2,408' },
    Settings: { eyebrow: 'WORKSPACE', title: 'Settings', subtitle: 'Configure your organization and workspace preferences.', primary: 'Save changes', metric1: 'Organization', value1: 'Atlas Fitness', metric2: 'Active branches', value2: '3', metric3: 'Workspace plan', value3: 'Growth' },
  }
  const details = copy[page as keyof typeof copy]
  const descriptions: Record<string, string> = {
    Memberships: 'Recurring membership options configured for your organization.',
    Branches: 'Each branch has its own team, check-ins, and daily operations.',
    Team: 'Staff access is scoped to the organization and assigned branches.',
    Billing: 'Member payments are separate from your GymFlow platform subscription.',
    Reports: 'A quick snapshot of your membership, revenue, and attendance.',
    Settings: 'Your gym identity is shown alongside GymFlow platform branding.',
  }
  return <div className="module-page"><section className="module-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> {details.eyebrow}</div><h1>{details.title}</h1><p>{details.subtitle}</p></div><button className="button button-primary" onClick={() => page === 'Reports' ? window.print() : page === 'Settings' ? onToast('Settings saved on this device.') : onToast(`${details.primary} is ready for setup.`)}>{page === 'Reports' ? <Icon name="download" size={17} /> : <Icon name="plus" size={17} />}{details.primary}</button></section>
    <div className="member-stats"><div><span>{details.metric1}</span><strong>{details.value1}</strong><small>Updated just now</small></div><div><span>{details.metric2}</span><strong>{details.value2}</strong><small>Across your organization</small></div><div><span>{details.metric3}</span><strong>{details.value3}</strong><small>Current period</small></div></div>
    {page === 'Memberships' ? <div className="plan-grid">{[{ name: 'Unlimited annual', price: '$599', cycle: '/ year', desc: 'Full access to all branches, all year round.', members: members.filter((member) => member.plan === 'Unlimited annual').length, color: 'plan-purple' }, { name: 'Premium monthly', price: '$79', cycle: '/ month', desc: 'Unlimited gym access with premium amenities.', members: members.filter((member) => member.plan === 'Premium monthly').length, color: 'plan-blue' }, { name: 'Off-peak monthly', price: '$49', cycle: '/ month', desc: 'Flexible access during off-peak hours.', members: members.filter((member) => member.plan === 'Off-peak monthly').length, color: 'plan-orange' }].map((plan) => <div className="panel plan-card" key={plan.name}><div className={`plan-icon ${plan.color}`}><Icon name="card" size={20} /></div><div className="plan-price"><strong>{plan.price}</strong><span>{plan.cycle}</span></div><h2>{plan.name}</h2><p>{plan.desc}</p><div className="plan-bottom"><span><b>{plan.members}</b> members</span><button className="row-menu" onClick={() => onToast('Plan details are stored locally for now.')}><Icon name="dots" size={18} /></button></div></div>)}</div> : page === 'Settings' ? <div className="panel settings-panel"><div className="settings-title"><div className="org-avatar large-org-avatar">A</div><div><h2>Atlas Fitness</h2><p>Organization workspace <span className="verified-tag">Active</span></p></div><button className="button button-outline" onClick={() => onToast('Logo upload will be available in a future release.')}>Upload logo</button></div><div className="settings-fields"><label>Organization name<input defaultValue="Atlas Fitness" /></label><label>Contact email<input defaultValue="hello@atlasfitness.com" /></label><label>Phone number<input defaultValue="+1 (555) 010-4444" /></label><label>Primary location<input defaultValue="125 Market Street, San Francisco, CA" /></label></div><div className="settings-brand-note"><span className="platform-dot" /> Your workspace is powered by <b>GymFlow</b>. Platform branding remains visible.</div></div> : page === 'Reports' ? <div className="report-grid"><div className="panel report-card"><div className="report-icon report-violet"><Icon name="users" /></div><h2>Membership report</h2><p>Active members, sign-ups, renewals, and cancellations.</p><div className="report-chart-bars">{[38, 54, 46, 70, 57, 82, 66, 94, 70, 100, 79, 91].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div><button className="text-button" onClick={() => onNavigate('Members')}>View members <span>→</span></button></div><div className="panel report-card"><div className="report-icon report-green"><Icon name="receipt" /></div><h2>Revenue report</h2><p>Collected payments, outstanding balances, and renewals.</p><div className="report-highlight"><strong>$24,850</strong><span><Icon name="trend" size={14} /> 8.2% this month</span></div><button className="text-button" onClick={() => onNavigate('Billing')}>View billing <span>→</span></button></div><div className="panel report-card"><div className="report-icon report-orange"><Icon name="scan" /></div><h2>Attendance report</h2><p>Daily check-ins, peak hours, and branch activity.</p><div className="report-highlight"><strong>2,408</strong><span>Visits this month</span></div><button className="text-button" onClick={() => onNavigate('Check-in')}>View check-ins <span>→</span></button></div></div> : <div className="panel module-empty"><div className="empty-illustration"><Icon name={pageIcons[page]} size={27} /></div><h2>{page === 'Branches' ? 'Your organization, all in one place' : page === 'Team' ? 'The right access for every role' : 'Your financial picture, clearly'}</h2><p>{descriptions[page]} Build a clear picture of your day-to-day operations as your gym grows.</p><div className="empty-pill-row"><span><Icon name="check" size={14} /> Organization-scoped</span><span><Icon name="check" size={14} /> Branch-ready</span><span><Icon name="check" size={14} /> Locally stored</span></div></div>}
  </div>
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" aria-label="Close dialog" onClick={onClose}><Icon name="close" size={19} /></button><div className="modal-icon"><Icon name={title.includes('check in') ? 'scan' : 'user'} size={21} /></div><h2 id="modal-title">{title}</h2><p>{subtitle}</p>{children}</section></div>
}

export default App
