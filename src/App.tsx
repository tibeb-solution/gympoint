import { useEffect, useMemo, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import Auth from './Auth'
import PlatformAdmin from './PlatformAdmin'
import { supabase } from './lib/supabase'

type MemberStatus = 'Active' | 'Pending' | 'Frozen' | 'Expired'
type Page = 'Overview' | 'Members' | 'Memberships' | 'Check-in' | 'Branches' | 'Team' | 'Billing' | 'Reports' | 'Settings'
type UserRole = 'platform_admin' | 'org_admin' | 'manager' | 'staff'
type Profile = {
  id: string
  email: string
  full_name: string
  role: UserRole
  organization_id: string | null
  branch_id: string | null
}
type Organization = {
  id: string
  name: string
  contact_email: string | null
  phone: string | null
  primary_location: string | null
  plan: string
  logo_url: string | null
}
type Branch = {
  id: string
  name: string
  is_open: boolean
}
type MembershipPlan = {
  id: string
  name: string
  price_cents: number
  billing_cycle: 'month' | 'year'
  description: string
}
type Member = {
  id: string
  member_code: string
  name: string
  email: string
  phone: string
  plan: string
  status: MemberStatus
  joined: string
  initials: string
  color: string
}
type CheckIn = {
  id: string
  member: string
  initials: string
  time: string
  branch: string
  status: 'Checked in' | 'Access denied'
}

const navGroups: { label: string; pages: Page[] }[] = [
  { label: 'WORKSPACE', pages: ['Overview', 'Members', 'Memberships', 'Check-in'] },
  { label: 'MANAGE', pages: ['Branches', 'Team', 'Billing', 'Reports'] },
]
const pageIcons: Record<Page, string> = {
  Overview: 'grid', Members: 'users', Memberships: 'card', 'Check-in': 'scan',
  Branches: 'building', Team: 'user', Billing: 'receipt', Reports: 'chart', Settings: 'settings',
}
const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
const longDate = () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()
const shortDate = () => new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

function getInitials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'GM'
}

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

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [adminView, setAdminView] = useState(true)
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState('')
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [page, setPage] = useState<Page>('Overview')
  const [query, setQuery] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All status')
  const [modal, setModal] = useState<'member' | 'checkin' | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [mobileNav, setMobileNav] = useState(false)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthReady(true)
      if (!nextSession) {
        setProfile(null)
        setOrganization(null)
        setActiveOrgId(null)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  // Load user profile once authenticated
  useEffect(() => {
    if (!session?.user) return
    let cancelled = false

    async function loadProfile() {
      let { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, organization_id, branch_id')
        .eq('id', session!.user.id)
        .maybeSingle()

      if (cancelled) return

      // If no profile exists yet, create one seamlessly
      if (!data) {
        const userEmail = session!.user.email ?? ''
        const fallbackRole = userEmail.toLowerCase() === 'aman@gmail.com' ? 'platform_admin' : 'staff'
        const { data: newProfile, error: upsertErr } = await supabase
          .from('profiles')
          .upsert({
            id: session!.user.id,
            email: userEmail,
            full_name: session!.user.user_metadata?.full_name ?? userEmail.split('@')[0] ?? 'Admin',
            role: fallbackRole,
          })
          .select('id, email, full_name, role, organization_id, branch_id')
          .single()

        if (!upsertErr && newProfile) {
          data = newProfile
        }
      }

      if (!data) {
        setToast(error?.message ?? 'Could not load user profile.')
        return
      }

      const loaded = data as Profile
      if (session?.user?.email?.toLowerCase() === 'aman@gmail.com') {
        loaded.role = 'platform_admin'
      }
      setProfile(loaded)
      setAdminView(loaded.role === 'platform_admin')
      if (loaded.organization_id) {
        setActiveOrgId(loaded.organization_id)
      } else if (loaded.role === 'platform_admin') {
        const { data: firstOrg } = await supabase
          .from('organizations')
          .select('id')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        if (!cancelled && firstOrg) setActiveOrgId(firstOrg.id)
      }
    }

    void loadProfile()
    return () => { cancelled = true }
  }, [session?.user?.id])

  // Load workspace data for the active organization
  useEffect(() => {
    if (!session?.user || !activeOrgId || adminView) return
    let cancelled = false

    async function loadWorkspace(orgId: string) {
      const [orgRes, branchRes, planRes, memberRes, checkInRes] = await Promise.all([
        supabase.from('organizations').select('id, name, contact_email, phone, primary_location, plan, logo_url').eq('id', orgId).single(),
        supabase.from('branches').select('id, name, is_open').eq('organization_id', orgId).order('created_at', { ascending: true }),
        supabase.from('membership_plans').select('id, name, price_cents, billing_cycle, description').eq('organization_id', orgId).eq('is_active', true).order('price_cents', { ascending: false }),
        supabase.from('members').select('id, member_code, full_name, email, phone, plan_name, status, avatar_color, joined_at').eq('organization_id', orgId).order('joined_at', { ascending: false }),
        supabase.from('check_ins').select('id, status, checked_in_at, members(full_name), branches(name)').eq('organization_id', orgId).order('checked_in_at', { ascending: false }).limit(50),
      ])

      if (cancelled) return

      if (orgRes.data) setOrganization(orgRes.data as Organization)

      if (branchRes.data) {
        const list = branchRes.data as Branch[]
        setBranches(list)
        setSelectedBranchId((prev) => (list.some((b) => b.id === prev) ? prev : (list[0]?.id ?? '')))
      }

      if (planRes.data) setMembershipPlans(planRes.data as MembershipPlan[])

      if (memberRes.data) {
        setMembers(
          memberRes.data.map((m) => ({
            id: m.id,
            member_code: m.member_code,
            name: m.full_name,
            email: m.email,
            phone: m.phone,
            plan: m.plan_name,
            status: m.status as MemberStatus,
            joined: new Date(m.joined_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
            initials: getInitials(m.full_name),
            color: m.avatar_color,
          })),
        )
      }

      if (checkInRes.data) {
        setCheckIns(
          checkInRes.data.map((row) => {
            const memberObj = Array.isArray(row.members) ? row.members[0] : row.members
            const branchObj = Array.isArray(row.branches) ? row.branches[0] : row.branches
            const memberName = (memberObj as { full_name?: string } | null)?.full_name ?? 'Member'
            const branchName = (branchObj as { name?: string } | null)?.name ?? 'Main'
            return {
              id: row.id,
              member: memberName,
              initials: getInitials(memberName),
              time: new Date(row.checked_in_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              branch: branchName.replace(' branch', ''),
              status: row.status as CheckIn['status'],
            }
          }),
        )
      }
    }

    void loadWorkspace(activeOrgId)
    return () => { cancelled = true }
  }, [session?.user?.id, activeOrgId, adminView])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const filteredMembers = useMemo(
    () =>
      members.filter((member) => {
        const matchesText = `${member.name} ${member.email} ${member.member_code} ${member.plan}`
          .toLowerCase()
          .includes(memberSearch.toLowerCase())
        return matchesText && (statusFilter === 'All status' || member.status === statusFilter)
      }),
    [members, memberSearch, statusFilter],
  )

  const displayName = profile?.full_name || session?.user.email?.split('@')[0] || 'Admin'
  const totalActive = members.filter((member) => member.status === 'Active').length
  const selectedBranch = branches.find((b) => b.id === selectedBranchId) ?? branches[0]
  const orgName = organization?.name ?? 'Gym Workspace'

  async function addMember(formData: FormData) {
    if (!activeOrgId) return
    const name = String(formData.get('name') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim()
    if (!name || !email) return

    const planName = String(formData.get('plan') ?? membershipPlans[0]?.name ?? 'Unlimited annual')
    const matchedPlan = membershipPlans.find((p) => p.name === planName)
    const colors = ['violet', 'peach', 'blue', 'pink', 'green', 'yellow']
    const color = colors[members.length % colors.length]

    setSaving(true)
    const { data, error } = await supabase
      .from('members')
      .insert({
        organization_id: activeOrgId,
        home_branch_id: selectedBranch?.id ?? null,
        membership_plan_id: matchedPlan?.id ?? null,
        full_name: name,
        email,
        phone: String(formData.get('phone') ?? '').trim(),
        plan_name: planName,
        status: 'Active',
        avatar_color: color,
      })
      .select('id, member_code, full_name, email, phone, plan_name, status, avatar_color, joined_at')
      .single()

    setSaving(false)
    if (error || !data) {
      setToast(error?.message ?? 'Could not add member.')
      return
    }

    const newMember: Member = {
      id: data.id,
      member_code: data.member_code,
      name: data.full_name,
      email: data.email,
      phone: data.phone,
      plan: data.plan_name,
      status: data.status as MemberStatus,
      joined: new Date(data.joined_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      initials: getInitials(data.full_name),
      color: data.avatar_color,
    }
    setMembers((previous) => [newMember, ...previous])
    setModal(null)
    setToast(`${name} added to your members`)
  }

  async function recordCheckIn(formData: FormData) {
    if (!activeOrgId || !selectedBranch) {
      setToast('Select a branch before checking in a member.')
      return
    }
    const lookup = String(formData.get('member') ?? '').trim()
    if (!lookup) return

    setSaving(true)
    const { data, error } = await supabase.rpc('record_check_in', {
      p_organization_id: activeOrgId,
      p_branch_id: selectedBranch.id,
      p_lookup: lookup,
    })
    setSaving(false)

    if (error) {
      setToast(error.message)
      return
    }

    const row = Array.isArray(data) ? data[0] : data
    if (!row) {
      setToast('No member found. Check the name or member ID.')
      return
    }

    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    const nextItem: CheckIn = {
      id: row.check_in_id,
      member: row.member_name,
      initials: getInitials(row.member_name),
      time,
      branch: selectedBranch.name.replace(' branch', ''),
      status: row.check_in_status as CheckIn['status'],
    }

    setCheckIns((previous) => [nextItem, ...previous])
    setModal(null)
    setToast(
      row.check_in_status === 'Checked in'
        ? `Welcome in, ${String(row.member_name).split(' ')[0]}!`
        : `Entry denied — membership is ${String(row.member_status).toLowerCase()}.`,
    )
  }

  async function saveOrgSettings(fields: { name: string; contact_email: string; phone: string; primary_location: string; logo_url?: string | null }) {
    if (!activeOrgId) return
    setSaving(true)
    const { data, error } = await supabase
      .from('organizations')
      .update(fields)
      .eq('id', activeOrgId)
      .select('id, name, contact_email, phone, primary_location, plan, logo_url')
      .single()
    setSaving(false)

    if (error || !data) {
      setToast(error?.message ?? 'Could not save organization settings.')
      return
    }
    setOrganization(data as Organization)
    setToast('Organization settings saved.')
  }

  function navigate(nextPage: Page) {
    setPage(nextPage)
    setMobileNav(false)
  }

  const searchedMembers = filteredMembers.filter(
    (member) =>
      member.name.toLowerCase().includes(query.toLowerCase()) ||
      member.member_code.toLowerCase().includes(query.toLowerCase()),
  )

  async function signOut() {
    await supabase.auth.signOut()
  }

  const isPlatformAdmin = profile?.role === 'platform_admin' || session?.user?.email?.toLowerCase() === 'aman@gmail.com'

  if (!authReady) return null
  if (!session) return <Auth />
  if (adminView && isPlatformAdmin) {
    return (
      <PlatformAdmin
        email={profile?.email || session.user.email || 'aman@gmail.com'}
        fullName={profile?.full_name || 'Aman'}
        onLogout={() => void signOut()}
        onOpenWorkspace={(orgId) => {
          if (orgId) setActiveOrgId(orgId)
          setAdminView(false)
        }}
      />
    )
  }

  return (
    <div className="app-shell">
      {mobileNav && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><img src="/gympoint-icon.png" alt="GymPoint logo" /></div>
          <div><strong>gympoint</strong><small>MANAGEMENT PLATFORM</small></div>
        </div>
        <div className="org-switcher">
          <div className="org-avatar" style={organization?.logo_url ? { overflow: 'hidden', padding: 0 } : undefined}>
            {organization?.logo_url ? (
              <img src={organization.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              orgName.slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="org-copy"><strong>{orgName}</strong><span>Organization</span></div>
          <Icon name="down" size={16} />
        </div>
        <div className="branch-select">
          <span className="branch-dot" />
          <select aria-label="Choose branch" value={selectedBranchId} onChange={(event) => setSelectedBranchId(event.target.value)}>
            {branches.length === 0 ? <option value="">No branches</option> : branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
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
            {isPlatformAdmin && (
              <button className="nav-item nav-item-admin" onClick={() => setAdminView(true)}>
                <Icon name="building" size={19} /><span>Platform admin</span>
              </button>
            )}
            <button className={`nav-item ${page === 'Settings' ? 'nav-active' : ''}`} onClick={() => navigate('Settings')}><Icon name="settings" size={19} /><span>Settings</span></button>
            <button className="nav-item" onClick={() => void signOut()}><Icon name="arrow" size={19} /><span>Sign out</span></button>
          </div>
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><div className="help-icon">?</div><strong>Need a hand?</strong><span>Visit our help center</span><button onClick={() => setToast('Help center will be available soon.')}>Get support <span>↗</span></button></div>
          <div className="platform-label"><span className="platform-dot" /> Powered by <b>gympoint</b></div>
          <button className="profile-button" onClick={() => isPlatformAdmin ? setAdminView(true) : navigate('Settings')}>
            <div className="avatar avatar-purple">{getInitials(displayName)}</div>
            <div className="profile-copy">
              <strong>{displayName}</strong>
              <span>{isPlatformAdmin ? 'Platform super-admin' : 'Organization admin'}</span>
            </div>
            <Icon name="dots" size={19} />
          </button>
        </div>
      </aside>

      <main className="main-area">
        {isPlatformAdmin && (
          <div className="preview-banner-bar">
            <span>
              <span className="preview-banner-dot" />
              Workspace preview mode: <strong>{orgName}</strong>
            </span>
            <button className="preview-banner-btn" onClick={() => setAdminView(true)}>
              ← Back to Platform Admin
            </button>
          </div>
        )}
        <header className="topbar">
          <button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileNav(true)}><span /><span /><span /></button>
          <div className="breadcrumbs"><span>{orgName}</span><span className="crumb-slash">/</span><strong>{page}</strong></div>
          {isPlatformAdmin && (
            <button className="topbar-return-admin" onClick={() => setAdminView(true)} title="Return to Platform Administration">
              <Icon name="building" size={15} /> Back to Platform Admin
            </button>
          )}
          <div className="top-actions">
            <label className="global-search"><Icon name="search" size={18} /><input placeholder="Search anything..." value={query} onChange={(event) => { setQuery(event.target.value); if (event.target.value) setPage('Members') }} /><kbd>⌘ K</kbd></label>
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setToast('You’re all caught up!')}><Icon name="bell" size={19} /><i /></button>
            <div className="top-divider" />
            <button className="top-avatar" aria-label="Your profile" onClick={() => navigate('Settings')}>{getInitials(displayName)}</button>
          </div>
        </header>

        <div className="page-content">
          {page === 'Overview' ? (
            <Dashboard
              firstName={displayName.split(' ')[0]}
              members={members}
              totalActive={totalActive}
              checkIns={checkIns}
              membershipPlans={membershipPlans}
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
            <ModulePage
              page={page}
              organization={organization}
              branches={branches}
              plans={membershipPlans}
              members={members}
              totalActive={totalActive}
              saving={saving}
              onSaveSettings={(fields) => void saveOrgSettings(fields)}
              onNavigate={navigate}
              onToast={setToast}
            />
          )}
          <footer className="page-footer"><span>© {new Date().getFullYear()} GymPoint Technologies</span><span><i className="footer-status" /> Connected to Supabase</span><button onClick={() => setToast('Your workspace data is synced with Supabase.')}>Privacy &amp; security</button></footer>
        </div>
      </main>

      {modal && (
        <Modal
          title={modal === 'member' ? 'Add a new member' : 'Check in a member'}
          subtitle={modal === 'member' ? 'Create a member profile for your gym.' : 'Search by member name or ID to validate access.'}
          onClose={() => setModal(null)}
        >
          {modal === 'member' ? (
            <form onSubmit={(event) => { event.preventDefault(); void addMember(new FormData(event.currentTarget)) }} className="modal-form">
              <label>Full name<input name="name" placeholder="e.g. Alex Morgan" required autoFocus /></label>
              <label>Email address<input name="email" type="email" placeholder="alex@email.com" required /></label>
              <label>Phone number <span className="optional">(optional)</span><input name="phone" type="tel" placeholder="+1 (555) 000-0000" /></label>
              <label>Membership plan
                <select name="plan" defaultValue={membershipPlans[0]?.name ?? 'Unlimited annual'}>
                  {(membershipPlans.length > 0 ? membershipPlans.map((p) => p.name) : ['Unlimited annual', 'Premium monthly', 'Off-peak monthly', 'Starter monthly']).map((plan) => <option key={plan}>{plan}</option>)}
                </select>
              </label>
              <div className="modal-actions">
                <button type="button" className="button button-outline" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="button button-primary" disabled={saving}><Icon name="plus" size={17} /> {saving ? 'Saving...' : 'Create member'}</button>
              </div>
            </form>
          ) : (
            <form onSubmit={(event) => { event.preventDefault(); void recordCheckIn(new FormData(event.currentTarget)) }} className="modal-form">
              <label>Member name or ID<input name="member" placeholder="Try “Olivia” or “GP-2048”" required autoFocus /></label>
              <div className="checkin-hint"><Icon name="scan" size={19} /><span>Members with an active plan can check in. Frozen, expired, or pending memberships are denied.</span></div>
              <div className="modal-actions">
                <button type="button" className="button button-outline" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="button button-primary" disabled={saving}><Icon name="check" size={17} /> {saving ? 'Checking...' : 'Validate & check in'}</button>
              </div>
            </form>
          )}
        </Modal>
      )}
      {toast && <div className="toast"><span className="toast-check"><Icon name="check" size={15} /></span>{toast}<button aria-label="Dismiss notification" onClick={() => setToast('')}><Icon name="close" size={15} /></button></div>}
    </div>
  )
}

function Dashboard({
  firstName,
  members,
  totalActive,
  checkIns,
  membershipPlans,
  onAddMember,
  onCheckIn,
  onViewMembers,
  onNavigate,
}: {
  firstName: string
  members: Member[]
  totalActive: number
  checkIns: CheckIn[]
  membershipPlans: MembershipPlan[]
  onAddMember: () => void
  onCheckIn: () => void
  onViewMembers: () => void
  onNavigate: (page: Page) => void
}) {
  const monthlyRevenue = useMemo(() => {
    return members
      .filter((m) => m.status === 'Active')
      .reduce((sum, m) => {
        const plan = membershipPlans.find((p) => p.name === m.plan)
        if (!plan) return sum
        const rate = plan.billing_cycle === 'year' ? plan.price_cents / 100 / 12 : plan.price_cents / 100
        return sum + rate
      }, 0)
  }, [members, membershipPlans])

  const renewalsDue = useMemo(() => {
    return members.filter((m) => m.status === 'Pending' || m.status === 'Expired').length
  }, [members])

  const todayCheckedIn = useMemo(() => {
    return checkIns.filter((item) => item.status === 'Checked in').length
  }, [checkIns])

  return (
    <div className="dashboard">
      <section className="welcome-row">
        <div><div className="eyebrow"><span className="eyebrow-line" /> {longDate()}</div><h1>Good morning, {firstName} <span className="wave">✦</span></h1><p>Here’s what’s happening at your gym today.</p></div>
        <div className="welcome-actions"><button className="button button-outline" onClick={onCheckIn}><Icon name="scan" size={17} /> Check in</button><button className="button button-primary" onClick={onAddMember}><Icon name="plus" size={17} /> Add member</button></div>
      </section>

      <section className="metric-grid">
        <MetricCard
          title="Active members"
          value={totalActive.toLocaleString()}
          change={totalActive > 0 ? `${totalActive} active` : '0 active'}
          note={members.length > 0 ? `Out of ${members.length} members` : 'No members yet'}
          icon="users"
          tone="purple"
          chart="m0 21 9-7 7 3 12-12 8 5 11-7"
        />
        <MetricCard
          title="Revenue this month"
          value={money(monthlyRevenue)}
          change={monthlyRevenue > 0 ? `${totalActive} paying` : '—'}
          note={monthlyRevenue > 0 ? 'Monthly recurring' : 'No revenue recorded'}
          icon="receipt"
          tone="green"
          chart="m0 22 8-4 8 2 10-10 9 2 12-9"
        />
        <MetricCard
          title="Today's check-ins"
          value={todayCheckedIn.toString().padStart(2, '0')}
          change={todayCheckedIn > 0 ? `${todayCheckedIn} visits` : '—'}
          note={checkIns.length > 0 ? `${checkIns.length} total scanned` : 'No visits today'}
          icon="scan"
          tone="orange"
          chart="m0 22 8-8 9 5 9-10 10 5 11-10"
        />
        <MetricCard
          title="Renewals due"
          value={renewalsDue.toString()}
          change={renewalsDue > 0 ? `${renewalsDue} due` : 'All clear'}
          note={renewalsDue > 0 ? 'Needs attention' : 'All accounts current'}
          icon="clock"
          tone="blue"
          chart="m0 20 8-5 9 4 9-9 10 5 11-10"
          quiet
        />
      </section>

      <section className="overview-grid">
        <div className="panel revenue-panel">
          <div className="panel-heading"><div><h2>Revenue overview</h2><p>Track how your gym is performing</p></div><button className="select-button">This month <Icon name="down" size={15} /></button></div>
          <div className="revenue-summary">
            <strong>{money(monthlyRevenue)}</strong>
            {monthlyRevenue > 0 && <span className="growth-tag"><Icon name="trend" size={14} /> Active</span>}
            <small>{monthlyRevenue > 0 ? `Across ${totalActive} active membership(s)` : 'No active membership revenue recorded yet'}</small>
          </div>
          <div className="chart-wrap">
            {monthlyRevenue > 0 ? (
              <>
                <div className="chart-y-labels">
                  <span>{money(Math.round(monthlyRevenue * 1.2))}</span>
                  <span>{money(Math.round(monthlyRevenue * 0.8))}</span>
                  <span>{money(Math.round(monthlyRevenue * 0.4))}</span>
                  <span>$0</span>
                </div>
                <svg className="revenue-chart" viewBox="0 0 640 190" preserveAspectRatio="none" role="img" aria-label="Revenue chart">
                  <defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#8057ee" stopOpacity=".16" /><stop offset="100%" stopColor="#8057ee" stopOpacity="0" /></linearGradient></defs>
                  <path className="gridline" d="M0 16H640M0 66H640M0 116H640M0 166H640" />
                  <path d="M0 148C24 141 31 130 53 136S83 120 107 126 134 96 160 106 192 88 213 99 241 76 267 84 297 64 320 78 347 55 373 63 400 48 427 58 451 38 480 48 504 32 533 39 559 27 586 37 612 15 640 20V180H0Z" fill="url(#chartFill)" />
                  <path d="M0 148C24 141 31 130 53 136S83 120 107 126 134 96 160 106 192 88 213 99 241 76 267 84 297 64 320 78 347 55 373 63 400 48 427 58 451 38 480 48 504 32 533 39 559 27 586 37 612 15 640 20" fill="none" stroke="#7952e8" strokeWidth="3" vectorEffect="non-scaling-stroke" />
                  <circle cx="640" cy="20" r="5" fill="#7952e8" stroke="white" strokeWidth="3" vectorEffect="non-scaling-stroke" />
                </svg>
              </>
            ) : (
              <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#92949d', fontSize: '12px' }}>
                <span>Add members with active plans to see recurring revenue trends.</span>
              </div>
            )}
          </div>
          <div className="chart-x-labels"><span>Week 1</span><span>Week 2</span><span>Week 3</span><span>Week 4</span></div>
        </div>
        <div className="panel attendance-panel">
          <div className="panel-heading"><div><h2>Attendance</h2><p>Today’s member activity</p></div><button className="more-button" aria-label="More attendance options"><Icon name="dots" /></button></div>
          <div className="attendance-total">
            <div className="donut"><div><strong>{todayCheckedIn}</strong><span>visits</span></div></div>
            <div className="attendance-legend">
              <div><span className="legend-dot purple-dot" /> Verified <b>{todayCheckedIn}</b></div>
              <div><span className="legend-dot pale-dot" /> Denied <b>{checkIns.filter((item) => item.status === 'Access denied').length}</b></div>
            </div>
          </div>
          <div className="peak-hour">
            <span className="peak-icon"><Icon name="clock" size={17} /></span>
            <span><strong>Latest check-in</strong><small>{checkIns[0]?.time ?? 'No visits today'}</small></span>
            <b>{todayCheckedIn} <small>visits</small></b>
          </div>
        </div>
      </section>

      <section className="lower-grid">
        <div className="panel members-panel">
          <div className="panel-heading"><div><h2>Recent members</h2><p>Your newest sign-ups</p></div><button className="text-button" onClick={onViewMembers}>View all <span>→</span></button></div>
          <div className="member-table-wrap">
            <table><thead><tr><th>MEMBER</th><th>PLAN</th><th>STATUS</th><th>JOINED</th><th /></tr></thead><tbody>
              {members.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#92949d' }}>No members registered yet. Click &quot;Add member&quot; to get started.</td></tr>
              ) : (
                members.slice(0, 5).map((member) => <tr key={member.id}><td><div className="member-cell"><Avatar member={member} /><div><strong>{member.name}</strong><span>{member.email}</span></div></div></td><td>{member.plan}</td><td><StatusBadge status={member.status} /></td><td>{member.joined}</td><td><button className="row-menu" aria-label={`Options for ${member.name}`}><Icon name="dots" size={18} /></button></td></tr>)
              )}
            </tbody></table>
          </div>
        </div>
        <div className="panel activity-panel">
          <div className="panel-heading"><div><h2>Recent check-ins</h2><p>Live activity at your gym</p></div><button className="text-button" onClick={() => onNavigate('Check-in')}>View all <span>→</span></button></div>
          <div className="activity-list">
            {checkIns.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px', color: '#92949d', fontSize: '12px' }}>No check-in activity recorded yet today.</div>
            ) : (
              checkIns.slice(0, 4).map((item) => <div className="activity-item" key={item.id}><div className={`avatar activity-avatar ${item.status === 'Access denied' ? 'avatar-muted' : ''}`}>{item.initials}</div><div className="activity-info"><strong>{item.member}</strong><span>{item.branch} <span className="activity-separator">·</span> {item.time}</span></div><span className={`activity-check ${item.status === 'Access denied' ? 'check-denied' : ''}`}>{item.status === 'Access denied' ? 'Denied' : <Icon name="check" size={15} />}</span></div>)
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function MetricCard({ title, value, change, note, icon, tone, chart, quiet = false }: { title: string; value: string; change: string; note: string; icon: string; tone: string; chart: string; quiet?: boolean }) {
  return <div className="metric-card"><div className="metric-top"><span className={`metric-icon ${tone}`}><Icon name={icon} size={19} /></span><button className="metric-more" aria-label={`${title} details`}><Icon name="dots" size={18} /></button></div><span className="metric-title">{title}</span><div className="metric-value">{value}</div><div className="metric-bottom">{quiet ? <span className="due-tag">{change}</span> : <span className="metric-change"><Icon name="trend" size={13} /> {change}</span>}<span>{note}</span><svg className={`sparkline ${tone}`} viewBox="0 0 62 32" aria-hidden="true"><path d={`${chart}V32H0Z`} opacity=".08" fill="currentColor" /><path d={chart} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div></div>
}
function Avatar({ member }: { member: Member }) { return <div className={`avatar avatar-${member.color}`}>{member.initials}</div> }
function StatusBadge({ status }: { status: MemberStatus }) { return <span className={`status-badge status-${status.toLowerCase()}`}><i />{status}</span> }

function MembersPage({ members, total, search, setSearch, status, setStatus, onAdd }: { members: Member[]; total: number; search: string; setSearch: (value: string) => void; status: string; setStatus: (value: string) => void; onAdd: () => void }) {
  const renewals = members.filter((member) => member.status === 'Pending' || member.status === 'Expired').length
  return (
    <div className="module-page">
      <section className="module-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> PEOPLE</div><h1>Members</h1><p>Manage your member profiles, memberships, and activity.</p></div><button className="button button-primary" onClick={onAdd}><Icon name="plus" size={17} /> Add member</button></section>
      <div className="member-stats">
        <div><span>Total members</span><strong>{total.toLocaleString()}</strong><small><b>Synced</b> in Supabase</small></div>
        <div><span>Active members</span><strong>{members.filter((member) => member.status === 'Active').length}</strong><small>Across all branches</small></div>
        <div><span>Pending renewal</span><strong>{renewals}</strong><small><b className={renewals > 0 ? 'warning-text' : ''}>{renewals > 0 ? 'Needs attention' : 'All clear'}</b></small></div>
        <div><span>Directory total</span><strong>{members.length}</strong><small>Filtered records</small></div>
      </div>
      <div className="panel directory-panel">
        <div className="directory-heading"><div><h2>All members <span className="table-count">{members.length}</span></h2><p>A directory of everyone in your gym.</p></div><div className="directory-controls"><label className="table-search"><Icon name="search" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search members..." /></label><label className="filter-select"><Icon name="filter" size={16} /><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All status</option><option>Active</option><option>Pending</option><option>Frozen</option><option>Expired</option></select></label><button className="button button-outline export-button" onClick={() => window.print()}><Icon name="download" size={16} /> Export</button></div></div>
        <div className="member-table-wrap">
          <table className="directory-table">
            <thead><tr><th>MEMBER</th><th>MEMBER ID</th><th>PLAN</th><th>STATUS</th><th>JOINED DATE</th><th /></tr></thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td><div className="member-cell"><Avatar member={member} /><div><strong>{member.name}</strong><span>{member.email}</span></div></div></td>
                  <td className="id-cell">{member.member_code}</td>
                  <td>{member.plan}</td>
                  <td><StatusBadge status={member.status} /></td>
                  <td>{member.joined}</td>
                  <td><button className="row-menu" aria-label={`Options for ${member.name}`}><Icon name="dots" size={18} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {members.length === 0 && <div className="empty-state"><div><Icon name="search" size={22} /></div><strong>No members found</strong><span>Try adjusting your search or status filter.</span></div>}
        </div>
        <div className="pagination"><span>Showing <b>{members.length === 0 ? 0 : 1}–{members.length}</b> of <b>{members.length}</b> members</span><div><button disabled>← Previous</button><button disabled>Next →</button></div></div>
      </div>
    </div>
  )
}

function CheckInPage({ checkIns, onCheckIn }: { checkIns: CheckIn[]; onCheckIn: () => void }) {
  const checkedIn = checkIns.filter((item) => item.status === 'Checked in').length
  return (
    <div className="module-page">
      <section className="module-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> FRONT DESK</div><h1>Member check-in</h1><p>Validate membership access and see today's activity.</p></div><button className="button button-primary" onClick={onCheckIn}><Icon name="scan" size={17} /> Check in member</button></section>
      <div className="member-stats checkin-stats"><div><span>Today's visits</span><strong>{checkedIn}</strong><small>Recorded in Supabase</small></div><div><span>Currently checked in</span><strong>{checkedIn}</strong><small>Members in the gym</small></div><div><span>Access denied</span><strong>{checkIns.filter((item) => item.status === 'Access denied').length}</strong><small>Membership needs attention</small></div><div><span>Total activity</span><strong>{checkIns.length}</strong><small>Logged entries</small></div></div>
      <div className="panel directory-panel">
        <div className="directory-heading"><div><h2>Today's activity</h2><p>Live check-in log stored in Supabase.</p></div><button className="select-button">Today, {shortDate()} <Icon name="down" size={15} /></button></div>
        <div className="checkin-activity-list">{checkIns.map((item) => <div className="checkin-row" key={item.id}><div className={`avatar activity-avatar ${item.status === 'Access denied' ? 'avatar-muted' : ''}`}>{item.initials}</div><div className="checkin-row-name"><strong>{item.member}</strong><span>{item.branch} branch</span></div><span className="checkin-time"><Icon name="clock" size={15} /> {item.time}</span><span className={`access-badge ${item.status === 'Access denied' ? 'access-denied' : ''}`}><i />{item.status}</span></div>)}</div>
        {checkIns.length === 0 && <div className="empty-state"><strong>No check-ins yet</strong><span>Check in the first member to see activity here.</span></div>}
      </div>
    </div>
  )
}

function ModulePage({
  page,
  organization,
  branches,
  plans,
  members,
  totalActive,
  saving,
  onSaveSettings,
  onNavigate,
  onToast,
}: {
  page: Page
  organization: Organization | null
  branches: Branch[]
  plans: MembershipPlan[]
  members: Member[]
  totalActive: number
  saving: boolean
  onSaveSettings: (fields: { name: string; contact_email: string; phone: string; primary_location: string; logo_url?: string | null }) => void
  onNavigate: (page: Page) => void
  onToast: (message: string) => void
}) {
  const [orgName, setOrgName] = useState(organization?.name ?? '')
  const [contactEmail, setContactEmail] = useState(organization?.contact_email ?? '')
  const [phone, setPhone] = useState(organization?.phone ?? '')
  const [location, setLocation] = useState(organization?.primary_location ?? '')
  const [logoUrl, setLogoUrl] = useState<string | null>(organization?.logo_url ?? null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setOrgName(organization?.name ?? '')
    setContactEmail(organization?.contact_email ?? '')
    setPhone(organization?.phone ?? '')
    setLocation(organization?.primary_location ?? '')
    setLogoUrl(organization?.logo_url ?? null)
  }, [organization])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      onToast('Logo file size must be under 2MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      setLogoUrl(result)
      onSaveSettings({
        name: orgName,
        contact_email: contactEmail,
        phone,
        primary_location: location,
        logo_url: result,
      })
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveLogo = () => {
    setLogoUrl(null)
    onSaveSettings({
      name: orgName,
      contact_email: contactEmail,
      phone,
      primary_location: location,
      logo_url: null,
    })
  }

  const monthlyRevenue = useMemo(() => {
    return members
      .filter((m) => m.status === 'Active')
      .reduce((sum, m) => {
        const plan = plans.find((p) => p.name === m.plan)
        if (!plan) return sum
        const rate = plan.billing_cycle === 'year' ? plan.price_cents / 100 / 12 : plan.price_cents / 100
        return sum + rate
      }, 0)
  }, [members, plans])

  const renewalsDue = useMemo(() => {
    return members.filter((m) => m.status === 'Pending' || m.status === 'Expired').length
  }, [members])

  const copy: Record<Exclude<Page, 'Overview' | 'Members' | 'Check-in'>, { eyebrow: string; title: string; subtitle: string; primary: string; metric1: string; value1: string; metric2: string; value2: string; metric3: string; value3: string }> = {
    Memberships: { eyebrow: 'PLANS & BILLING', title: 'Memberships', subtitle: 'Build plans that keep your community moving.', primary: 'Create a plan', metric1: 'Active plans', value1: `${plans.length}`, metric2: 'Members enrolled', value2: `${totalActive}`, metric3: 'Monthly recurring', value3: money(monthlyRevenue) },
    Branches: { eyebrow: 'YOUR ORGANIZATION', title: 'Branches', subtitle: 'Manage your locations and branch operations.', primary: 'Add branch', metric1: 'Total branches', value1: `${branches.length}`, metric2: 'Active members', value2: `${totalActive}`, metric3: 'Locations status', value3: branches.length === 0 ? 'No branches' : branches.every((b) => b.is_open) ? 'All open' : 'Mixed' },
    Team: { eyebrow: 'PEOPLE & ACCESS', title: 'Team members', subtitle: 'Manage staff, roles, and branch permissions.', primary: 'Invite team member', metric1: 'Team members', value1: '1', metric2: 'Roles assigned', value2: '1', metric3: 'Pending invites', value3: '0' },
    Billing: { eyebrow: 'FINANCIALS', title: 'Billing & payments', subtitle: 'Track member payments, invoices, and renewals.', primary: 'Record payment', metric1: 'Monthly recurring', value1: money(monthlyRevenue), metric2: 'Outstanding', value2: '$0', metric3: 'Upcoming renewals', value3: `${renewalsDue}` },
    Reports: { eyebrow: 'INSIGHTS', title: 'Reports & analytics', subtitle: 'Understand the numbers behind your gym.', primary: 'Export report', metric1: 'Active members', value1: `${totalActive}`, metric2: 'Monthly recurring', value2: money(monthlyRevenue), metric3: 'Active plans', value3: `${plans.length}` },
    Settings: { eyebrow: 'WORKSPACE', title: 'Settings', subtitle: 'Configure your organization and workspace preferences.', primary: saving ? 'Saving...' : 'Save changes', metric1: 'Organization', value1: organization?.name ?? '—', metric2: 'Active branches', value2: `${branches.length}`, metric3: 'Workspace plan', value3: organization?.plan ?? 'Starter' },
  }
  const details = copy[page as keyof typeof copy]
  const descriptions: Record<string, string> = {
    Memberships: 'Recurring membership options configured for your organization.',
    Branches: 'Each branch has its own team, check-ins, and daily operations.',
    Team: 'Staff access is scoped to the organization and assigned branches.',
    Billing: 'Member payments are separate from your GymPoint platform subscription.',
    Reports: 'A quick snapshot of your membership, revenue, and attendance.',
    Settings: 'Your gym identity is shown alongside GymPoint platform branding.',
  }
  const planColors = ['plan-purple', 'plan-blue', 'plan-orange']

  return (
    <div className="module-page">
      <section className="module-heading">
        <div><div className="eyebrow"><span className="eyebrow-line" /> {details.eyebrow}</div><h1>{details.title}</h1><p>{details.subtitle}</p></div>
        <button
          className="button button-primary"
          disabled={page === 'Settings' && saving}
          onClick={() =>
            page === 'Reports'
              ? window.print()
              : page === 'Settings'
                ? onSaveSettings({ name: orgName, contact_email: contactEmail, phone, primary_location: location, logo_url: logoUrl })
                : onToast(`${details.primary} is ready for setup.`)
          }
        >
          {page === 'Reports' ? <Icon name="download" size={17} /> : <Icon name="plus" size={17} />}
          {details.primary}
        </button>
      </section>
      <div className="member-stats"><div><span>{details.metric1}</span><strong>{details.value1}</strong><small>Updated just now</small></div><div><span>{details.metric2}</span><strong>{details.value2}</strong><small>Across your organization</small></div><div><span>{details.metric3}</span><strong>{details.value3}</strong><small>Current period</small></div></div>
      {page === 'Memberships' ? (
        <div className="plan-grid">
          {plans.map((plan, index) => (
            <div className="panel plan-card" key={plan.id}>
              <div className={`plan-icon ${planColors[index % planColors.length]}`}><Icon name="card" size={20} /></div>
              <div className="plan-price"><strong>{money(plan.price_cents / 100)}</strong><span>/ {plan.billing_cycle}</span></div>
              <h2>{plan.name}</h2>
              <p>{plan.description}</p>
              <div className="plan-bottom">
                <span><b>{members.filter((member) => member.plan === plan.name).length}</b> members</span>
                <button className="row-menu" onClick={() => onToast('Plan loaded from Supabase.')}><Icon name="dots" size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      ) : page === 'Settings' ? (
        <div className="panel settings-panel">
          <div className="settings-title">
            <div className="org-avatar large-org-avatar" style={logoUrl ? { overflow: 'hidden', padding: 0 } : undefined}>
              {logoUrl ? (
                <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (orgName || 'G').slice(0, 1).toUpperCase()
              )}
            </div>
            <div><h2>{orgName || 'Organization'}</h2><p>Organization workspace <span className="verified-tag">Active</span></p></div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button className="button button-outline" onClick={() => fileInputRef.current?.click()}>
              {logoUrl ? 'Change logo' : 'Upload logo'}
            </button>
            {logoUrl && (
              <button className="button button-outline" style={{ marginLeft: 8 }} onClick={handleRemoveLogo}>
                Remove
              </button>
            )}
          </div>
          <div className="settings-fields">
            <label>Organization name<input value={orgName} onChange={(e) => setOrgName(e.target.value)} /></label>
            <label>Contact email<input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></label>
            <label>Phone number<input value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
            <label>Primary location<input value={location} onChange={(e) => setLocation(e.target.value)} /></label>
          </div>
          <div className="settings-brand-note"><span className="platform-dot" /> Your workspace is powered by <b>GymPoint</b>. Platform branding remains visible.</div>
        </div>
      ) : page === 'Reports' ? (
        <div className="report-grid">
          <div className="panel report-card"><div className="report-icon report-violet"><Icon name="users" /></div><h2>Membership report</h2><p>Active members, sign-ups, renewals, and cancellations.</p><div className="report-chart-bars">{[38, 54, 46, 70, 57, 82, 66, 94, 70, 100, 79, 91].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div><button className="text-button" onClick={() => onNavigate('Members')}>View members <span>→</span></button></div>
          <div className="panel report-card"><div className="report-icon report-green"><Icon name="receipt" /></div><h2>Revenue report</h2><p>Collected payments, outstanding balances, and renewals.</p><div className="report-highlight"><strong>{money(monthlyRevenue)}</strong><span><Icon name="trend" size={14} /> Monthly estimate</span></div><button className="text-button" onClick={() => onNavigate('Billing')}>View billing <span>→</span></button></div>
          <div className="panel report-card"><div className="report-icon report-orange"><Icon name="scan" /></div><h2>Attendance report</h2><p>Daily check-ins, peak hours, and branch activity.</p><div className="report-highlight"><strong>{totalActive}</strong><span>Active members</span></div><button className="text-button" onClick={() => onNavigate('Check-in')}>View check-ins <span>→</span></button></div>
        </div>
      ) : (
        <div className="panel module-empty">
          <div className="empty-illustration"><Icon name={pageIcons[page]} size={27} /></div>
          <h2>{page === 'Branches' ? 'Your organization, all in one place' : page === 'Team' ? 'The right access for every role' : 'Your financial picture, clearly'}</h2>
          <p>{descriptions[page]} Build a clear picture of your day-to-day operations as your gym grows.</p>
          <div className="empty-pill-row"><span><Icon name="check" size={14} /> Organization-scoped</span><span><Icon name="check" size={14} /> Branch-ready</span><span><Icon name="check" size={14} /> Supabase RLS</span></div>
        </div>
      )}
    </div>
  )
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" aria-label="Close dialog" onClick={onClose}><Icon name="close" size={19} /></button><div className="modal-icon"><Icon name={title.includes('check in') ? 'scan' : 'user'} size={21} /></div><h2 id="modal-title">{title}</h2><p>{subtitle}</p>{children}</section></div>
}

export default App
