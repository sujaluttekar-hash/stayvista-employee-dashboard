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
  { id: "a4994450-42cb-4d2f-8721-0326409da2f1", slug: "sales", name: "Sales", accent: "sky", has_real_metrics: false },
  { id: "bb97dda3-bda5-4c3f-b940-102fceeeb2c3", slug: "stake-holder-finance-services", name: "Stake Holder Finance Services", accent: "shine", has_real_metrics: false },
  { id: "ece872c9-2ec4-4be4-bafb-4a54f4d83cee", slug: "revenue", name: "Revenue", accent: "bloom", has_real_metrics: false },
  { id: "e5152f65-bc2e-44fc-b5c4-bc2804518eec", slug: "supply-growth", name: "Supply Growth", accent: "sky", has_real_metrics: false },
  { id: "39cc8b0b-f20d-4642-97f1-34022fb955ba", slug: "financial-control-and-support", name: "Financial Control & Support", accent: "shine", has_real_metrics: false },
  { id: "72cc939f-6f18-413f-b247-e2b87ae1347a", slug: "key-account", name: "Key Account", accent: "bloom", has_real_metrics: false },
  { id: "d9cd8361-d386-4349-932d-cb9e069d19ec", slug: "channel", name: "Channel", accent: "sky", has_real_metrics: false },
  { id: "f408f6ff-c5f0-46b1-ba98-5f78f9c4dfa5", slug: "product", name: "Product", accent: "shine", has_real_metrics: false },
  { id: "20f02948-042b-4323-aea6-783f3f65ba40", slug: "it", name: "IT", accent: "bloom", has_real_metrics: false },
  { id: "3a3212ea-95bb-495e-8629-008042248871", slug: "reservation", name: "Reservation", accent: "sky", has_real_metrics: false },
  { id: "c6c846c5-c837-46c4-ab7a-78ed0fd27779", slug: "vista-signature-experience", name: "Vista Signature Experience", accent: "shine", has_real_metrics: false },
  { id: "dfe3b3d1-7cdc-4e09-b5ed-03d109f35091", slug: "retention", name: "Retention", accent: "bloom", has_real_metrics: false },
  { id: "ffacceb8-149f-4196-b88a-4b888e025916", slug: "brand-strategy-and-partnership", name: "Brand Strategy & Partnership", accent: "sky", has_real_metrics: false },
  { id: "58a5c84b-e3e9-4b59-a8b1-9ae7f4b32586", slug: "property-maintenance", name: "Property Maintenance", accent: "shine", has_real_metrics: false },
  { id: "e5810c11-92b9-454b-90f8-e31071afff42", slug: "stay-experience", name: "Stay Experience", accent: "bloom", has_real_metrics: false },
  { id: "93775a28-b7de-4042-8b1a-cd85f8dd5e91", slug: "photography", name: "Photography", accent: "sky", has_real_metrics: false },
  { id: "795fc772-d620-48ba-becc-3eb7fcce1f3d", slug: "property-ops", name: "Property Ops", accent: "shine", has_real_metrics: false },
  { id: "8fa78730-140f-4c5f-a41f-88668fd58e4a", slug: "operations-and-strategy", name: "Operations & Strategy", accent: "bloom", has_real_metrics: false },
  { id: "21be72be-93b7-4e73-bf9b-9e67c2d42459", slug: "guest-support", name: "Guest Support", accent: "sky", has_real_metrics: false },
  { id: "f8369df7-2fe5-410b-b03c-42d90517d5e0", slug: "engineering", name: "Engineering", accent: "shine", has_real_metrics: false },
  { id: "3935d3c5-dc2c-4280-a1b8-5db1c46e5c90", slug: "procurement", name: "Procurement", accent: "bloom", has_real_metrics: false },
  { id: "0309dc96-fc3f-4221-bb0d-06e0e05e7540", slug: "founders-office", name: "Founder's Office", accent: "sky", has_real_metrics: false },
  { id: "e3e099b7-d1da-444f-9a83-a7b743f184de", slug: "chef", name: "Chef", accent: "shine", has_real_metrics: false },
  { id: "5b969951-cdb6-4bb4-9abe-b360f3b46988", slug: "acquisition", name: "Acquisition", accent: "bloom", has_real_metrics: false },
  { id: "b4de9782-6a13-442a-9ecd-8b514f17a554", slug: "audit", name: "Audit", accent: "sky", has_real_metrics: false },
  { id: "d502ca6f-e706-4a6b-8f80-67e4dd06cc32", slug: "brand-communication", name: "Brand Communication", accent: "shine", has_real_metrics: false },
  { id: "7608e015-b9e8-4a90-b76c-27bb56aa19c6", slug: "design", name: "Design", accent: "bloom", has_real_metrics: false },
  { id: "46f275e4-9d35-45e5-bd4b-17ad715531a4", slug: "food-and-beverage", name: "F&B Ops", accent: "sky", has_real_metrics: false },
  { id: "178c41fe-56a8-4db7-bc0d-a676ceae1ce7", slug: "am-ops", name: "AM Ops", accent: "shine", has_real_metrics: false },
  { id: "bbb28eb7-fa92-46e8-a46c-ffc33d468227", slug: "process-optimization", name: "Process Optimization", accent: "bloom", has_real_metrics: false },
  { id: "a69ba122-c7fa-4e1c-9a23-c7b294aa1e5e", slug: "account-management-central", name: "Account Management Central", accent: "sky", has_real_metrics: false },
  { id: "664757d9-6afe-44e7-9596-e99aa592caf2", slug: "legal-and-compliance", name: "Legal & Compliance", accent: "shine", has_real_metrics: false },
  { id: "61660b86-93f8-4f60-9ebc-b4d86225c02b", slug: "facility-management-services", name: "Facility Management Services", accent: "bloom", has_real_metrics: false },
  { id: "c5704524-4285-4c1c-9e77-9589245da708", slug: "operations", name: "Operations", accent: "sky", has_real_metrics: false },
  { id: "f6e21cc1-088a-4157-b338-f8fee700c2bb", slug: "talent-acquisition", name: "Talent Acquisition", accent: "shine", has_real_metrics: false },
  { id: "77775d6d-609d-40b2-b373-6b2730b6ef67", slug: "creative-studio", name: "Creative Studio", accent: "bloom", has_real_metrics: false },
  { id: "12c3c502-1f18-4885-80a1-f69f0452747e", slug: "business-intelligence", name: "Business Intelligence", accent: "sky", has_real_metrics: true },
  { id: "fcc00397-e00d-4fc5-bf79-71bdde7f0ad0", slug: "events-and-experience", name: "Events & Experience", accent: "shine", has_real_metrics: false },
  { id: "8ad8af03-2668-453d-865a-1c2774435154", slug: "stay-ops", name: "Stay Ops", accent: "bloom", has_real_metrics: false },
  { id: "1b825ac3-abfa-4a69-a71e-594ddfced89e", slug: "lead-management", name: "Lead Management", accent: "sky", has_real_metrics: false },
  { id: "fdab28be-9dbf-4105-8d2f-177ca88be99a", slug: "resorts-and-residences", name: "Resorts & Residences", accent: "shine", has_real_metrics: false },
  { id: "77556c06-4a57-4812-bce7-f5e8b6943e03", slug: "butler", name: "Butler", accent: "bloom", has_real_metrics: false },
  { id: "2b4a9448-c115-42f2-a12e-f1f168079848", slug: "admin", name: "Admin", accent: "sky", has_real_metrics: false },
  { id: "4c6bdbbb-d2c3-451a-8c53-ec4c849aaf57", slug: "organization-development-and-landd", name: "Organization Development & L&D", accent: "shine", has_real_metrics: false },
  { id: "b8afdc5f-224f-41c5-bca1-ecf66252ae8b", slug: "growth-marketing", name: "Growth Marketing", accent: "bloom", has_real_metrics: false },
  { id: "bcb14490-b8f7-4501-8e7e-f3a0056c6fdc", slug: "intelligence", name: "Intelligence", accent: "sky", has_real_metrics: false },
  { id: "32df338f-eb9d-4d49-8bfd-740b0f4786f6", slug: "people-success", name: "People Success", accent: "shine", has_real_metrics: false },
  { id: "db6f36a2-1561-414a-aad1-75b3156079bc", slug: "finance-and-accounts", name: "Finance & Accounts", accent: "bloom", has_real_metrics: false },
  { id: "1f97bc17-ce81-45d5-b1da-d3ae922a91d5", slug: "corporate-sales", name: "Corporate Sales", accent: "sky", has_real_metrics: false },
];

