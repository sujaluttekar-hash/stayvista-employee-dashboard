// Single source of truth for the 12 departments. The `accent` field ties
// each department to one of the three brand identity colours (Bloom/Sky/
// Shine) purely for visual grouping in nav — it has no permission meaning.
export type Department = {
  slug: string;
  name: string;
  accent: "bloom" | "sky" | "shine";
  hasRealMetrics: boolean; // false = placeholder template, banner shows in UI
};

export const DEPARTMENTS: Department[] = [
  { slug: "fnb",                     name: "Culinary & F&B",              accent: "shine", hasRealMetrics: true },
  { slug: "revenue",                 name: "Revenue",                     accent: "bloom", hasRealMetrics: false },
  { slug: "kam",                     name: "KAM",                         accent: "sky",   hasRealMetrics: false },
  { slug: "tech",                    name: "Tech",                        accent: "sky",   hasRealMetrics: false },
  { slug: "people-success",          name: "People Success",              accent: "bloom", hasRealMetrics: false },
  { slug: "finance",                 name: "Finance",                     accent: "sky",   hasRealMetrics: false },
  { slug: "acquisition",             name: "Acquisition",                 accent: "bloom", hasRealMetrics: false },
  { slug: "operations",              name: "Operations",                  accent: "shine", hasRealMetrics: false },
  { slug: "facility-mgmt",           name: "Facility Management",         accent: "shine", hasRealMetrics: false },
  { slug: "events-experience",       name: "Events & Experience",         accent: "bloom", hasRealMetrics: false },
  { slug: "transformation-interiors",name: "Transformation and Interiors",accent: "sky",   hasRealMetrics: false },
  { slug: "brand-marketing",         name: "Brand & Marketing",           accent: "bloom", hasRealMetrics: false },
];

export function departmentBySlug(slug: string) {
  return DEPARTMENTS.find((d) => d.slug === slug);
}
