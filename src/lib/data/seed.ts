// ─────────────────────────────────────────────────────────────────────
// PREVIEW SEED DATA. Loaded the first time the preview store is created
// and again whenever an admin clicks "Reset preview data".
//
// • BI team names (Ronak, Sujal, Aditya, Dhanesh) are real; their
//   designations, targets and hierarchy are PROPOSED for testing only.
// • "Head of Data (sample)" is a placeholder person, not a real employee.
// • Manual actuals marked updated_by: "seed" are sample values.
// • Automatic metrics start EMPTY on purpose — no fake "live" numbers.
// ─────────────────────────────────────────────────────────────────────
import type { Department, Employee, AppUser, ReviewPeriod, Scorecard, ScorecardMetric, Store } from "./types";

export const STORE_VERSION = 2;

const DEPARTMENTS: Department[] = [
  { id: "d-bi", slug: "business-intelligence", name: "Business Intelligence / Data", accent: "sky", has_real_metrics: true },
  { id: "d-fnb", slug: "fnb", name: "Culinary & F&B", accent: "shine", has_real_metrics: false },
  { id: "d-revenue", slug: "revenue", name: "Revenue", accent: "bloom", has_real_metrics: false },
  { id: "d-kam", slug: "kam", name: "KAM", accent: "sky", has_real_metrics: false },
  { id: "d-tech", slug: "tech", name: "Tech", accent: "sky", has_real_metrics: false },
  { id: "d-people", slug: "people-success", name: "People Success", accent: "bloom", has_real_metrics: false },
  { id: "d-finance", slug: "finance", name: "Finance", accent: "sky", has_real_metrics: false },
  { id: "d-acq", slug: "acquisition", name: "Acquisition", accent: "bloom", has_real_metrics: false },
  { id: "d-ops", slug: "operations", name: "Operations", accent: "shine", has_real_metrics: false },
  { id: "d-fm", slug: "facility-mgmt", name: "Facility Management", accent: "shine", has_real_metrics: false },
  { id: "d-events", slug: "events-experience", name: "Events & Experience", accent: "bloom", has_real_metrics: false },
  { id: "d-ti", slug: "transformation-interiors", name: "Transformation and Interiors", accent: "sky", has_real_metrics: false },
  { id: "d-brand", slug: "brand-marketing", name: "Brand & Marketing", accent: "bloom", has_real_metrics: false },
];

// Hierarchy (proposed, for testing permissions):
//   Head of Data (sample)
//   └── Ronak
//       ├── Sujal
//       └── Aditya
//           └── Dhanesh
const EMPLOYEES: Employee[] = [
  { id: "e-head", employee_no: "SAMPLE-100", name: "Head of Data (sample)", designation: "Head of Data", department_id: "d-bi", status: "active", l1_manager_id: null, l2_manager_id: null },
  { id: "e-ronak", employee_no: "BI-001", name: "Ronak", designation: "BI Lead", department_id: "d-bi", status: "active", l1_manager_id: "e-head", l2_manager_id: null },
  { id: "e-sujal", employee_no: "BI-002", name: "Sujal", designation: "Data Analyst — Automation", department_id: "d-bi", status: "active", l1_manager_id: "e-ronak", l2_manager_id: "e-head" },
  { id: "e-aditya", employee_no: "BI-003", name: "Aditya", designation: "Senior Data Analyst", department_id: "d-bi", status: "active", l1_manager_id: "e-ronak", l2_manager_id: "e-head" },
  { id: "e-dhanesh", employee_no: "BI-004", name: "Dhanesh", designation: "Data Analyst", department_id: "d-bi", status: "active", l1_manager_id: "e-aditya", l2_manager_id: "e-ronak" },
];

const USERS: AppUser[] = [
  { id: "u-admin", display_name: "Admin (Head of Data, sample)", employee_id: "e-head", is_admin: true },
  { id: "u-ronak", display_name: "Ronak", employee_id: "e-ronak", is_admin: false },
  { id: "u-sujal", display_name: "Sujal", employee_id: "e-sujal", is_admin: false },
  { id: "u-aditya", display_name: "Aditya", employee_id: "e-aditya", is_admin: false },
  { id: "u-dhanesh", display_name: "Dhanesh", employee_id: "e-dhanesh", is_admin: false },
];

const PERIODS: ReviewPeriod[] = [
  { id: "2026-q3", label: "Jul – Sep 2026", starts: "2026-07-01", ends: "2026-09-30" },
  { id: "2026-q4", label: "Oct – Dec 2026", starts: "2026-10-01", ends: "2026-12-31" },
];

type MetricSeed = Omit<ScorecardMetric, "id" | "scorecard_id" | "sort_order" | "actual_source" | "updated_at" | "updated_by" | "source_config" | "actual"> & {
  actual?: number;
};