// Employees are records managed from the Management tab (HR / Data).
// Hierarchy (proposed, for testing):  Ronak → Sujal, Aditya;  Aditya → Dhanesh
const EMPLOYEES: Employee[] = [
  { id: "8aaaf346-e31d-4fbb-b04e-92c1ee5dcde9", employee_no: "BI-001", name: "Ronak", designation: "BI Lead", department_id: "12c3c502-1f18-4885-80a1-f69f0452747e", status: "active", l1_manager_id: null, l2_manager_id: null },
  { id: "07ff6885-1d83-47d5-adcc-51bb29ebff32", employee_no: "BI-002", name: "Sujal", designation: "Data Analyst — Automation", department_id: "12c3c502-1f18-4885-80a1-f69f0452747e", status: "active", l1_manager_id: "8aaaf346-e31d-4fbb-b04e-92c1ee5dcde9", l2_manager_id: null },
  { id: "db7952e1-aa34-4e43-a691-eff765c492db", employee_no: "BI-003", name: "Aditya", designation: "Senior Data Analyst", department_id: "12c3c502-1f18-4885-80a1-f69f0452747e", status: "active", l1_manager_id: "8aaaf346-e31d-4fbb-b04e-92c1ee5dcde9", l2_manager_id: null },
  { id: "329a9467-5fe7-420a-8096-6ec2484c64b7", employee_no: "BI-004", name: "Dhanesh", designation: "Data Analyst", department_id: "12c3c502-1f18-4885-80a1-f69f0452747e", status: "active", l1_manager_id: "db7952e1-aa34-4e43-a691-eff765c492db", l2_manager_id: "8aaaf346-e31d-4fbb-b04e-92c1ee5dcde9" },
];

