import { NextResponse } from'next/server';
import { createAdminClient } from'@/lib/supabase-admin';

/**
 * 🦅 Falcon ERP - Auth Account Provisioning (Server Route)
 * Creates / updates / bans Supabase Auth accounts for organization staff.
 * Every account (owner or employee) lives in auth.users with`user_metadata.org_id`
 * so that Realtime RLS can resolve the tenant from the JWT on any device.
 */
interface ProvisionBody {
 action?:'ensure'|'ban'|'unban';
 email: string;
 oldEmail?: string;
 password?: string;
 fullName?: string;
 orgId?: string;
 role?: string;
}

const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

async function findAuthUserByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
 const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
 if (error) return null;
 return data?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function POST(req: Request) {
 try {
 const body = (await req.json()) as ProvisionBody;
 const action = body?.action ||'ensure';

 if (!body?.email || !isValidEmail(body.email)) {
 return NextResponse.json({ error:'بريد إلكتروني صالح مطلوب.'}, { status: 400 });
 }
 if (action ==='ensure'&& !body.orgId) {
 return NextResponse.json({ error:'orgId مطلوب لعملية ensure.'}, { status: 400 });
 }

 const admin = createAdminClient();
 const cleanEmail = body.email.trim().toLowerCase();
 const lookupEmail = body.oldEmail?.trim().toLowerCase() || cleanEmail;
 const existingUser = await findAuthUserByEmail(admin, lookupEmail);

 if (action ==='ban'|| action ==='unban') {
 if (!existingUser) {
 return NextResponse.json({ success: true, message:'مستخدم auth غير موجود (لا شيء للتغيير).'});
 }
 const banDuration = action ==='ban'?'8760h':'none';
 const { error } = await admin.auth.admin.updateUserById(existingUser.id, { ban_duration: banDuration });
 if (error) {
 return NextResponse.json({ error: error.message }, { status: 400 });
 }
 return NextResponse.json({ success: true, authUserId: existingUser.id, action });
 }

 // ----'ensure': create or update ----
 const metadata: Record<string, string> = {};
 if (body.orgId) metadata.org_id = body.orgId;
 if (body.fullName) metadata.full_name = body.fullName;
 if (body.role) metadata.role = body.role;

 if (existingUser) {
 const updates: Record<string, unknown> = { user_metadata: existingUser.user_metadata || {} };
 const nextMeta = { ...(existingUser.user_metadata || {}), ...metadata };
 updates.user_metadata = nextMeta;

 if (existingUser.email?.toLowerCase() !== cleanEmail) {
 updates.email = cleanEmail;
 updates.email_confirm = true;
 }
 if (body.password) {
 updates.password = body.password;
 }

 const { error } = await admin.auth.admin.updateUserById(existingUser.id, updates);
 if (error) {
 return NextResponse.json({ error: error.message }, { status: 400 });
 }
 return NextResponse.json({ success: true, authUserId: existingUser.id, action:'updated'});
 }

 // Create a new auth account (email_confirm:true so the device can sign in immediately)
 const { data, error } = await admin.auth.admin.createUser({
 email: cleanEmail,
 password: body.password || undefined,
 email_confirm: true,
 user_metadata: metadata,
 });
 if (error) {
 return NextResponse.json({ error: error.message }, { status: 400 });
 }
 return NextResponse.json({ success: true, authUserId: data.user?.id, action:'created'});
 } catch (err: unknown) {
 const msg = err instanceof Error ? err.message :'Internal server error';
 console.error('[provision-user] fatal error:', msg);
 return NextResponse.json({ error: msg }, { status: 500 });
 }
}