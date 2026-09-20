import "server-only";

// Admin server dependency removed — this module returns a static config so the
// app runs standalone with all modules enabled.

export type AdminConfig = {
  hospital: {
    id: string;
    code: string;
    name: string;
    timezone: string;
    type: "EYE" | "GENERAL";
  };
  subscription: {
    planCode: string;
    planName: string;
    status: string;
    periodEnd: string;
  } | null;
  enabledModules: string[];
  billing: {
    status: "current" | "overdue";
    overdueInvoiceCount: number;
    oldestOverdueDate: string | null;
    bannerMessage: string | null;
  };
  fetchedAt: string;
  cacheMaxAgeSec: number;
};

const ALL_MODULES = [
  "patients",
  "doctor",
  "workup",
  "pharmacy",
  "optical",
  "labs",
  "inpatients",
  "insurance",
  "expenses",
  "license-tracker",
  "call-logs",
  "analytics",
  "reports",
  "vitals-extended",
];

const STATIC_CONFIG: AdminConfig = {
  hospital: {
    id: "local",
    code: "local",
    name: "Hospital",
    timezone: "Asia/Kolkata",
    type: "EYE",
  },
  subscription: null,
  enabledModules: ALL_MODULES,
  billing: {
    status: "current",
    overdueInvoiceCount: 0,
    oldestOverdueDate: null,
    bannerMessage: null,
  },
  fetchedAt: new Date(0).toISOString(),
  cacheMaxAgeSec: 60 * 60 * 24,
};

export async function getAdminConfig(): Promise<AdminConfig> {
  return STATIC_CONFIG;
}

export async function sendHeartbeat(_appVersion?: string): Promise<void> {
  void _appVersion;
}
