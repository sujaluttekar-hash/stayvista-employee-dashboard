import { createClient } from "@/lib/supabase/server";

export async function getCurrentProfile() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, person_id")
    .eq("id", user.id)
    .single();

  return profile;
}
