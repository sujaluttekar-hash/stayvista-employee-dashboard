import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/session";
import { METRICS, visiblePeople } from "@/lib/mock-data";
import MyTeamEditor from "./editor";

export default function MyTeamPage() {
  const profile = getCurrentProfile();
  if (!profile) redirect("/login");
  const team = visiblePeople(profile);
  const metricsByDept = Object.fromEntries(team.map((p) => [p.department_slug, METRICS[p.department_slug] ?? []]));
  return <MyTeamEditor team={team} metricsByDept={metricsByDept} />;
}