// The ONLY three logins.
const USERS: AppUser[] = [
  { id: "u-hr", display_name: "HR", role: "hr" },
  { id: "u-manager", display_name: "Manager", role: "manager" },
  { id: "u-data", display_name: "Data team", role: "data" },
];

// Scorecards run month to month, not quarterly.
const PERIODS: ReviewPeriod[] = [
  { id: "2026-01", label: "January 2026", starts: "2026-01-01", ends: "2026-01-31" },
  { id: "2026-02", label: "February 2026", starts: "2026-02-01", ends: "2026-02-28" },
  { id: "2026-03", label: "March 2026", starts: "2026-03-01", ends: "2026-03-31" },
  { id: "2026-04", label: "April 2026", starts: "2026-04-01", ends: "2026-04-30" },
  { id: "2026-05", label: "May 2026", starts: "2026-05-01", ends: "2026-05-31" },
  { id: "2026-06", label: "June 2026", starts: "2026-06-01", ends: "2026-06-30" },
  { id: "2026-07", label: "July 2026", starts: "2026-07-01", ends: "2026-07-31" },
  { id: "2026-08", label: "August 2026", starts: "2026-08-01", ends: "2026-08-31" },
  { id: "2026-09", label: "September 2026", starts: "2026-09-01", ends: "2026-09-30" },
  { id: "2026-10", label: "October 2026", starts: "2026-10-01", ends: "2026-10-31" },
  { id: "2026-11", label: "November 2026", starts: "2026-11-01", ends: "2026-11-30" },
  { id: "2026-12", label: "December 2026", starts: "2026-12-01", ends: "2026-12-31" },
];

type MetricSeed = Omit<ScorecardMetric, "id" | "scorecard_id" | "sort_order" | "actual_source" | "updated_at" | "updated_by" | "source_config" | "actual"> & {
  actual?: number;
};

const redash = { kind: "redash" as const, query_id: null, value_column: "value" };

