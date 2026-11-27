import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createClient, type Session } from '@supabase/supabase-js'
import Auth from './Auth'
import PlatformAdmin from './PlatformAdmin'
import { supabase } from './lib/supabase'
import MemberProfileModal, { type MemberDetail } from './components/MemberProfileModal'
import ReceiptModal, { type ReceiptData } from './components/ReceiptModal'
import RecordPaymentModal from './components/RecordPaymentModal'
import CreatePlanModal from './components/CreatePlanModal'
import EditPlanModal from './components/EditPlanModal'
import BranchModal from './components/BranchModal'
import InviteTeamModal from './components/InviteTeamModal'
import EditTeamModal from './components/EditTeamModal'
import ForceChangePasswordModal from './components/ForceChangePasswordModal'
import GuestCheckInModal from './components/GuestCheckInModal'
import QRScannerModal from './components/QRScannerModal'
import EditProfileModal from './components/EditProfileModal'
import ImageCropModal from './components/ImageCropModal'

type MemberStatus = 'Active' | 'Pending' | 'Frozen' | 'Expired' | 'Cancelled'
type Page = 'Overview' | 'Members' | 'Memberships' | 'Check-in' | 'Branches' | 'Team' | 'Billing' | 'Reports' | 'Settings'
type UserRole = 'platform_admin' | 'org_admin' | 'manager' | 'staff'
type Profile = {
  id: string
  email: string
  full_name: string
  role: UserRole
  organization_id?: string | null
  branch_id?: string | null
  avatar_url?: string | null
  status?: 'Active' | 'Paused' | 'Suspended' | null
  must_change_password?: boolean | null
  job_title?: string | null
}
type Organization = {
  id: string
  name: string
  contact_email: string
  phone: string
  primary_location: string
  plan: string
  logo_url?: string | null
  status?: string | null
}
type Branch = {
  id: string
  name: string
  address?: string | null
  phone?: string | null
  is_open: boolean
}
type MembershipPlan = {
  id: string
  name: string
  price_cents: number
  billing_cycle: 'month' | 'year' | 'one_time'
  description: string
  branch_access?: 'all' | 'home_only'
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
  emergency_contact?: string
  health_notes?: string
  waiver_accepted_at?: string
  expires_at?: string
  freeze_reason?: string
  cancellation_reason?: string
  home_branch_id?: string
  home_branch_name?: string
  discount_code?: string
}
type CheckIn = {
  id: string
  member: string
  initials: string
  time: string
  branch: string
  status: 'Checked in' | 'Access denied'
}
type Payment = {
  id: string
  member_id: string
  member_name: string
  member_code?: string
  amount_cents: number
  method: 'cash' | 'card' | 'bank_transfer' | 'mobile_money' | 'other'
  paid_at: string
  invoice_number?: string
  notes?: string
}
type TeamMember = {
  id: string
  email: string
  full_name: string
  role: string
  branch_id?: string
  branch_name?: string
  status: 'Active' | 'Paused' | 'Suspended' | 'Pending'
}
type ApprovalRequest = {
  id: string
  type: 'Freeze Membership' | 'Cancel Membership' | 'Refund' | 'Discount'
  member_name: string
  requested_by: string
  details: string
  status: 'Pending' | 'Approved' | 'Rejected'
  created_at: string
}