const redash = { kind: "redash" as const, query_id: null, value_column: "value" };

const METRICS_BY_EMPLOYEE: Record<string, MetricSeed[]> = {
  "e-head": [
    { name: "BI roadmap delivery", description: "Share of committed roadmap items shipped this quarter", type: "manual", unit: "%", direction: "higher_is_better", target: 90, weight: 50 },
    { name: "Data quality incidents", description: "Reported data errors reaching business users", type: "automatic", unit: "count", direction: "lower_is_better", target: 2, weight: 50 },
  ],
  "e-ronak": [
    { name: "Revenue reporting accuracy", description: "Revenue reports matching finance close figures", type: "automatic", unit: "%", direction: "higher_is_better", target: 98, weight: 25 },
    { name: "Dashboard automation", description: "Manual reports replaced by automated dashboards", type: "manual", unit: "count", direction: "higher_is_better", target: 5, weight: 20, actual: 4 },
    { name: "Team request SLA", description: "Data requests closed within agreed turnaround", type: "automatic", unit: "%", direction: "higher_is_better", target: 90, weight: 25 },
    { name: "Stakeholder satisfaction", description: "Quarterly survey score from department heads (out of 5)", type: "manual", unit: "score", direction: "higher_is_better", target: 4.5, weight: 15 },
    { name: "Team capability building", description: "Trainings or knowledge sessions run for the team", type: "manual", unit: "count", direction: "higher_is_better", target: 3, weight: 15, actual: 2 },
  ],
  "e-sujal": [
    { name: "Automation scripts shipped", description: "Bots or pipelines moved to production", type: "manual", unit: "count", direction: "higher_is_better", target: 4, weight: 30, actual: 3 },
    { name: "Manual hours saved", description: "Estimated team hours saved per month by automations", type: "manual", unit: "hours", direction: "higher_is_better", target: 40, weight: 25, actual: 32 },
    { name: "Pipeline uptime", description: "Scheduled syncs completing without failure", type: "automatic", unit: "%", direction: "higher_is_better", target: 99, weight: 25 },
    { name: "Request turnaround", description: "Average days to close an ad-hoc data request", type: "automatic", unit: "days", direction: "lower_is_better", target: 2, weight: 20 },
  ],
  "e-aditya": [
    { name: "Revenue reporting accuracy", description: "Revenue reports matching finance close figures", type: "automatic", unit: "%", direction: "higher_is_better", target: 98, weight: 30 },
    { name: "Dashboards delivered", description: "New dashboards signed off by the requesting team", type: "manual", unit: "count", direction: "higher_is_better", target: 5, weight: 25, actual: 5 },
    { name: "Request turnaround", description: "Average days to close an ad-hoc data request", type: "automatic", unit: "days", direction: "lower_is_better", target: 2, weight: 20 },
    { name: "Analysis reviews", description: "Junior analyses reviewed before they go to stakeholders", type: "manual", unit: "count", direction: "higher_is_better", target: 6, weight: 25 },
  ],
  "e-dhanesh": [
    { name: "Report accuracy", description: "Recurring reports shipped without a correction", type: "automatic", unit: "%", direction: "higher_is_better", target: 97, weight: 30 },
    { name: "On-time report delivery", description: "Recurring reports delivered by their scheduled time", type: "manual", unit: "%", direction: "higher_is_better", target: 95, weight: 30, actual: 88 },
    { name: "Request turnaround", description: "Average days to close an ad-hoc data request", type: "automatic", unit: "days", direction: "lower_is_better", target: 3, weight: 20 },
    { name: "Learning milestones", description: "Agreed courses or certifications completed", type: "manual", unit: "count", direction: "higher_is_better", target: 2, weight: 20 },
  ],
};

export function buildSeed(): Store {
  const now = new Date().toISOString();
  const scorecards: Scorecard[] = [];
  const metrics: ScorecardMetric[] = [];

  for (const [employeeId, list] of Object.entries(METRICS_BY_EMPLOYEE)) {
    const sc: Scorecard = { id: `sc-${employeeId}-2026-q3`, employee_id: employeeId, period_id: "2026-q3" };
    scorecards.push(sc);
    list.forEach((m, i) => {
      const hasActual = m.actual !== undefined;
      metrics.push({
        ...m,
        id: `${sc.id}-m${i + 1}`,
        scorecard_id: sc.id,
        sort_order: i,
        actual: hasActual ? m.actual! : null,
        actual_source: hasActual ? "manual" : null,
        source_config: m.type === "automatic" ? { ...redash } : null,
        updated_at: hasActual ? now : null,
        updated_by: hasActual ? "seed" : null,
      });
    });
  }

  return {
    version: STORE_VERSION,
    departments: DEPARTMENTS,
    employees: EMPLOYEES,
    users: USERS,
    periods: PERIODS,
    scorecards,
    metrics,
    audit: [],
  };
}
