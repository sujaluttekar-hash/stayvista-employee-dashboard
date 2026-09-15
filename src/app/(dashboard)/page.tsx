import { getCurrentProfile } from "@/lib/profile";

export default async function DashboardHome() {
  const profile = await getCurrentProfile();

  return (
    <div className="p-8">
      <h1 className="font-serif text-2xl mb-1">Welcome, {profile?.full_name}</h1>
      <div className="text-sm text-muted mb-6 capitalize">{profile?.role} view</div>
      <div className="bg-panel border border-line rounded p-5 text-sm text-muted max-w-xl">
        Pick a department from the left to see its scorecards.
        {profile?.role === "manager" && " You'll only see and edit your own team's actuals — that's enforced at the database level, not just hidden in the UI."}
        {profile?.role === "hr" && " You have org-wide read access and can update roster status (active/exit/resigned) — score edits stay with managers."}
        {profile?.role === "data" && " Use Redash sync to pull live actuals per department once each department's query is wired up."}
      </div>
    </div>
  );
}
