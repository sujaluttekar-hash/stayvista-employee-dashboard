import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth/session";

// Everyone lands on the most useful page for their role.
export default function Home() {
  const v = requireViewer();
  if (v.isAdmin) redirect("/employees");
  if (v.isManager) redirect("/my-team");
  if (v.employee) redirect(`/employees/${v.employee.id}`);
  redirect("/login");
}
