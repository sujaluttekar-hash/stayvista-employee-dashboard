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

  const { email, display_name, role, password } = await req.json();
  if (!email || !display_name || !["hr", "manager", "data"].includes(role)) {
    return NextResponse.json({ error: "email, display_name and a valid role are required" }, { status: 400 });
  }
  if (password && password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const admin = createAdminClient();

  // If a password was given, use it directly -- they can sign in with it
  // right away, no link to share. If left blank, fall back to a random
  // password plus a one-time magic link, same as before.
  const usingChosenPassword = !!password;
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: usingChosenPassword ? password : crypto.randomUUID(),
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

  if (usingChosenPassword) {
    return NextResponse.json({ ok: true, id: created.user.id, magicLink: null });
  }

  // No password given -- share this one-time link instead so they can
  // get in and set their own. Requires Site URL to be set in Supabase
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
