// ─────────────────────────────────────────────────────────────────────
// PREVIEW SEED DATA. Loaded the first time the preview store is created
// and again whenever an admin clicks "Reset preview data".
//
// • BI team names (Ronak, Sujal, Aditya, Dhanesh) are real; their
//   designations, targets and hierarchy are PROPOSED for testing only.
// • Manual actuals marked updated_by: "seed" are sample values.
// • Automatic metrics start EMPTY on purpose — no fake "live" numbers.
// ─────────────────────────────────────────────────────────────────────
import type { Department, Employee, AppUser, ReviewPeriod, Scorecard, ScorecardMetric, Store } from "./types";

export const STORE_VERSION = 3;

const DEPARTMENTS: Department[] = [
  { id: "d-management", slug: "management", name: "Management", accent: "bloom", has_real_metrics: false },
  { id: "d-sales", slug: "sales", name: "Sales", accent: "sky", has_real_metrics: false },
  { id: "d-stake-holder-finance-services", slug: "stake-holder-finance-services", name: "Stake Holder Finance Services", accent: "shine", has_real_metrics: false },
  { id: "d-revenue", slug: "revenue", name: "Revenue", accent: "bloom", has_real_metrics: false },
  { id: "d-supply-growth", slug: "supply-growth", name: "Supply Growth", accent: "sky", has_real_metrics: false },
  { id: "d-financial-control-and-support", slug: "financial-control-and-support", name: "Financial Control & Support", accent: "shine", has_real_metrics: false },
  { id: "d-key-account", slug: "key-account", name: "Key Account", accent: "bloom", has_real_metrics: false },
  { id: "d-channel", slug: "channel", name: "Channel", accent: "sky", has_real_metrics: false },
  { id: "d-product", slug: "product", name: "Product", accent: "shine", has_real_metrics: false },
  { id: "d-it", slug: "it", name: "IT", accent: "bloom", has_real_metrics: false },
  { id: "d-reservation", slug: "reservation", name: "Reservation", accent: "sky", has_real_metrics: false },
  { id: "d-vista-signature-experience", slug: "vista-signature-experience", name: "Vista Signature Experience", accent: "shine", has_real_metrics: false },
  { id: "d-retention", slug: "retention", name: "Retention", accent: "bloom", has_real_metrics: false },
  { id: "d-brand-strategy-and-partnership", slug: "brand-strategy-and-partnership", name: "Brand Strategy & Partnership", accent: "sky", has_real_metrics: false },
  { id: "d-property-maintenance", slug: "property-maintenance", name: "Property Maintenance", accent: "shine", has_real_metrics: false },
  { id: "d-stay-experience", slug: "stay-experience", name: "Stay Experience", accent: "bloom", has_real_metrics: false },
  { id: "d-photography", slug: "photography", name: "Photography", accent: "sky", has_real_metrics: false },
  { id: "d-property-ops", slug: "property-ops", name: "Property Ops", accent: "shine", has_real_metrics: false },
  { id: "d-operations-and-strategy", slug: "operations-and-strategy", name: "Operations & Strategy", accent: "bloom", has_real_metrics: false },
  { id: "d-guest-support", slug: "guest-support", name: "Guest Support", accent: "sky", has_real_metrics: false },
  { id: "d-engineering", slug: "engineering", name: "Engineering", accent: "shine", has_real_metrics: false },
  { id: "d-procurement", slug: "procurement", name: "Procurement", accent: "bloom", has_real_metrics: false },
  { id: "d-founders-office", slug: "founders-office", name: "Founder's Office", accent: "sky", has_real_metrics: false },
  { id: "d-chef", slug: "chef", name: "Chef", accent: "shine", has_real_metrics: false },
  { id: "d-acquisition", slug: "acquisition", name: "Acquisition", accent: "bloom", has_real_metrics: false },
  { id: "d-audit", slug: "audit", name: "Audit", accent: "sky", has_real_metrics: false },
  { id: "d-brand-communication", slug: "brand-communication", name: "Brand Communication", accent: "shine", has_real_metrics: false },
  { id: "d-design", slug: "design", name: "Design", accent: "bloom", has_real_metrics: false },
  { id: "d-food-and-beverage", slug: "food-and-beverage", name: "Food & Beverage", accent: "sky", has_real_metrics: false },
  { id: "d-am-ops", slug: "am-ops", name: "AM Ops", accent: "shine", has_real_metrics: false },
  { id: "d-process-optimization", slug: "process-optimization", name: "Process Optimization", accent: "bloom", has_real_metrics: false },
  { id: "d-account-management-central", slug: "account-management-central", name: "Account Management Central", accent: "sky", has_real_metrics: false },
  { id: "d-legal-and-compliance", slug: "legal-and-compliance", name: "Legal & Compliance", accent: "shine", has_real_metrics: false },
  { id: "d-facility-management-services", slug: "facility-management-services", name: "Facility Management Services", accent: "bloom", has_real_metrics: false },
  { id: "d-operations", slug: "operations", name: "Operations", accent: "sky", has_real_metrics: false },
  { id: "d-talent-acquisition", slug: "talent-acquisition", name: "Talent Acquisition", accent: "shine", has_real_metrics: false },
  { id: "d-creative-studio", slug: "creative-studio", name: "Creative Studio", accent: "bloom", has_real_metrics: false },
  { id: "d-business-intelligence", slug: "business-intelligence", name: "Business Intelligence", accent: "sky", has_real_metrics: true },
  { id: "d-events-and-experience", slug: "events-and-experience", name: "Events & Experience", accent: "shine", has_real_metrics: false },
  { id: "d-stay-ops", slug: "stay-ops", name: "Stay Ops", accent: "bloom", has_real_metrics: false },
  { id: "d-lead-management", slug: "lead-management", name: "Lead Management", accent: "sky", has_real_metrics: false },
  { id: "d-resorts-and-residences", slug: "resorts-and-residences", name: "Resorts & Residences", accent: "shine", has_real_metrics: false },
  { id: "d-butler", slug: "butler", name: "Butler", accent: "bloom", has_real_metrics: false },
  { id: "d-admin", slug: "admin", name: "Admin", accent: "sky", has_real_metrics: false },
  { id: "d-organization-development-and-landd", slug: "organization-development-and-landd", name: "Organization Development & L&D", accent: "shine", has_real_metrics: false },
  { id: "d-growth-marketing", slug: "growth-marketing", name: "Growth Marketing", accent: "bloom", has_real_metrics: false },
  { id: "d-intelligence", slug: "intelligence", name: "Intelligence", accent: "sky", has_real_metrics: false },
  { id: "d-people-success", slug: "people-success", name: "People Success", accent: "shine", has_real_metrics: false },
  { id: "d-finance-and-accounts", slug: "finance-and-accounts", name: "Finance & Accounts", accent: "bloom", has_real_metrics: false },
  { id: "d-corporate-sales", slug: "corporate-sales", name: "Corporate Sales", accent: "sky", has_real_metrics: false },
];

