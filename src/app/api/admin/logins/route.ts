import { NextRequest, NextResponse } from "next/server";
import { requireViewer } from "@/lib/auth/session";
import { canManageEmployees } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/server";

// Only emails added here can ever sign in — Supabase Auth has public
// sign-up left off, and getViewer() rejects any session whose user has
// no row in app_users. So adding a login here is the ONLY way in.

export async function GET() {
  const v = await requireViewer();
  if (!canManageEmployees(v)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin.from("app_users").select("id, display_name, role").order("display_name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Emails aren't stored in app_users, only in Supabase Auth — fetch them
  // so the Management UI can show who's who.
  const { data: authList } = await admin.auth.admin.listUsers();
  const emailById = new Map(authList?.users.map((u) => [u.id, u.email]) ?? []);
  const logins = data.map((u) => ({ ...u, email: emailById.get(u.id) ?? "" }));
  return NextResponse.json(logins);
}

export async function POST(req: NextRequest) {
  const v = await requireViewer();
  if (!canManageEmployees(v)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const { email, display_name, role } = await req.json();
  if (!email || !display_name || !["hr", "manager", "data"].includes(role)) {
    return NextResponse.json({ error: "email, display_name and a valid role are required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Create the auth user with a random password nobody will ever type —
  // they sign in via the magic link below the first time, then can set
  // their own password (or you can share a reset link again later).
  const tempPassword = crypto.randomUUID();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });
  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message ?? "Could not create login" }, { status: 400 });
  }

  const { error: insertError } = await admin
    .from("app_users")
    .insert({ id: created.user.id, display_name, role });
  if (insertError) {
    await admin.auth.admin.deleteUser(created.user.id); // roll back the orphaned auth user
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  // A one-time sign-in link — share this with them so they can get in
  // and set a real password. Requires Site URL to be set in Supabase
  // Auth settings; otherwise this still works, just links to localhost.
  const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email });

  return NextResponse.json({ ok: true, id: created.user.id, magicLink: link?.properties?.action_link ?? null });
}

export async function DELETE(req: NextRequest) {
  const v = await requireViewer();
  if (!canManageEmployees(v)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  if (id === v.user.id) return NextResponse.json({ error: "You can't remove your own access" }, { status: 400 });

  const admin = createAdminClient();
  await admin.from("app_users").delete().eq("id", id);
  await admin.auth.admin.deleteUser(id);
  return NextResponse.json({ ok: true });
}
