import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type CreateCompanyRequest = {
  name?: string
  adminName?: string
  adminEmail?: string
  adminPassword?: string
  plan?: 'Starter' | 'Growth' | 'Scale'
}

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authHeader = request.headers.get('Authorization')
  if (!supabaseUrl || !serviceRoleKey || !authHeader) return json({ error: 'Unauthorized.' }, 401)

  const callerClient = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: userError } = await callerClient.auth.getUser()
  if (userError || !user) return json({ error: 'Please sign in again.' }, 401)

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const { data: callerProfile, error: callerError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerError || callerProfile?.role !== 'platform_admin') return json({ error: 'Only platform administrators can create companies.' }, 403)

  const { name, adminName, adminEmail, adminPassword, plan = 'Starter' } = await request.json() as CreateCompanyRequest
  if (!name?.trim() || !adminName?.trim() || !adminEmail?.trim() || !adminPassword || adminPassword.length < 8) {
    return json({ error: 'Company name, administrator details, and an 8-character password are required.' }, 400)
  }

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: adminEmail.trim().toLowerCase(),
    password: adminPassword,
    email_confirm: true,
    user_metadata: { full_name: adminName.trim() },
  })
  if (authError || !authData.user) return json({ error: authError?.message ?? 'Could not create administrator account.' }, 400)

  const { data: organization, error: organizationError } = await adminClient
    .from('organizations')
    .insert({
      name: name.trim(),
      admin_name: adminName.trim(),
      admin_email: adminEmail.trim().toLowerCase(),
      contact_email: adminEmail.trim().toLowerCase(),
      plan,
      status: 'Trial',
    })
    .select('id, org_code, name, admin_name, admin_email, plan, status, created_at')
    .single()
  if (organizationError || !organization) {
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return json({ error: organizationError?.message ?? 'Could not create company workspace.' }, 400)
  }

  const { data: branch, error: branchError } = await adminClient
    .from('branches')
    .insert({ organization_id: organization.id, name: 'Main branch', is_open: true })
    .select('id')
    .single()
  if (branchError || !branch) return json({ error: `Company was created, but its default branch failed: ${branchError?.message ?? 'Unknown error.'}` }, 400)

  const { error: profileError } = await adminClient.from('profiles').insert({
    id: authData.user.id,
    email: adminEmail.trim().toLowerCase(),
    full_name: adminName.trim(),
    role: 'org_admin',
    organization_id: organization.id,
    branch_id: branch.id,
  })
  if (profileError) return json({ error: `Company was created, but the administrator profile failed: ${profileError.message}` }, 400)

  const { error: inviteError } = await adminClient.from('team_invites').insert({
    organization_id: organization.id,
    email: adminEmail.trim().toLowerCase(),
    full_name: adminName.trim(),
    role: 'org_admin',
    status: 'Pending',
  })
  if (inviteError) return json({ error: `Company and administrator were created, but the invite failed: ${inviteError.message}` }, 400)

  return json({ organization })
})