// Employees are records managed from the Management tab (HR / Data).
// Hierarchy (proposed, for testing):  Ronak → Sujal, Aditya;  Aditya → Dhanesh
const EMPLOYEES: Employee[] = [
  { id: "e-ronak", employee_no: "BI-001", name: "Ronak", designation: "BI Lead", department_id: "d-bi", status: "active", l1_manager_id: null, l2_manager_id: null },
  { id: "e-sujal", employee_no: "BI-002", name: "Sujal", designation: "Data Analyst — Automation", department_id: "d-bi", status: "active", l1_manager_id: "e-ronak", l2_manager_id: null },
  { id: "e-aditya", employee_no: "BI-003", name: "Aditya", designation: "Senior Data Analyst", department_id: "d-bi", status: "active", l1_manager_id: "e-ronak", l2_manager_id: null },
  { id: "e-dhanesh", employee_no: "BI-004", name: "Dhanesh", designation: "Data Analyst", department_id: "d-bi", status: "active", l1_manager_id: "e-aditya", l2_manager_id: "e-ronak" },
];

// The ONLY three logins.
const USERS: AppUser[] = [
  { id: "u-hr", display_name: "HR", role: "hr" },
  { id: "u-manager", display_name: "Manager", role: "manager" },
  { id: "u-data", display_name: "Data team", role: "data" },
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