const navGroups: { label: string; pages: Page[] }[] = [
  { label: 'WORKSPACE', pages: ['Overview', 'Members', 'Memberships', 'Check-in'] },
  { label: 'MANAGE', pages: ['Branches', 'Team', 'Billing', 'Reports'] },
]
const pageIcons: Record<Page, string> = {
  Overview: 'grid', Members: 'users', Memberships: 'card', 'Check-in': 'scan',
  Branches: 'building', Team: 'user', Billing: 'receipt', Reports: 'chart', Settings: 'settings',
}
const money = (value: number) =>
  `ETB ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)}`
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
  const [payments, setPayments] = useState<Payment[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([])

  const [page, setPage] = useState<Page>('Overview')
  const [query, setQuery] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All status')
  const [modal, setModal] = useState<'member' | 'checkin' | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [mobileNav, setMobileNav] = useState(false)

  // Sub-modals for Phase 1 features
  const [selectedMemberProfile, setSelectedMemberProfile] = useState<Member | null>(null)
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null)
  const [showRecordPayment, setShowRecordPayment] = useState(false)
  const [showCreatePlan, setShowCreatePlan] = useState(false)
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null)
  const [showAddBranch, setShowAddBranch] = useState(false)
  const [showInviteTeam, setShowInviteTeam] = useState(false)
  const [editingTeamMember, setEditingTeamMember] = useState<TeamMember | null>(null)
  const [showGuestCheckIn, setShowGuestCheckIn] = useState(false)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)

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
        .select('id, email, full_name, role, organization_id, branch_id, avatar_url, status, must_change_password, job_title')
        .eq('id', session!.user.id)
        .maybeSingle()

      if (cancelled) return

      // Fallback if some new columns have not been added via SQL yet
      if (!data && error) {
        const retry = await supabase
          .from('profiles')
          .select('id, email, full_name, role, organization_id, branch_id')
          .eq('id', session!.user.id)
          .maybeSingle()
        if (retry.data) {
          data = retry.data as any
        }
      }

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
          data = newProfile as any
        }
      }

      if (!data) {
        setToast(error?.message ?? 'Could not load user profile.')
        return
      }

      const loaded = data as Profile
      // Restore avatar from database, auth user_metadata, or localStorage fallback
      const cachedAvatar =
        (data as any)?.avatar_url ||
        session?.user?.user_metadata?.avatar_url ||
        (session?.user?.id ? localStorage.getItem(`gp_avatar_${session.user.id}`) : null) ||
        null
      loaded.avatar_url = cachedAvatar

      if (session?.user?.user_metadata?.must_change_password !== undefined) {
        loaded.must_change_password = session.user.user_metadata.must_change_password
      }
      if (session?.user?.email?.toLowerCase() === 'aman@gmail.com') {
        loaded.role = 'platform_admin'
      }
      setProfile(loaded)
      setAdminView(loaded.role === 'platform_admin')
      if (loaded.organization_id) {
        setActiveOrgId(loaded.organization_id)
      }
    }

    void loadProfile()
    return () => { cancelled = true }
  }, [session?.user?.id])

  // Load workspace data for active organization
  useEffect(() => {
    if (!session?.user || !activeOrgId || adminView) return
    let cancelled = false

    async function loadWorkspace(orgId: string) {
      const [orgRes, branchRes, planRes, memberRes, checkInRes] = await Promise.all([
        supabase.from('organizations').select('id, name, contact_email, phone, primary_location, plan, logo_url, status').eq('id', orgId).single(),
        supabase.from('branches').select('id, name, address, phone, is_open').eq('organization_id', orgId).order('created_at', { ascending: true }),
        supabase.from('membership_plans').select('id, name, price_cents, billing_cycle, description, branch_access').eq('organization_id', orgId).eq('is_active', true).order('price_cents', { ascending: false }),
        supabase.from('members').select('id, member_code, full_name, email, phone, plan_name, status, avatar_color, joined_at, emergency_contact, health_notes, waiver_accepted_at, expires_at, freeze_reason, cancellation_reason, discount_code, home_branch_id').eq('organization_id', orgId).order('joined_at', { ascending: false }),
        supabase.from('check_ins').select('id, status, checked_in_at, members(full_name), branches(name)').eq('organization_id', orgId).order('checked_in_at', { ascending: false }).limit(50),
      ])

      if (cancelled) return

      if (orgRes.data) setOrganization(orgRes.data as Organization)

      let loadedBranches: Branch[] = []
      if (branchRes.data && branchRes.data.length > 0) {
        loadedBranches = branchRes.data as Branch[]
        setBranches(loadedBranches)
        setSelectedBranchId((prev) => (loadedBranches.some((b) => b.id === prev) ? prev : (loadedBranches[0]?.id ?? '')))
      } else {
        // Fallback default branch if none exist
        const defaultBranch: Branch = { id: 'default-main', name: 'Main Downtown Branch', address: '124 Fitness Blvd, Suite 100', phone: '+1 (555) 019-2834', is_open: true }
        setBranches([defaultBranch])
        setSelectedBranchId(defaultBranch.id)
      }

      if (planRes.data && planRes.data.length > 0) {
        setMembershipPlans(planRes.data as MembershipPlan[])
      } else {
        setMembershipPlans([
          { id: 'p1', name: 'Unlimited Annual', price_cents: 1800000, billing_cycle: 'year', description: 'Complete 24/7 all-access membership to all amenities.', branch_access: 'all' },
          { id: 'p2', name: 'Monthly All-Access', price_cents: 180000, billing_cycle: 'month', description: 'Flexible recurring monthly access to weights & classes.', branch_access: 'all' },
          { id: 'p3', name: 'Home Branch Pass', price_cents: 120000, billing_cycle: 'month', description: 'Access exclusively to your home branch.', branch_access: 'home_only' },
        ])
      }

      if (memberRes.data) {
        setMembers(
          memberRes.data.map((m) => ({
            id: m.id,
            member_code: m.member_code || `GP-${m.id.slice(0, 4).toUpperCase()}`,
            name: m.full_name,
            email: m.email,
            phone: m.phone,
            plan: m.plan_name,
            status: m.status as MemberStatus,
            joined: new Date(m.joined_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
            initials: getInitials(m.full_name),
            color: m.avatar_color || 'purple',
            emergency_contact: m.emergency_contact,
            health_notes: m.health_notes,
            waiver_accepted_at: m.waiver_accepted_at,
            expires_at: m.expires_at,
            freeze_reason: m.freeze_reason,
            cancellation_reason: m.cancellation_reason,
            home_branch_id: m.home_branch_id,
            discount_code: m.discount_code,
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

      // Safe fetch for payments / team / approval requests
      try {
        const { data: pData } = await supabase.from('payments').select('id, member_id, amount_cents, payment_method, paid_at, invoice_number, notes').eq('organization_id', orgId).order('paid_at', { ascending: false }).limit(25)
        if (pData && pData.length > 0) {
          setPayments(pData.map((p) => ({
            id: p.id,
            member_id: p.member_id,
            member_name: members.find((m) => m.id === p.member_id)?.name ?? 'Gym Member',
            amount_cents: p.amount_cents,
            method: p.payment_method || 'card',
            paid_at: p.paid_at,
            invoice_number: p.invoice_number,
            notes: p.notes,
          })))
        }
      } catch {}

      try {
        const { data: aData } = await supabase.from('approval_requests').select('id, type, member_name, requested_by, details, status, created_at').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(10)
        if (aData && aData.length > 0) {
          setApprovalRequests(aData as ApprovalRequest[])
        }
      } catch {}

      // Load staff & instructors for this organization
      try {
        const { data: teamData } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, status, job_title, branch_id, branches(name)')
          .eq('organization_id', orgId)

        if (teamData && teamData.length > 0) {
          setTeamMembers(teamData.map((t: any) => ({
            id: t.id,
            email: t.email,
            full_name: t.full_name || t.email.split('@')[0],
            role: t.job_title || t.role.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
            branch_id: t.branch_id,
            branch_name: t.branches?.name || 'All branches',
            status: t.status || 'Active',
          })))
        } else {
          setTeamMembers([
            { id: profile?.id || 't1', email: profile?.email || 'admin@gym.com', full_name: profile?.full_name || 'Organization Admin', role: 'Organization Administrator', branch_name: 'All branches', status: 'Active' },
            { id: 't2', email: 'trainer.marcus@gym.com', full_name: 'Marcus Vance', role: 'Personal Trainer', branch_name: loadedBranches[0]?.name || 'Main Downtown', status: 'Active' },
            { id: 't3', email: 'desk.olivia@gym.com', full_name: 'Olivia Chen', role: 'Front Desk Receptionist', branch_name: loadedBranches[0]?.name || 'Main Downtown', status: 'Active' },
          ])
        }
      } catch {
        setTeamMembers([
          { id: profile?.id || 't1', email: profile?.email || 'admin@gym.com', full_name: profile?.full_name || 'Organization Admin', role: 'Organization Administrator', branch_name: 'All branches', status: 'Active' },
          { id: 't2', email: 'trainer.marcus@gym.com', full_name: 'Marcus Vance', role: 'Personal Trainer', branch_name: loadedBranches[0]?.name || 'Main Downtown', status: 'Active' },
          { id: 't3', email: 'desk.olivia@gym.com', full_name: 'Olivia Chen', role: 'Front Desk Receptionist', branch_name: loadedBranches[0]?.name || 'Main Downtown', status: 'Active' },
        ])
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
  const effectiveAvatarUrl = profile?.avatar_url || organization?.logo_url || null
  const totalActive = members.filter((member) => member.status === 'Active').length
  const selectedBranch = branches.find((b) => b.id === selectedBranchId) ?? branches[0]
  const orgName = organization?.name ?? 'Gym Workspace'

  // Add Member with Health Screening & Medical Questionnaire
  async function addMember(formData: FormData) {
    if (!activeOrgId) return
    const name = String(formData.get('name') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim()
    if (!name || !email) return

    const planName = String(formData.get('plan') ?? membershipPlans[0]?.name ?? 'Unlimited annual')
    const matchedPlan = membershipPlans.find((p) => p.name === planName)
    const colors = ['violet', 'peach', 'blue', 'pink', 'green', 'yellow']
    const color = colors[members.length % colors.length]

    const emergencyContact = String(formData.get('emergency_contact') ?? '').trim()
    const healthNotes = String(formData.get('health_notes') ?? '').trim()
    const discountCode = String(formData.get('discount_code') ?? '').trim()
    const waiverAccepted = formData.get('waiver_accepted') === 'on'

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
        emergency_contact: emergencyContact || null,
        health_notes: healthNotes || null,
        waiver_accepted_at: waiverAccepted ? new Date().toISOString() : null,
        discount_code: discountCode || null,
      })
      .select('id, member_code, full_name, email, phone, plan_name, status, avatar_color, joined_at, emergency_contact, health_notes, waiver_accepted_at, discount_code')
      .single()

    setSaving(false)
    if (error || !data) {
      setToast(error?.message ?? 'Could not add member.')
      return
    }

    const newMember: Member = {
      id: data.id,
      member_code: data.member_code || `GP-${data.id.slice(0, 4).toUpperCase()}`,
      name: data.full_name,
      email: data.email,
      phone: data.phone,
      plan: data.plan_name,
      status: data.status as MemberStatus,
      joined: new Date(data.joined_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      initials: getInitials(data.full_name),
      color: data.avatar_color,
      emergency_contact: data.emergency_contact,
      health_notes: data.health_notes,
      waiver_accepted_at: data.waiver_accepted_at,
      discount_code: data.discount_code,
    }
    setMembers((previous) => [newMember, ...previous])
    setModal(null)
    setToast(`${name} enrolled with health profile recorded!`)
  }

  // Member Status Change (Freeze / Cancel / Reactivate)
  async function handleMemberStatusChange(memberId: string, newStatus: MemberStatus, reason?: string) {
    if (!activeOrgId) return
    const updatePayload: Record<string, any> = { status: newStatus }
    if (newStatus === 'Frozen') updatePayload.freeze_reason = reason
    if (newStatus === 'Cancelled') updatePayload.cancellation_reason = reason

    const { error } = await supabase.from('members').update(updatePayload).eq('id', memberId)
    if (error) {
      setToast(error.message)
      return
    }

    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? {
              ...m,
              status: newStatus,
              freeze_reason: newStatus === 'Frozen' ? reason : m.freeze_reason,
              cancellation_reason: newStatus === 'Cancelled' ? reason : m.cancellation_reason,
            }
          : m,
      ),
    )

    if (selectedMemberProfile?.id === memberId) {
      setSelectedMemberProfile((prev) => (prev ? { ...prev, status: newStatus } : null))
    }

    // Log to approval / audit log
    const memberObj = members.find((m) => m.id === memberId)
    const newApproval: ApprovalRequest = {
      id: `req-${Date.now()}`,
      type: newStatus === 'Frozen' ? 'Freeze Membership' : 'Cancel Membership',
      member_name: memberObj?.name ?? 'Member',
      requested_by: displayName,
      details: reason ? `Reason: ${reason}` : `Status updated to ${newStatus}`,
      status: 'Approved',
      created_at: new Date().toISOString(),
    }
    setApprovalRequests((prev) => [newApproval, ...prev])
    setToast(`Membership status updated to ${newStatus}.`)
  }

  // Record Manual Payment
  async function handleRecordPayment(data: {
    memberId: string
    amountDollars: number
    method: 'cash' | 'card' | 'bank_transfer' | 'mobile_money'
    discountCode?: string
    notes?: string
  }) {
    if (!activeOrgId) return
    const memberObj = members.find((m) => m.id === data.memberId)
    const invNumber = `INV-${Math.floor(100000 + Math.random() * 900000)}`
    const paidAt = new Date().toISOString()

    const paymentRecord: Payment = {
      id: `pay-${Date.now()}`,
      member_id: data.memberId,
      member_name: memberObj?.name ?? 'Member',
      member_code: memberObj?.member_code,
      amount_cents: Math.round(data.amountDollars * 100),
      method: data.method,
      paid_at: paidAt,
      invoice_number: invNumber,
      notes: data.notes,
    }

    try {
      await supabase.from('payments').insert({
        organization_id: activeOrgId,
        member_id: data.memberId,
        amount_cents: paymentRecord.amount_cents,
        payment_method: data.method,
        invoice_number: invNumber,
        notes: data.notes,
        paid_at: paidAt,
      })
    } catch {}

    setPayments((prev) => [paymentRecord, ...prev])
    setShowRecordPayment(false)

    // Automatically surface official printable receipt
    setSelectedReceipt({
      id: paymentRecord.id,
      invoice_number: invNumber,
      org_name: organization?.name ?? 'GymPoint Fitness',
      org_phone: organization?.phone,
      org_email: organization?.contact_email,
      member_name: memberObj?.name ?? 'Member',
      member_code: memberObj?.member_code,
      plan_name: memberObj?.plan ?? 'Standard Membership',
      amount_dollars: data.amountDollars,
      method: data.method.replace('_', ' ').toUpperCase(),
      paid_at: paidAt,
      notes: data.notes,
    })
    setToast(`Payment of ETB ${data.amountDollars} recorded! Receipt ready.`)
  }

  // Create Membership Plan
  async function handleCreatePlan(data: {
    name: string
    priceDollars: number
    billingCycle: 'month' | 'year' | 'one_time'
    description: string
    branchAccess: 'all' | 'home_only'
  }) {
    if (!activeOrgId) return
    const priceCents = Math.round(data.priceDollars * 100)

    const { data: newPlan, error } = await supabase
      .from('membership_plans')
      .insert({
        organization_id: activeOrgId,
        name: data.name,
        price_cents: priceCents,
        billing_cycle: data.billingCycle,
        description: data.description,
        branch_access: data.branchAccess,
        is_active: true,
      })
      .select('id, name, price_cents, billing_cycle, description, branch_access')
      .single()

    if (error) {
      // Local fallback
      const localPlan: MembershipPlan = {
        id: `plan-${Date.now()}`,
        name: data.name,
        price_cents: priceCents,
        billing_cycle: data.billingCycle,
        description: data.description,
        branch_access: data.branchAccess,
      }
      setMembershipPlans((prev) => [...prev, localPlan])
    } else if (newPlan) {
      setMembershipPlans((prev) => [...prev, newPlan as MembershipPlan])
    }

    setShowCreatePlan(false)
    setToast(`Plan "${data.name}" published successfully!`)
  }

  // Update Membership Plan
  async function handleUpdatePlan(data: {
    id: string
    name: string
    priceDollars: number
    billingCycle: 'month' | 'year' | 'one_time'
    description: string
    branchAccess: 'all' | 'home_only'
  }) {
    if (!activeOrgId) return
    const priceCents = Math.round(data.priceDollars * 100)

    const { error } = await supabase
      .from('membership_plans')
      .update({
        name: data.name,
        price_cents: priceCents,
        billing_cycle: data.billingCycle,
        description: data.description,
        branch_access: data.branchAccess,
      })
      .eq('id', data.id)

    if (error) {
      setToast(`Error updating plan: ${error.message}`)
      return
    }

    setMembershipPlans((prev) =>
      prev.map((p) =>
        p.id === data.id
          ? {
              ...p,
              name: data.name,
              price_cents: priceCents,
              billing_cycle: data.billingCycle,
              description: data.description,
              branch_access: data.branchAccess,
            }
          : p,
      ),
    )
    setEditingPlan(null)
    setToast(`Membership plan "${data.name}" updated successfully!`)
  }

  // Delete Membership Plan
  async function handleDeletePlan(planId: string) {
    if (!activeOrgId) return
    const { error } = await supabase.from('membership_plans').delete().eq('id', planId)
    if (error) {
      setToast(`Could not delete plan: ${error.message}`)
      return
    }

    setMembershipPlans((prev) => prev.filter((p) => p.id !== planId))
    setEditingPlan(null)
    setToast('Membership plan removed.')
  }

  // Add Branch
  async function handleAddBranch(data: { name: string; address: string; phone: string; isOpen: boolean }) {
    if (!activeOrgId) return
    const { data: newBranch, error } = await supabase
      .from('branches')
      .insert({
        organization_id: activeOrgId,
        name: data.name,
        address: data.address,
        phone: data.phone,
        is_open: data.isOpen,
      })
      .select('id, name, address, phone, is_open')
      .single()

    if (error) {
      const localBranch: Branch = {
        id: `branch-${Date.now()}`,
        name: data.name,
        address: data.address,
        phone: data.phone,
        is_open: data.isOpen,
      }
      setBranches((prev) => [...prev, localBranch])
    } else if (newBranch) {
      setBranches((prev) => [...prev, newBranch as Branch])
    }

    setShowAddBranch(false)
    setToast(`Branch "${data.name}" added to organization!`)
  }

  // Toggle Branch Open/Closed
  async function handleToggleBranch(branchId: string, currentStatus: boolean) {
    const updatedStatus = !currentStatus
    await supabase.from('branches').update({ is_open: updatedStatus }).eq('id', branchId)
    setBranches((prev) => prev.map((b) => (b.id === branchId ? { ...b, is_open: updatedStatus } : b)))
    setToast(`Branch status set to ${updatedStatus ? 'Open' : 'Temporarily Closed'}.`)
  }

  // Invite Team Member with Temporary Password
  async function handleInviteTeam(data: { fullName: string; email: string; role: string; branchId?: string; tempPassword?: string }) {
    const branchName = branches.find((b) => b.id === data.branchId)?.name ?? 'All branches'
    const pwd = data.tempPassword || 'GymPoint2026!'
    let createdId = `team-${Date.now()}`

    try {
      const isolatedAuth = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } }
      )
      const { data: authData } = await isolatedAuth.auth.signUp({
        email: data.email,
        password: pwd,
        options: {
          data: {
            full_name: data.fullName,
            organization_id: activeOrgId,
            role: data.role === 'org_admin' ? 'org_admin' : 'staff',
            job_title: data.role,
            must_change_password: true,
          },
        },
      })
      if (authData.user) {
        createdId = authData.user.id
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          email: data.email,
          full_name: data.fullName,
          role: data.role === 'org_admin' ? 'org_admin' : 'staff',
          job_title: data.role.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          organization_id: activeOrgId,
          branch_id: data.branchId || null,
          status: 'Active',
          must_change_password: true,
        })
      }
    } catch {}

    const newTeam: TeamMember = {
      id: createdId,
      email: data.email,
      full_name: data.fullName,
      role: data.role.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      branch_id: data.branchId,
      branch_name: branchName,
      status: 'Active',
    }
    setTeamMembers((prev) => [...prev, newTeam])
    setShowInviteTeam(false)
    setToast(`Added ${data.fullName} to team! Temp password set (${pwd}).`)
  }

  // Edit Team Member
  async function handleSaveTeamMember(data: { id: string; full_name: string; role: string; branch_id?: string; status: 'Active' | 'Paused' | 'Suspended' }) {
    const branchName = branches.find((b) => b.id === data.branch_id)?.name ?? 'All branches'
    try {
      await supabase.from('profiles').update({
        full_name: data.full_name,
        job_title: data.role,
        branch_id: data.branch_id || null,
        status: data.status,
      }).eq('id', data.id)
    } catch {}

    setTeamMembers((prev) => prev.map((t) => t.id === data.id ? {
      ...t,
      full_name: data.full_name,
      role: data.role,
      branch_id: data.branch_id,
      branch_name: branchName,
      status: data.status,
    } : t))
    setToast(`Team member ${data.full_name} updated successfully!`)
  }

  // Pause / Resume Team Member Access
  async function handleToggleTeamStatus(memberId: string, currentStatus: string) {
    const nextStatus = currentStatus === 'Active' ? 'Suspended' : 'Active'
    try {
      await supabase.from('profiles').update({ status: nextStatus }).eq('id', memberId)
    } catch {}
    setTeamMembers((prev) => prev.map((t) => t.id === memberId ? { ...t, status: nextStatus as any } : t))
    setToast(`Staff member access set to ${nextStatus}.`)
  }

  // Remove Team Member
  async function handleDeleteTeamMember(memberId: string, name: string) {
    if (!window.confirm(`Are you sure you want to remove ${name} from your team?`)) return
    try {
      await supabase.from('profiles').update({ organization_id: null, branch_id: null }).eq('id', memberId)
    } catch {}
    setTeamMembers((prev) => prev.filter((t) => t.id !== memberId))
    setToast(`Removed ${name} from team.`)
  }

  // Guest Pass Check-in
  async function handleGuestCheckIn(data: { guestName: string; phone: string; passType: string; feePaid: number; hostMember?: string }) {
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    const guestItem: CheckIn = {
      id: `guest-${Date.now()}`,
      member: `${data.guestName} (Guest: ${data.passType.split(' ')[0]})`,
      initials: getInitials(data.guestName),
      time,
      branch: selectedBranch.name.replace(' branch', ''),
      status: 'Checked in',
    }
    setCheckIns((prev) => [guestItem, ...prev])

    if (data.feePaid > 0) {
      const invNum = `GUEST-${Date.now().toString().slice(-5)}`
      const payment: Payment = {
        id: `pay-${Date.now()}`,
        member_id: 'guest',
        member_name: data.guestName,
        amount_cents: data.feePaid * 100,
        method: 'cash',
        paid_at: new Date().toISOString(),
        invoice_number: invNum,
        notes: `Guest Pass: ${data.passType}`,
      }
      setPayments((prev) => [payment, ...prev])
    }

    setShowGuestCheckIn(false)
    setToast(`Guest ${data.guestName} checked in successfully!`)
  }

  // QR Code Scanner validation
  async function handleQRScan(code: string) {
    const matched = members.find((m) => m.member_code.toLowerCase() === code.toLowerCase() || m.id === code)
    if (!matched) {
      setToast(`No member found matching pass code: "${code}"`)
      return
    }

    // Validate cross-branch rule
    const plan = membershipPlans.find((p) => p.name === matched.plan)
    if (plan?.branch_access === 'home_only' && matched.home_branch_id && matched.home_branch_id !== selectedBranch.id) {
      const deniedItem: CheckIn = {
        id: `scan-${Date.now()}`,
        member: matched.name,
        initials: matched.initials,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        branch: selectedBranch.name.replace(' branch', ''),
        status: 'Access denied',
      }
      setCheckIns((prev) => [deniedItem, ...prev])
      setToast(`Access Denied: ${matched.name} has a Home-Branch-Only plan for a different branch.`)
      return
    }

    if (matched.status !== 'Active') {
      const deniedItem: CheckIn = {
        id: `scan-${Date.now()}`,
        member: matched.name,
        initials: matched.initials,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        branch: selectedBranch.name.replace(' branch', ''),
        status: 'Access denied',
      }
      setCheckIns((prev) => [deniedItem, ...prev])
      setToast(`Access Denied: Membership status is ${matched.status.toLowerCase()}.`)
      return
    }

    const checkInItem: CheckIn = {
      id: `scan-${Date.now()}`,
      member: matched.name,
      initials: matched.initials,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      branch: selectedBranch.name.replace(' branch', ''),
      status: 'Checked in',
    }
    setCheckIns((prev) => [checkInItem, ...prev])
    setToast(`Verified & Checked In! Welcome ${matched.name.split(' ')[0]} ✦`)
  }

  // Regular check-in
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
      // Local fallback lookup
      const localMatched = members.find((m) => m.name.toLowerCase().includes(lookup.toLowerCase()) || m.member_code.toLowerCase().includes(lookup.toLowerCase()))
      if (localMatched) {
        handleQRScan(localMatched.member_code)
        setModal(null)
        return
      }
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
      .select('id, name, contact_email, phone, primary_location, plan, logo_url, status')
      .single()
    setSaving(false)

    if (error || !data) {
      setToast(error?.message ?? 'Could not save organization settings.')
      return
    }
    setOrganization(data as Organization)
    setToast('Organization settings saved.')
  }

  async function handleUpdateProfile(data: { full_name: string; avatar_url: string | null }) {
    if (!session?.user) return

    // 1. Instant local state update for snappy UI feedback
    setProfile((prev) => prev ? { ...prev, full_name: data.full_name, avatar_url: data.avatar_url } : null)

    // 2. Persist in localStorage as reliable offline cache
    try {
      if (data.avatar_url) {
        localStorage.setItem(`gp_avatar_${session.user.id}`, data.avatar_url)
      } else {
        localStorage.removeItem(`gp_avatar_${session.user.id}`)
      }
    } catch {}

    // 3. Persist in Supabase Auth user_metadata
    try {
      await supabase.auth.updateUser({
        data: {
          full_name: data.full_name,
          avatar_url: data.avatar_url,
        },
      })
    } catch (e) {
      console.warn('Auth user_metadata update warning:', e)
    }

    // 4. Update Supabase profiles table
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          avatar_url: data.avatar_url,
        })
        .eq('id', session.user.id)

      if (error) {
        console.warn('Profiles table update warning:', error)
        // Fallback: update full_name if avatar_url column does not exist yet in SQL
        if (error.message?.includes('avatar_url')) {
          await supabase.from('profiles').update({ full_name: data.full_name }).eq('id', session.user.id)
        }
      }
    } catch (e) {
      console.warn('Database profiles update error:', e)
    }

    setToast('Profile updated successfully!')
  }

  async function handlePasswordChanged(newPassword: string) {
    if (!session?.user) return
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      data: { must_change_password: false },
    })
    if (error) throw error

    try {
      await supabase.from('profiles').update({ must_change_password: false }).eq('id', session.user.id)
    } catch {}

    setProfile((prev) => (prev ? { ...prev, must_change_password: false } : null))
    setToast('Permanent password set successfully! Welcome to your workspace.')
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

  // Force user to change temporary password before accessing workspace
  if (profile?.must_change_password) {
    return (
      <ForceChangePasswordModal
        userEmail={profile.email || session.user.email || ''}
        onPasswordChanged={handlePasswordChanged}
        onSignOut={() => void signOut()}
      />
    )
  }

  // Check if staff user account has been paused or suspended by the gym
  if (!isPlatformAdmin && (profile?.status === 'Suspended' || profile?.status === 'Paused')) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0e1017', color: '#fff', padding: '24px', fontFamily: "'DM Sans', sans-serif" }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 860, margin: '0 auto', width: '100%', padding: '16px 0' }}>
          <div className="brand-lockup" style={{ padding: 0 }}>
            <div className="brand-mark"><img src="/gympoint-icon.png" alt="GymPoint" /></div>
            <div><strong>gympoint</strong><small>MANAGEMENT PLATFORM</small></div>
          </div>
          <button className="button button-outline" onClick={() => void signOut()} style={{ color: '#fff', borderColor: '#2e3240' }}>
            Sign out
          </button>
        </header>
        <div style={{ margin: 'auto', maxWidth: 500, width: '100%', background: '#161824', border: '1px solid #282b3d', borderRadius: 16, padding: '40px 32px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#2e1920', color: '#ef4444', display: 'grid', placeItems: 'center', margin: '0 auto 20px', border: '1px solid #7f1d1d' }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: '#f87171', textTransform: 'uppercase' }}>Access {profile.status}</span>
          <h1 style={{ font: '700 24px Manrope, sans-serif', margin: '10px 0 10px', color: '#fff' }}>Staff Account {profile.status}</h1>
          <p style={{ color: '#9ca3af', fontSize: 13, lineHeight: 1.6, margin: '0 0 24px' }}>
            Your staff account access for <strong>{organization?.name || 'this gym'}</strong> has been temporarily {profile.status.toLowerCase()} by your gym administrator.
          </p>
          <div style={{ background: '#1c1f2e', border: '1px solid #2a2e42', borderRadius: 10, padding: '16px', fontSize: 12, color: '#cbd5e1', textAlign: 'left', marginBottom: 24, lineHeight: 1.6 }}>
            <strong style={{ display: 'block', color: '#fff', marginBottom: 4 }}>Need to restore access?</strong>
            Please contact your gym administrator or branch manager to reactivate your staff account.
          </div>
          <button className="button button-primary" onClick={() => void signOut()} style={{ width: '100%', justifyContent: 'center' }}>
            Sign out
          </button>
        </div>
      </div>
    )
  }
  if (adminView && isPlatformAdmin) {
    return (
      <PlatformAdmin
        email={profile?.email || session.user.email || 'aman@gmail.com'}
        fullName={profile?.full_name || 'Aman'}
        avatarUrl={effectiveAvatarUrl}
        onLogout={() => void signOut()}
        onOpenEditProfile={() => setShowEditProfile(true)}
        onOpenWorkspace={(orgId) => {
          if (orgId) setActiveOrgId(orgId)
          setAdminView(false)
        }}
      />
    )
  }

  if (organization?.status === 'Suspended' && !isPlatformAdmin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0e1017', color: '#fff', padding: '24px', fontFamily: "'DM Sans', sans-serif" }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 860, margin: '0 auto', width: '100%', padding: '16px 0' }}>
          <div className="brand-lockup" style={{ padding: 0 }}>
            <div className="brand-mark"><img src="/gympoint-icon.png" alt="GymPoint" /></div>
            <div><strong>gympoint</strong><small>MANAGEMENT PLATFORM</small></div>
          </div>
          <button className="button button-outline" onClick={() => void signOut()} style={{ color: '#fff', borderColor: '#2e3240' }}>
            Sign out
          </button>
        </header>
        <div style={{ margin: 'auto', maxWidth: 500, width: '100%', background: '#161824', border: '1px solid #282b3d', borderRadius: 16, padding: '40px 32px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#2e1920', color: '#ef4444', display: 'grid', placeItems: 'center', margin: '0 auto 20px', border: '1px solid #7f1d1d' }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: '#f87171', textTransform: 'uppercase' }}>Access Paused</span>
          <h1 style={{ font: '700 24px Manrope, sans-serif', margin: '10px 0 10px', color: '#fff' }}>Workspace Access Suspended</h1>
          <p style={{ color: '#9ca3af', fontSize: 13, lineHeight: 1.6, margin: '0 0 24px' }}>
            Access to <strong>{organization.name}</strong> has been paused by the platform administrator. Access to member records, check-in scanning, and branch operations is currently locked.
          </p>
          <div style={{ background: '#1c1f2e', border: '1px solid #2a2e42', borderRadius: 10, padding: '16px', fontSize: 12, color: '#cbd5e1', textAlign: 'left', marginBottom: 24, lineHeight: 1.6 }}>
            <strong style={{ display: 'block', color: '#fff', marginBottom: 4 }}>Need to reactivate your gym?</strong>
            Please reach out to your platform administrator or contact support at <strong>support@gympoint.com</strong> to restore full workspace access.
          </div>
          <button className="button button-primary" onClick={() => void signOut()} style={{ width: '100%', justifyContent: 'center' }}>
            Sign out of {organization.name}
          </button>
        </div>
      </div>
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
          <button className="profile-button" onClick={() => setShowEditProfile(true)} title="Click to edit profile">
            <div className="avatar avatar-purple" style={effectiveAvatarUrl ? { overflow: 'hidden', padding: 0 } : undefined}>
              {effectiveAvatarUrl ? (
                <img src={effectiveAvatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (
                getInitials(displayName)
              )}
            </div>
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
          <div className="preview-banner-bar" style={organization?.status === 'Suspended' ? { background: '#2c1418', borderBottom: '1px solid #7f1d1d' } : undefined}>
            <span>
              <span className="preview-banner-dot" style={organization?.status === 'Suspended' ? { background: '#ef4444', boxShadow: '0 0 0 3px #ef444433' } : undefined} />
              Workspace preview mode: <strong>{orgName}</strong>
              {organization?.status === 'Suspended' && (
                <span style={{ marginLeft: 8, background: '#ef444422', color: '#fca5a5', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, border: '1px solid #ef444444' }}>
                  ACCESS PAUSED
                </span>
              )}
            </span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {organization?.status === 'Suspended' && (
                <button
                  className="preview-banner-btn"
                  style={{ background: '#15803d', color: '#fff', borderColor: '#16a34a', fontWeight: 600 }}
                  onClick={async () => {
                    if (!activeOrgId) return
                    await supabase.from('organizations').update({ status: 'Active' }).eq('id', activeOrgId)
                    setOrganization((prev) => (prev ? { ...prev, status: 'Active' } : null))
                    setToast(`Resumed access for ${orgName}!`)
                  }}
                >
                  ▶ Resume access
                </button>
              )}
              <button className="preview-banner-btn" onClick={() => setAdminView(true)}>
                ← Back to Platform Admin
              </button>
            </div>
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
            <button
              className="top-avatar"
              aria-label="Your profile"
              onClick={() => setShowEditProfile(true)}
              title="Click to edit profile"
              style={effectiveAvatarUrl ? { overflow: 'hidden', padding: 0 } : undefined}
            >
              {effectiveAvatarUrl ? (
                <img src={effectiveAvatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (
                getInitials(displayName)
              )}
            </button>
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
            <MembersPage
              members={searchedMembers}
              total={members.length}
              search={memberSearch}
              setSearch={setMemberSearch}
              status={statusFilter}
              setStatus={setStatusFilter}
              onAdd={() => setModal('member')}
              onSelectMember={(member) => setSelectedMemberProfile(member)}
            />
          ) : page === 'Check-in' ? (
            <CheckInPage
              checkIns={checkIns}
              onCheckIn={() => setModal('checkin')}
              onOpenQRScanner={() => setShowQRScanner(true)}
              onOpenGuestPass={() => setShowGuestCheckIn(true)}
            />
          ) : (
            <ModulePage
              page={page}
              profile={profile}
              onUpdateProfile={handleUpdateProfile}
              organization={organization}
              branches={branches}
              plans={membershipPlans}
              members={members}
              totalActive={totalActive}
              payments={payments}
              teamMembers={teamMembers}
              approvalRequests={approvalRequests}
              saving={saving}
              onSaveSettings={(fields) => void saveOrgSettings(fields)}
              onNavigate={navigate}
              onToast={setToast}
              onOpenCreatePlan={() => setShowCreatePlan(true)}
              onEditPlan={(plan) => setEditingPlan(plan)}
              onOpenAddBranch={() => setShowAddBranch(true)}
              onToggleBranch={handleToggleBranch}
              onOpenInviteTeam={() => setShowInviteTeam(true)}
              onOpenRecordPayment={() => setShowRecordPayment(true)}
              onViewReceipt={(payment) => {
                setSelectedReceipt({
                  id: payment.id,
                  invoice_number: payment.invoice_number || `INV-${payment.id.slice(0, 6)}`,
                  org_name: organization?.name ?? 'GymPoint Fitness',
                  org_phone: organization?.phone,
                  org_email: organization?.contact_email,
                  member_name: payment.member_name,
                  plan_name: 'Membership Dues',
                  amount_dollars: payment.amount_cents / 100,
                  method: payment.method.replace('_', ' ').toUpperCase(),
                  paid_at: payment.paid_at,
                  notes: payment.notes,
                })
              }}
              onApproveRequest={async (reqId, status) => {
                setApprovalRequests((prev) => prev.map((r) => (r.id === reqId ? { ...r, status } : r)))
                setToast(`Request ${status.toLowerCase()} successfully.`)
              }}
              onEditTeamMember={(member) => setEditingTeamMember(member)}
              onToggleTeamStatus={(memberId, status) => void handleToggleTeamStatus(memberId, status)}
              onDeleteTeamMember={(memberId, name) => void handleDeleteTeamMember(memberId, name)}
            />
          )}
          <footer className="page-footer"><span>© {new Date().getFullYear()} GymPoint Technologies</span><span><i className="footer-status" /> System operational</span><button onClick={() => setToast('Your workspace data is encrypted and synced securely.')}>Privacy &amp; security</button></footer>
        </div>
      </main>

      {/* Primary Member & Check-in Modals */}
      {modal && (
        <Modal
          title={modal === 'member' ? 'Add a new member' : 'Check in a member'}
          subtitle={modal === 'member' ? 'Create a complete member profile with health intake.' : 'Search by member name or ID to validate access.'}
          onClose={() => setModal(null)}
        >
          {modal === 'member' ? (
            <form onSubmit={(event) => { event.preventDefault(); void addMember(new FormData(event.currentTarget)) }} className="modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label>Full name<input name="name" placeholder="e.g. Alex Morgan" required autoFocus /></label>
                <label>Email address<input name="email" type="email" placeholder="alex@email.com" required /></label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label>Phone number<input name="phone" type="tel" placeholder="+1 (555) 000-0000" /></label>
                <label>Membership plan
                  <select name="plan" defaultValue={membershipPlans[0]?.name ?? 'Unlimited annual'}>
                    {(membershipPlans.length > 0 ? membershipPlans.map((p) => p.name) : ['Unlimited annual', 'Premium monthly', 'Off-peak monthly', 'Starter monthly']).map((plan) => <option key={plan}>{plan}</option>)}
                  </select>
                </label>
              </div>

              {/* Health Screening Intake */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '4px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6366f1', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Health &amp; Emergency Intake
                </div>
                <label style={{ marginBottom: '8px' }}>
                  Emergency contact (Name &amp; Phone)
                  <input name="emergency_contact" placeholder="e.g. Sarah Morgan (+1 555-0192)" />
                </label>
                <label style={{ marginBottom: '8px' }}>
                  Medical conditions / injuries / allergies
                  <input name="health_notes" placeholder="e.g. Asthmatic, past knee surgery, latex allergy" />
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'center' }}>
                  <label>
                    Promo or discount code
                    <input name="discount_code" placeholder="e.g. SUMMER20" />
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '16px', fontSize: '12px', color: '#334155' }}>
                    <input type="checkbox" name="waiver_accepted" defaultChecked required />
                    <span><b>Liability waiver</b> accepted digitally</span>
                  </label>
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '14px' }}>
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

      {/* Member Profile Modal */}
      {selectedMemberProfile && (
        <MemberProfileModal
          member={selectedMemberProfile as MemberDetail}
          checkIns={checkIns.filter((c) => c.member.toLowerCase().includes(selectedMemberProfile.name.toLowerCase()))}
          payments={payments.filter((p) => p.member_id === selectedMemberProfile.id)}
          orgName={orgName}
          onClose={() => setSelectedMemberProfile(null)}
          onStatusChange={handleMemberStatusChange}
          onToast={setToast}
          onViewReceipt={(payment) => {
            setSelectedReceipt({
              id: payment.id,
              invoice_number: payment.invoice_number || `INV-${payment.id.slice(0, 6)}`,
              org_name: organization?.name ?? 'GymPoint Fitness',
              org_phone: organization?.phone,
              org_email: organization?.contact_email,
              member_name: payment.member_name,
              member_code: payment.member_code,
              plan_name: 'Membership Dues',
              amount_dollars: payment.amount_cents / 100,
              method: payment.method.replace('_', ' ').toUpperCase(),
              paid_at: payment.paid_at,
            })
          }}
        />
      )}

      {/* Official Receipt / Invoice Modal */}
      {selectedReceipt && (
        <ReceiptModal
          data={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}

      {/* Edit User Profile Modal */}
      {showEditProfile && profile && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEditProfile(false)}
          onSave={handleUpdateProfile}
        />
      )}

      {/* Record Payment Modal */}
      {showRecordPayment && (
        <RecordPaymentModal
          members={members.map((m) => ({ id: m.id, name: m.name, member_code: m.member_code, plan: m.plan }))}
          onClose={() => setShowRecordPayment(false)}
          onSubmit={handleRecordPayment}
        />
      )}

      {/* Create Membership Plan Modal */}
      {showCreatePlan && (
        <CreatePlanModal
          onClose={() => setShowCreatePlan(false)}
          onSubmit={handleCreatePlan}
        />
      )}

      {/* Edit Membership Plan Modal */}
      {editingPlan && (
        <EditPlanModal
          plan={editingPlan}
          onClose={() => setEditingPlan(null)}
          onSubmit={handleUpdatePlan}
          onDelete={handleDeletePlan}
        />
      )}

      {/* Add Branch Modal */}
      {showAddBranch && (
        <BranchModal
          onClose={() => setShowAddBranch(false)}
          onSubmit={handleAddBranch}
        />
      )}

      {/* Invite Team Member Modal */}
      {showInviteTeam && (
        <InviteTeamModal
          branches={branches}
          onClose={() => setShowInviteTeam(false)}
          onSubmit={handleInviteTeam}
        />
      )}

      {/* Edit Team Member Modal */}
      {editingTeamMember && (
        <EditTeamModal
          member={editingTeamMember}
          branches={branches}
          onClose={() => setEditingTeamMember(null)}
          onSave={handleSaveTeamMember}
        />
      )}

      {/* Guest & Visitor Pass Modal */}
      {showGuestCheckIn && (
        <GuestCheckInModal
          branches={branches}
          selectedBranchId={selectedBranchId}
          onClose={() => setShowGuestCheckIn(false)}
          onSubmit={handleGuestCheckIn}
        />
      )}

      {/* QR Code Scanner Simulator Modal */}
      {showQRScanner && (
        <QRScannerModal
          onClose={() => setShowQRScanner(false)}
          onScan={(code) => handleQRScan(code)}
        />
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
                  <span>ETB 0</span>
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
                members.slice(0, 5).map((member) => (
                  <tr key={member.id} style={{ cursor: 'pointer' }} onClick={onViewMembers}>
                    <td><div className="member-cell"><Avatar member={member} /><div><strong>{member.name}</strong><span>{member.email}</span></div></div></td>
                    <td>{member.plan}</td>
                    <td><StatusBadge status={member.status} /></td>
                    <td>{member.joined}</td>
                    <td><button className="row-menu" aria-label={`Options for ${member.name}`}><Icon name="dots" size={18} /></button></td>
                  </tr>
                ))
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

function MembersPage({
  members,
  total,
  search,
  setSearch,
  status,
  setStatus,
  onAdd,
  onSelectMember,
}: {
  members: Member[]
  total: number
  search: string
  setSearch: (value: string) => void
  status: string
  setStatus: (value: string) => void
  onAdd: () => void
  onSelectMember: (member: Member) => void
}) {
  const renewals = members.filter((member) => member.status === 'Pending' || member.status === 'Expired').length
  return (
    <div className="module-page">
      <section className="module-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> PEOPLE</div><h1>Members</h1><p>Manage your member profiles, memberships, and health intake.</p></div><button className="button button-primary" onClick={onAdd}><Icon name="plus" size={17} /> Add member</button></section>
      <div className="member-stats">
        <div><span>Total members</span><strong>{total.toLocaleString()}</strong><small><b>Synced</b> in real-time</small></div>
        <div><span>Active members</span><strong>{members.filter((member) => member.status === 'Active').length}</strong><small>Across all branches</small></div>
        <div><span>Pending renewal</span><strong>{renewals}</strong><small><b className={renewals > 0 ? 'warning-text' : ''}>{renewals > 0 ? 'Needs attention' : 'All clear'}</b></small></div>
        <div><span>Directory total</span><strong>{members.length}</strong><small>Filtered records</small></div>
      </div>
      <div className="panel directory-panel">
        <div className="directory-heading"><div><h2>All members <span className="table-count">{members.length}</span></h2><p>Click any member row to open their full profile, health record, or lifecycle options.</p></div><div className="directory-controls"><label className="table-search"><Icon name="search" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or ID..." /></label><label className="filter-select"><Icon name="filter" size={16} /><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All status</option><option>Active</option><option>Pending</option><option>Frozen</option><option>Expired</option><option>Cancelled</option></select></label><button className="button button-outline export-button" onClick={() => window.print()}><Icon name="download" size={16} /> Export</button></div></div>
        <div className="member-table-wrap">
          <table className="directory-table">
            <thead><tr><th>MEMBER</th><th>MEMBER ID</th><th>PLAN</th><th>STATUS</th><th>HEALTH / WAIVER</th><th>JOINED DATE</th><th /></tr></thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} style={{ cursor: 'pointer' }} onClick={() => onSelectMember(member)}>
                  <td><div className="member-cell"><Avatar member={member} /><div><strong>{member.name}</strong><span>{member.email}</span></div></div></td>
                  <td className="id-cell">{member.member_code}</td>
                  <td>{member.plan}</td>
                  <td><StatusBadge status={member.status} /></td>
                  <td>
                    {member.health_notes ? (
                      <span className="badge-pill" style={{ background: '#fef3c7', color: '#b45309' }}>⚠ Medical Alert</span>
                    ) : (
                      <span className="badge-pill badge-branch">✓ Waiver Signed</span>
                    )}
                  </td>
                  <td>{member.joined}</td>
                  <td>
                    <button className="table-btn table-btn-primary" onClick={(e) => { e.stopPropagation(); onSelectMember(member) }}>
                      View Profile
                    </button>
                  </td>
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

function CheckInPage({
  checkIns,
  onCheckIn,
  onOpenQRScanner,
  onOpenGuestPass,
}: {
  checkIns: CheckIn[]
  onCheckIn: () => void
  onOpenQRScanner: () => void
  onOpenGuestPass: () => void
}) {
  const checkedIn = checkIns.filter((item) => item.status === 'Checked in').length
  return (
    <div className="module-page">
      <section className="module-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> FRONT DESK</div>
          <h1>Member check-in &amp; Access Control</h1>
          <p>Scan digital QR passes, register drop-in guests, and validate access rules in real-time.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="button button-outline" onClick={onOpenQRScanner}>
            📱 Scan QR Pass
          </button>
          <button className="button button-outline" onClick={onOpenGuestPass}>
            🎟 Guest / Day Pass
          </button>
          <button className="button button-primary" onClick={onCheckIn}>
            <Icon name="scan" size={17} /> Manual Check In
          </button>
        </div>
      </section>

      <div className="member-stats checkin-stats">
        <div><span>Today&apos;s visits</span><strong>{checkedIn}</strong><small>Recorded today</small></div>
        <div><span>Currently checked in</span><strong>{checkedIn}</strong><small>Members in the gym</small></div>
        <div><span>Access denied</span><strong>{checkIns.filter((item) => item.status === 'Access denied').length}</strong><small>Membership issues</small></div>
        <div><span>Sync state</span><strong>Offline Ready</strong><small><span className="badge-pill badge-branch">● Local cache active</span></small></div>
      </div>

      <div className="panel directory-panel">
        <div className="directory-heading">
          <div><h2>Today&apos;s activity</h2><p>Live check-in stream with branch rules validation.</p></div>
          <button className="select-button">Today, {shortDate()} <Icon name="down" size={15} /></button>
        </div>
        <div className="checkin-activity-list">
          {checkIns.map((item) => (
            <div className="checkin-row" key={item.id}>
              <div className={`avatar activity-avatar ${item.status === 'Access denied' ? 'avatar-muted' : ''}`}>{item.initials}</div>
              <div className="checkin-row-name">
                <strong>{item.member}</strong>
                <span>{item.branch} branch</span>
              </div>
              <span className="checkin-time"><Icon name="clock" size={15} /> {item.time}</span>
              <span className={`access-badge ${item.status === 'Access denied' ? 'access-denied' : ''}`}><i />{item.status}</span>
            </div>
          ))}
        </div>
        {checkIns.length === 0 && <div className="empty-state"><strong>No check-ins yet</strong><span>Scan or check in the first member to see live activity.</span></div>}
      </div>
    </div>
  )
}

function ModulePage({
  page,
  profile,
  onUpdateProfile,
  organization,
  branches,
  plans,
  members,
  totalActive,
  payments,
  teamMembers,
  approvalRequests,
  saving,
  onSaveSettings,
  onNavigate,
  onToast: _onToast,
  onOpenCreatePlan,
  onEditPlan,
  onOpenAddBranch,
  onToggleBranch,
  onOpenInviteTeam,
  onOpenRecordPayment,
  onViewReceipt,
  onApproveRequest,
  onEditTeamMember,
  onToggleTeamStatus,
  onDeleteTeamMember,
}: {
  page: Page
  profile: Profile | null
  onUpdateProfile: (data: { full_name: string; avatar_url: string | null }) => Promise<void>
  organization: Organization | null
  branches: Branch[]
  plans: MembershipPlan[]
  members: Member[]
  totalActive: number
  payments: Payment[]
  teamMembers: TeamMember[]
  approvalRequests: ApprovalRequest[]
  saving: boolean
  onSaveSettings: (fields: { name: string; contact_email: string; phone: string; primary_location: string; logo_url?: string | null }) => void
  onNavigate: (page: Page) => void
  onToast: (message: string) => void
  onOpenCreatePlan: () => void
  onEditPlan: (plan: MembershipPlan) => void
  onOpenAddBranch: () => void
  onToggleBranch: (branchId: string, currentStatus: boolean) => void
  onOpenInviteTeam: () => void
  onOpenRecordPayment: () => void
  onViewReceipt: (payment: Payment) => void
  onApproveRequest: (id: string, status: 'Approved' | 'Rejected') => void
  onEditTeamMember: (member: TeamMember) => void
  onToggleTeamStatus: (memberId: string, currentStatus: string) => void
  onDeleteTeamMember: (memberId: string, name: string) => void
}) {
  const [orgName, setOrgName] = useState(organization?.name ?? '')
  const [contactEmail, setContactEmail] = useState(organization?.contact_email ?? '')
  const [phone, setPhone] = useState(organization?.phone ?? '')
  const [location, setLocation] = useState(organization?.primary_location ?? '')
  const [logoUrl, setLogoUrl] = useState<string | null>(organization?.logo_url ?? null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cropper states for personal avatar and gym logo
  const [cropProfileSrc, setCropProfileSrc] = useState<string | null>(null)
  const [cropLogoSrc, setCropLogoSrc] = useState<string | null>(null)

  // Personal user profile state
  const [profileName, setProfileName] = useState(profile?.full_name ?? '')
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null)
  const [profileSaving, setProfileSaving] = useState(false)
  const profileFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (profile) {
      setProfileName(profile.full_name || '')
      setProfileAvatarUrl(profile.avatar_url || null)
    }
  }, [profile])

  const handleProfileAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      setCropProfileSrc(result)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleApplyProfileCrop = async (croppedUrl: string) => {
    setProfileAvatarUrl(croppedUrl)
    setCropProfileSrc(null)
    await onUpdateProfile({ full_name: profileName || profile?.full_name || '', avatar_url: croppedUrl })
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSaving(true)
    try {
      await onUpdateProfile({ full_name: profileName.trim(), avatar_url: profileAvatarUrl })
    } finally {
      setProfileSaving(false)
    }
  }

  const handleSaveAllSettings = async () => {
    onSaveSettings({ name: orgName, contact_email: contactEmail, phone, primary_location: location, logo_url: logoUrl })
    if (profileName.trim() !== (profile?.full_name || '') || profileAvatarUrl !== (profile?.avatar_url || null)) {
      setProfileSaving(true)
      try {
        await onUpdateProfile({ full_name: profileName.trim() || profile?.full_name || '', avatar_url: profileAvatarUrl })
      } finally {
        setProfileSaving(false)
      }
    }
  }

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
    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      setCropLogoSrc(result)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleApplyLogoCrop = (croppedUrl: string) => {
    setLogoUrl(croppedUrl)
    setCropLogoSrc(null)
    onSaveSettings({
      name: orgName,
      contact_email: contactEmail,
      phone,
      primary_location: location,
      logo_url: croppedUrl,
    })
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

  const planColors = ['plan-purple', 'plan-blue', 'plan-orange']

  return (
    <div className="module-page">
      {/* Dynamic Module Header */}
      <section className="module-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" /> {page.toUpperCase()}
          </div>
          <h1>
            {page === 'Memberships'
              ? 'Membership Plans & Tiers'
              : page === 'Branches'
              ? 'Branches & Facility Locations'
              : page === 'Team'
              ? 'Team Members & Access Control'
              : page === 'Billing'
              ? 'Billing, Invoices & Revenue'
              : page === 'Reports'
              ? 'Analytics & Performance Reports'
              : 'Workspace Settings'}
          </h1>
          <p>
            {page === 'Memberships'
              ? 'Create custom recurring dues, rates, and multi-branch access rules.'
              : page === 'Branches'
              ? 'Manage multi-location branch operations, opening hours, and phone lines.'
              : page === 'Team'
              ? 'Granular industry roles (Trainer, Receptionist, Manager) and approval flows.'
              : page === 'Billing'
              ? 'Collect cash, card, mobile money (Telebirr/CBE), and generate official receipts.'
              : page === 'Reports'
              ? 'A real-time overview of recurring revenues, signups, and check-in metrics.'
              : 'Branding, gym contact details, and organization preferences.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {page === 'Memberships' && (
            <button className="button button-primary" onClick={onOpenCreatePlan}>
              <Icon name="plus" size={17} /> Create a plan
            </button>
          )}
          {page === 'Branches' && (
            <button className="button button-primary" onClick={onOpenAddBranch}>
              <Icon name="plus" size={17} /> Add branch
            </button>
          )}
          {page === 'Team' && (
            <button className="button button-primary" onClick={onOpenInviteTeam}>
              <Icon name="plus" size={17} /> Invite team member
            </button>
          )}
          {page === 'Billing' && (
            <button className="button button-primary" onClick={onOpenRecordPayment}>
              <Icon name="plus" size={17} /> Record payment
            </button>
          )}
          {page === 'Reports' && (
            <button className="button button-outline" onClick={() => window.print()}>
              <Icon name="download" size={17} /> Export report
            </button>
          )}
          {page === 'Settings' && (
            <button
              className="button button-primary"
              disabled={saving || profileSaving}
              onClick={handleSaveAllSettings}
            >
              {saving || profileSaving ? 'Saving...' : 'Save changes'}
            </button>
          )}
        </div>
      </section>

      {/* Module Stats Bar */}
      <div className="member-stats">
        <div>
          <span>{page === 'Memberships' ? 'Active plans' : page === 'Branches' ? 'Total branches' : page === 'Team' ? 'Team size' : page === 'Billing' ? 'Monthly recurring' : 'Active members'}</span>
          <strong>{page === 'Memberships' ? plans.length : page === 'Branches' ? branches.length : page === 'Team' ? teamMembers.length : page === 'Billing' ? money(monthlyRevenue) : totalActive}</strong>
          <small>Configured in system</small>
        </div>
        <div>
          <span>{page === 'Billing' ? 'Collected payments' : 'Active members'}</span>
          <strong>{page === 'Billing' ? payments.length : totalActive}</strong>
          <small>Across all branches</small>
        </div>
        <div>
          <span>{page === 'Team' ? 'Pending approvals' : 'Renewals due'}</span>
          <strong>{page === 'Team' ? approvalRequests.filter((a) => a.status === 'Pending').length : renewalsDue}</strong>
          <small>{renewalsDue > 0 ? 'Needs attention' : 'All clear'}</small>
        </div>
      </div>

      {/* Memberships View */}
      {page === 'Memberships' && (
        <div className="plan-grid">
          {plans.map((plan, index) => (
            <div className="panel plan-card" key={plan.id}>
              <div className={`plan-icon ${planColors[index % planColors.length]}`}><Icon name="card" size={20} /></div>
              <div className="plan-price"><strong>{money(plan.price_cents / 100)}</strong><span>/ {plan.billing_cycle}</span></div>
              <h2>{plan.name}</h2>
              <p>{plan.description}</p>
              <div style={{ margin: '8px 0 12px' }}>
                <span className={`badge-pill ${plan.branch_access === 'home_only' ? 'badge-role' : 'badge-branch'}`}>
                  {plan.branch_access === 'home_only' ? '🏠 Home Branch Only' : '🌐 All-Branch Access'}
                </span>
              </div>
              <div className="plan-bottom">
                <span><b>{members.filter((member) => member.plan === plan.name).length}</b> members enrolled</span>
                <button
                  type="button"
                  className="table-btn table-btn-primary"
                  onClick={() => onEditPlan(plan)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '5px 10px' }}
                >
                  ✎ Edit Plan
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Branches View */}
      {page === 'Branches' && (
        <div className="panel directory-panel">
          <div className="directory-heading">
            <div>
              <h2>Organization branches <span className="table-count">{branches.length}</span></h2>
              <p>Configure multiple branches with dedicated phone numbers and operational statuses.</p>
            </div>
          </div>
          <div className="member-table-wrap">
            <table className="directory-table">
              <thead><tr><th>BRANCH NAME</th><th>ADDRESS / LOCATION</th><th>CONTACT PHONE</th><th>STATUS</th><th>ACTIONS</th></tr></thead>
              <tbody>
                {branches.map((b) => (
                  <tr key={b.id}>
                    <td><strong>{b.name}</strong></td>
                    <td>{b.address || 'Central Headquarters'}</td>
                    <td>{b.phone || '—'}</td>
                    <td>
                      <span className={`badge-pill ${b.is_open ? 'badge-branch' : 'status-cancelled'}`}>
                        {b.is_open ? '● Open & Operating' : '○ Temporarily Closed'}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`table-btn ${b.is_open ? 'table-btn-danger' : 'table-btn-success'}`}
                        onClick={() => onToggleBranch(b.id, b.is_open)}
                      >
                        {b.is_open ? 'Pause Branch' : 'Reopen Branch'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Team View */}
      {page === 'Team' && (
        <div style={{ display: 'grid', gap: '20px' }}>
          <div className="panel directory-panel">
            <div className="directory-heading">
              <div>
                <h2>Staff &amp; Instructors <span className="table-count">{teamMembers.length}</span></h2>
                <p>Granular industry roles: Personal Trainers, Instructors, Receptionists, and Branch Managers.</p>
              </div>
            </div>
            <div className="member-table-wrap">
              <table className="directory-table">
                <thead><tr><th>STAFF MEMBER</th><th>ASSIGNED ROLE</th><th>BRANCH SCOPE</th><th>STATUS</th><th>ACTIONS</th></tr></thead>
                <tbody>
                  {teamMembers.map((t) => (
                    <tr key={t.id}>
                      <td><div className="member-cell"><div className="avatar avatar-purple">{getInitials(t.full_name)}</div><div><strong>{t.full_name}</strong><span>{t.email}</span></div></div></td>
                      <td><span className="badge-pill badge-role">{t.role}</span></td>
                      <td>{t.branch_name || 'All branches'}</td>
                      <td>
                        <span
                          className={`badge-pill ${t.status === 'Active' ? 'badge-branch' : t.status === 'Paused' ? 'status-pending' : 'table-btn-danger'}`}
                          style={{ fontWeight: 700 }}
                        >
                          {t.status === 'Active' ? '● Active' : t.status === 'Paused' ? '⏸ Paused' : '⛔ Suspended'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="table-btn table-btn-primary"
                            onClick={() => onEditTeamMember(t)}
                            title="Edit staff details and duties"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className={`table-btn ${t.status === 'Active' ? 'table-btn-danger' : 'table-btn-success'}`}
                            onClick={() => onToggleTeamStatus(t.id, t.status)}
                            title={t.status === 'Active' ? 'Pause/Suspend access' : 'Resume access'}
                          >
                            {t.status === 'Active' ? 'Pause' : 'Resume'}
                          </button>
                          <button
                            type="button"
                            className="table-btn"
                            style={{ color: '#dc2626', borderColor: '#fecaca' }}
                            onClick={() => onDeleteTeamMember(t.id, t.full_name)}
                            title="Remove staff member from gym"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Approval Workflows Section */}
          <div className="panel" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
              Managerial Approval Workflows
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px' }}>
              Supervises member freezes, cancellations, refunds, and manager discounts.
            </p>
            <div style={{ display: 'grid', gap: '10px' }}>
              {approvalRequests.length === 0 ? (
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                  No pending approval requests. Freeze and discount actions will surface here.
                </div>
              ) : (
                approvalRequests.map((req) => (
                  <div key={req.id} className="approval-card">
                    <div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                        <span className="badge-pill badge-role">{req.type}</span>
                        <strong style={{ fontSize: '13px' }}>{req.member_name}</strong>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        Requested by {req.requested_by} · {req.details}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {req.status === 'Pending' ? (
                        <>
                          <button className="table-btn table-btn-success" onClick={() => onApproveRequest(req.id, 'Approved')}>
                            Approve
                          </button>
                          <button className="table-btn table-btn-danger" onClick={() => onApproveRequest(req.id, 'Rejected')}>
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className={`badge-pill ${req.status === 'Approved' ? 'badge-branch' : 'status-cancelled'}`}>
                          {req.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Billing & Payments View */}
      {page === 'Billing' && (
        <div className="panel directory-panel">
          <div className="directory-heading">
            <div>
              <h2>Payments &amp; Invoices <span className="table-count">{payments.length}</span></h2>
              <p>Transactions recorded via Cash, Credit Card, Bank Transfer, or Mobile Money (Telebirr / CBE).</p>
            </div>
            <button className="button button-outline" onClick={() => window.print()}>
              <Icon name="download" size={16} /> Export Invoices
            </button>
          </div>
          <div className="member-table-wrap">
            <table className="directory-table">
              <thead><tr><th>INVOICE #</th><th>MEMBER</th><th>AMOUNT</th><th>METHOD</th><th>DATE</th><th>RECEIPT</th></tr></thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                      No payments recorded yet. Click &quot;Record payment&quot; to log member dues.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id}>
                      <td className="id-cell">{p.invoice_number || `INV-${p.id.slice(0, 6)}`}</td>
                      <td><strong>{p.member_name}</strong></td>
                      <td><strong style={{ color: '#047857' }}>ETB {(p.amount_cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                      <td><span className="badge-pill badge-role">{p.method.replace('_', ' ').toUpperCase()}</span></td>
                      <td>{new Date(p.paid_at).toLocaleDateString()}</td>
                      <td>
                        <button className="table-btn table-btn-primary" onClick={() => onViewReceipt(p)}>
                          Print Receipt
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Settings View */}
      {page === 'Settings' && (
        <>
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

          {/* User Personal Profile Card */}
          <div className="panel settings-panel" style={{ marginTop: '16px' }}>
            <div className="settings-title">
              <div
                className="org-avatar large-org-avatar"
                style={{
                  borderRadius: '50%',
                  background: '#ede7ff',
                  color: '#7653e8',
                  overflow: 'hidden',
                  padding: 0,
                  border: '2px solid #ddd6fe',
                }}
              >
                {profileAvatarUrl ? (
                  <img src={profileAvatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  getInitials(profileName || profile?.email || 'U')
                )}
              </div>
              <div>
                <h2>Personal Profile &amp; Picture</h2>
                <p>Your account across GymPoint <span className="verified-tag" style={{ textTransform: 'capitalize' }}>{profile?.role?.replace('_', ' ') || 'Staff'}</span></p>
              </div>
              <input
                type="file"
                ref={profileFileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleProfileAvatarChange}
              />
              <button className="button button-outline" onClick={() => profileFileInputRef.current?.click()}>
                {profileAvatarUrl ? 'Change picture' : 'Upload picture'}
              </button>
              {profileAvatarUrl && (
                <button
                  className="button button-outline"
                  style={{ marginLeft: 8, color: '#dc2626', borderColor: '#fecaca' }}
                  onClick={async () => {
                    setProfileAvatarUrl(null)
                    await onUpdateProfile({ full_name: profileName, avatar_url: null })
                  }}
                >
                  Remove
                </button>
              )}
            </div>
            <form onSubmit={handleSaveProfile} style={{ display: 'grid', gap: '14px', marginTop: '16px' }}>
              <div className="settings-fields" style={{ padding: 0 }}>
                <label>Full Name<input value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Your full name" /></label>
                <label>Email Address<input value={profile?.email || ''} disabled style={{ background: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }} /></label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="button button-primary" disabled={profileSaving}>
                  {profileSaving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Reports View */}
      {page === 'Reports' && (
        <div className="report-grid">
          <div className="panel report-card"><div className="report-icon report-violet"><Icon name="users" /></div><h2>Membership report</h2><p>Active members, sign-ups, renewals, and cancellations.</p><div className="report-chart-bars">{[38, 54, 46, 70, 57, 82, 66, 94, 70, 100, 79, 91].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div><button className="text-button" onClick={() => onNavigate('Members')}>View members <span>→</span></button></div>
          <div className="panel report-card"><div className="report-icon report-green"><Icon name="receipt" /></div><h2>Revenue report</h2><p>Collected payments, outstanding balances, and renewals.</p><div className="report-highlight"><strong>{money(monthlyRevenue)}</strong><span><Icon name="trend" size={14} /> Monthly estimate</span></div><button className="text-button" onClick={() => onNavigate('Billing')}>View billing <span>→</span></button></div>
          <div className="panel report-card"><div className="report-icon report-orange"><Icon name="scan" /></div><h2>Attendance report</h2><p>Daily check-ins, peak hours, and branch activity.</p><div className="report-highlight"><strong>{totalActive}</strong><span>Active members</span></div><button className="text-button" onClick={() => onNavigate('Check-in')}>View check-ins <span>→</span></button></div>
        </div>
      )}

      {/* Interactive Crop & Resize for Personal Avatar */}
      {cropProfileSrc && (
        <ImageCropModal
          imageSrc={cropProfileSrc}
          title="Resize & Position Profile Picture"
          circular={true}
          onClose={() => setCropProfileSrc(null)}
          onApply={handleApplyProfileCrop}
        />
      )}

      {/* Interactive Crop & Resize for Gym Logo */}
      {cropLogoSrc && (
        <ImageCropModal
          imageSrc={cropLogoSrc}
          title="Resize & Position Gym Logo"
          circular={false}
          onClose={() => setCropLogoSrc(null)}
          onApply={handleApplyLogoCrop}
        />
      )}
    </div>
  )
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" aria-label="Close dialog" onClick={onClose}><Icon name="close" size={19} /></button><div className="modal-icon"><Icon name={title.includes('check in') ? 'scan' : 'user'} size={21} /></div><h2 id="modal-title">{title}</h2><p>{subtitle}</p>{children}</section></div>
}

export default App