// Fixed UUIDs for the 4 seeded scorecards + their metrics, matching the
// explicit ids inserted by supabase/migrations/0004_seed_bi_team.sql --
// same reason as employee/department ids: the local demo store and
// Supabase must share primary keys for writes (adding a metric,
// updating an existing one) to hit a real row on both sides.
const SCORECARD_IDS: Record<string, string> = {
  "8aaaf346-e31d-4fbb-b04e-92c1ee5dcde9": "eedf7a15-99f4-4965-8035-9545ee643edc",
  "07ff6885-1d83-47d5-adcc-51bb29ebff32": "fed7db37-8744-4973-a65c-da70ad96980c",
  "db7952e1-aa34-4e43-a691-eff765c492db": "391a152a-3e39-4aa6-a051-aaa9f6011338",
  "329a9467-5fe7-420a-8096-6ec2484c64b7": "8b9bab41-5693-415c-8e0d-c3cb73e9acb7",
};
const METRIC_IDS: Record<string, string[]> = {
  "8aaaf346-e31d-4fbb-b04e-92c1ee5dcde9": [
    "2f2f840a-1a95-4492-8fd7-0f32463f20b6",
    "7606924c-4253-46b1-acce-3361aa853df0",
    "8d6cc18b-6d22-4efb-a3a9-87c783d3c7bd",
    "1d08fc38-b24b-4d94-8dab-4b46c5cb4bc3",
    "2d144702-a0a7-4fee-8e70-6fa781a7005c",
  ],
  "07ff6885-1d83-47d5-adcc-51bb29ebff32": [
    "34833ac9-df64-43d3-af36-9221784be42f",
    "88ecd36f-964a-4727-adb0-f77bb0f0c29d",
    "daef90ec-5c30-4ede-abb9-ac720169d880",
    "932f1bd3-aa73-4042-8435-350004896c3a",
  ],
  "db7952e1-aa34-4e43-a691-eff765c492db": [
    "f1feab89-1f2f-4ac4-bb90-ad1acfd9063b",
    "c27ce169-21fa-4c4e-9f9c-b4c5788e4eaa",
    "e270fc16-df8f-4531-acf1-29944f559604",
    "fe748a4e-d947-4574-afc0-82d9524f749a",
  ],
  "329a9467-5fe7-420a-8096-6ec2484c64b7": [
    "21200e96-9855-4f56-bfb1-c934ed1faa98",
    "b6687b97-e090-4c75-afcb-1d4dd406071b",
    "49dfdb4b-149e-413a-afcf-6ad5ade18756",
    "a94e8e69-94b4-45ed-a226-32e9535497ef",
  ],
};

const METRICS_BY_EMPLOYEE: Record<string, MetricSeed[]> = {
  "8aaaf346-e31d-4fbb-b04e-92c1ee5dcde9": [
    { name: "Revenue reporting accuracy", description: "Revenue reports matching finance close figures", type: "automatic", unit: "%", direction: "higher_is_better", target: 98, weight: 25 },
    { name: "Dashboard automation", description: "Manual reports replaced by automated dashboards", type: "manual", unit: "count", direction: "higher_is_better", target: 5, weight: 20, actual: 4 },
    { name: "Team request SLA", description: "Data requests closed within agreed turnaround", type: "automatic", unit: "%", direction: "higher_is_better", target: 90, weight: 25 },
    { name: "Stakeholder satisfaction", description: "Quarterly survey score from department heads (out of 5)", type: "manual", unit: "score", direction: "higher_is_better", target: 4.5, weight: 15 },
    { name: "Team capability building", description: "Trainings or knowledge sessions run for the team", type: "manual", unit: "count", direction: "higher_is_better", target: 3, weight: 15, actual: 2 },
  ],
  "07ff6885-1d83-47d5-adcc-51bb29ebff32": [
    { name: "Automation scripts shipped", description: "Bots or pipelines moved to production", type: "manual", unit: "count", direction: "higher_is_better", target: 4, weight: 30, actual: 3 },
    { name: "Manual hours saved", description: "Estimated team hours saved per month by automations", type: "manual", unit: "hours", direction: "higher_is_better", target: 40, weight: 25, actual: 32 },
    { name: "Pipeline uptime", description: "Scheduled syncs completing without failure", type: "automatic", unit: "%", direction: "higher_is_better", target: 99, weight: 25 },
    { name: "Request turnaround", description: "Average days to close an ad-hoc data request", type: "automatic", unit: "days", direction: "lower_is_better", target: 2, weight: 20 },
  ],
  "db7952e1-aa34-4e43-a691-eff765c492db": [
    { name: "Revenue reporting accuracy", description: "Revenue reports matching finance close figures", type: "automatic", unit: "%", direction: "higher_is_better", target: 98, weight: 30 },
    { name: "Dashboards delivered", description: "New dashboards signed off by the requesting team", type: "manual", unit: "count", direction: "higher_is_better", target: 5, weight: 25, actual: 5 },
    { name: "Request turnaround", description: "Average days to close an ad-hoc data request", type: "automatic", unit: "days", direction: "lower_is_better", target: 2, weight: 20 },
    { name: "Analysis reviews", description: "Junior analyses reviewed before they go to stakeholders", type: "manual", unit: "count", direction: "higher_is_better", target: 6, weight: 25 },
  ],
  "329a9467-5fe7-420a-8096-6ec2484c64b7": [
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
    const scId = SCORECARD_IDS[employeeId];
    const sc: Scorecard = { id: scId, employee_id: employeeId, period_id: "2026-09" };
    scorecards.push(sc);
    list.forEach((m, i) => {
      const hasActual = m.actual !== undefined;
      metrics.push({
        ...m,
        id: METRIC_IDS[employeeId][i],
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
