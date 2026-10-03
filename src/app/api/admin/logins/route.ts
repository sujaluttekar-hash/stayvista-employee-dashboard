import { NextRequest, NextResponse } from "next/server";
import { requireViewer } from "@/lib/auth/session";
import { canManageEmployees } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/server";

// Only emails added here can ever sign in. Supabase Auth must have public
// sign-up switched OFF (see HANDOFF.md → Security checklist), and both the
// middleware and getViewer() reject any session whose user has no row in
// app_users. So adding a login here is the ONLY way in.

const ROLES = ["hr", "manager", "data"];

// Supabase pages its user list (default 50). Walk every page so nobody's
// email goes missing from the Management screen.
async function listAllAuthUsers(admin: ReturnType<typeof createAdminClient>) {
  const users: { id: string; email?: string | null }[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return users;
}

export async function GET() {
  const v = await requireViewer();
  if (!canManageEmployees(v)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("app_users").select("id, display_name, role").order("display_name");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Emails aren't stored in app_users, only in Supabase Auth.
    const emailById = new Map((await listAllAuthUsers(admin)).map((u) => [u.id, u.email ?? ""]));
    return NextResponse.json(data.map((u) => ({ ...u, email: emailById.get(u.id) ?? "" })));
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "Couldn't load logins" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const v = await requireViewer();
  if (!canManageEmployees(v)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const display_name = String(body.display_name ?? "").trim();
  const role = String(body.role ?? "");
  const password = body.password ? String(body.password) : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !display_name || !ROLES.includes(role)) {
    return NextResponse.json({ error: "A valid email, a name and a role are required" }, { status: 400 });
  }
  if (password && password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const admin = createAdminClient();
  const usingChosenPassword = !!password;

  let userId: string | null = null;
  let createdNow = false;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: usingChosenPassword ? password : crypto.randomUUID(),
    email_confirm: true,
  });

  if (created?.user) {
    userId = created.user.id;
    createdNow = true;
  } else {
    // The email may already exist in Supabase Auth without access — e.g. a
    // half-finished earlier attempt. Reuse that account instead of failing.
    const existing = (await listAllAuthUsers(admin)).find((u) => (u.email ?? "").toLowerCase() === email);
    if (!existing) {
      return NextResponse.json({ error: createError?.message ?? "Could not create login" }, { status: 400 });
    }
    const { data: row } = await admin.from("app_users").select("id").eq("id", existing.id).maybeSingle();
    if (row) return NextResponse.json({ error: "This email already has access" }, { status: 409 });
    userId = existing.id;
    if (usingChosenPassword) {
      const { error: pwError } = await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
      if (pwError) return NextResponse.json({ error: pwError.message }, { status: 400 });
    }
  }

  const { error: insertError } = await admin.from("app_users").insert({ id: userId, display_name, role });
  if (insertError) {
    if (createdNow) await admin.auth.admin.deleteUser(userId!); // roll back the orphaned auth user
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  if (usingChosenPassword) {
    return NextResponse.json({ ok: true, id: userId, magicLink: null });
  }

  // No password given -- share this one-time link instead so they can
  // get in and set their own. Requires Site URL to be set in Supabase
  // Auth settings; otherwise this still works, just links to localhost.
  const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  return NextResponse.json({ ok: true, id: userId, magicLink: link?.properties?.action_link ?? null });
}

export async function DELETE(req: NextRequest) {
  const v = await requireViewer();
  if (!canManageEmployees(v)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  if (id === v.user.id) return NextResponse.json({ error: "You can't remove your own access" }, { status: 400 });

  const admin = createAdminClient();
  const { error: rowError } = await admin.from("app_users").delete().eq("id", id);
  if (rowError) return NextResponse.json({ error: rowError.message }, { status: 400 });
  const { error: authError } = await admin.auth.admin.deleteUser(id);
  // Access is already gone (no app_users row). Report, but don't pretend it failed outright.
  if (authError) return NextResponse.json({ ok: true, warning: "Access removed, but the sign-in account could not be deleted" });
  return NextResponse.json({ ok: true });
}
