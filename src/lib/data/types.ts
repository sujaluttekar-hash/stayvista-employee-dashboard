// ─────────────────────────────────────────────────────────────────────
// Core data model. These types map 1:1 to future Supabase tables:
//   departments, employees, app_users, scorecards, scorecard_metrics,
//   audit_log. Keep field names snake_case-compatible when migrating.
// ─────────────────────────────────────────────────────────────────────

export type Department = {
  id: string;
  slug: string;
  name: string;
  accent: "bloom" | "sky" | "shine";
  has_real_metrics: boolean;
};

export type EmployeeStatus = "active" | "exit" | "resigned";

export type Employee = {
  id: string;
  employee_no: string;
  name: string;
  designation: string;
  department_id: string;
  status: EmployeeStatus;
  l1_manager_id: string | null; // direct manager — the only person who can edit this employee's scorecard
  l2_manager_id: string | null; // skip-level manager — shown for context, no edit rights
};

// A login. `is_admin` is the only stored permission; "manager" is derived
// from data (anyone with direct reports), so it can never drift from the org chart.
export type AppUser = {
  id: string;
  display_name: string;
  employee_id: string | null;
  is_admin: boolean;
};

export type MetricType = "manual" | "automatic";
export type MetricDirection = "higher_is_better" | "lower_is_better";
export type ActualSource = "manual" | "redash" | "demo";

// Where an automatic metric will get its data. Nothing is fetched until
// `query_id` is set — see src/lib/sources/.
export type AutomaticSourceConfig = {
  kind: "redash";
  query_id: number | null;
  value_column: string; // column holding the value, filtered by employee_no + period
};

export type ScorecardMetric = {
  id: string;
  scorecard_id: string;
  name: string;
  description: string;
  type: MetricType;
  unit: "%" | "count" | "days" | "hours" | "score";
  direction: MetricDirection;
  target: number;
  weight: number; // percent, all metrics on a scorecard should add up to 100
  actual: number | null;
  actual_source: ActualSource | null;
  source_config: AutomaticSourceConfig | null; // only for automatic metrics
  updated_at: string | null;
  updated_by: string | null; // AppUser.id, or "seed" for sample data
  sort_order: number;
};

export type ReviewPeriod = { id: string; label: string; starts: string; ends: string };

export type Scorecard = {
  id: string;
  employee_id: string;
  period_id: string;
};

export type AuditEntry = {
  id: string;
  at: string;
  actor_id: string;
  action: string;         // e.g. "metric.update", "employee.assign_manager"
  entity_id: string;
  summary: string;        // human-readable, shown in UI
};

export type Store = {
  version: number;
  departments: Department[];
  employees: Employee[];
  users: AppUser[];
  periods: ReviewPeriod[];
  scorecards: Scorecard[];
  metrics: ScorecardMetric[];
  audit: AuditEntry[];
};
