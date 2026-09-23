// TEMPORARY local data layer — replaces Supabase until it is re-added.
// Everything here is SAMPLE data, clearly labelled, never real employees.
// When Supabase comes back, delete this file and restore queries
// (schema is still in supabase/migrations/).
import { DEPARTMENTS } from "./departments";

export type Role = "manager" | "hr" | "data";
export type Person = {
  id: string; employee_no: string; name: string; role_title: string;
  status: "active" | "exit" | "resigned"; department_slug: string; manager_id: string | null;
};
export type Metric = {
  id: string; key: string; name: string; definition: string;
  weight: number; target: string; unit: string; is_placeholder: boolean;
};

export const DEMO_USERS: { id: string; full_name: string; role: Role; person_id: string | null }[] = [
  { id: "u-manager", full_name: "Demo Manager", role: "manager", person_id: "p-mgr" },
  { id: "u-hr",      full_name: "Demo HR",      role: "hr",      person_id: null },
  { id: "u-data",    full_name: "Demo Data",    role: "data",    person_id: null },
];

export const PEOPLE: Person[] = [
  { id: "p-mgr", employee_no: "SAMPLE-000", name: "Sample Manager", role_title: "F&B Manager", status: "active", department_slug: "fnb", manager_id: null },
  { id: "p-1", employee_no: "SAMPLE-001", name: "Sample Chef A", role_title: "Chef", status: "active", department_slug: "fnb", manager_id: "p-mgr" },
  { id: "p-2", employee_no: "SAMPLE-002", name: "Sample Chef B", role_title: "Chef", status: "active", department_slug: "fnb", manager_id: "p-mgr" },
  { id: "p-3", employee_no: "SAMPLE-003", name: "Sample Revenue Analyst", role_title: "Analyst", status: "active", department_slug: "revenue", manager_id: null },
];

const PLACEHOLDER_METRIC = (slug: string): Metric => ({
  id: `m-${slug}-placeholder`, key: `${slug}_placeholder`, name: "Placeholder metric",
  definition: "Pending sign-off from department lead", weight: 1, target: "TBD", unit: "", is_placeholder: true,
});

// F&B metric list is a stand-in until the real Hearth metrics are transcribed.
export const METRICS: Record<string, Metric[]> = Object.fromEntries(
  DEPARTMENTS.map((d) => [d.slug, [PLACEHOLDER_METRIC(d.slug)]])
);

export const REDASH_QUERY_IDS: Record<string, number | null> = Object.fromEntries(
  DEPARTMENTS.map((d) => [d.slug, null])
);

export function userById(id: string | undefined) {
  return DEMO_USERS.find((u) => u.id === id) ?? null;
}

// Mirrors the old RLS rule: managers see their own reports, HR/data see all.
export function visiblePeople(user: { role: Role; person_id: string | null }, deptSlug?: string) {
  let rows = PEOPLE;
  if (user.role === "manager") rows = rows.filter((p) => p.manager_id === user.person_id);
  if (deptSlug) rows = rows.filter((p) => p.department_slug === deptSlug);
  return [...rows].sort((a, b) => a.name.localeCompare(b.name));
}
