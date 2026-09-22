import { authHandlers } from "./auth"
import { dashboardHandlers } from "./dashboard"
import { patientCareHandlers } from "./patient-care"
import { queueHandlers } from "./queue"
import { workupHandlers } from "./workup"
import { doctorHandlers } from "./doctor"
import { billingHandlers } from "./billing"
import { pharmacyHandlers } from "./pharmacy"
import { opticalHandlers } from "./optical"
import { labsHandlers } from "./labs"
import { insuranceHandlers } from "./insurance"
import { staffHandlers } from "./staff"
import { settingsHandlers } from "./settings"
import { expensesHandlers } from "./expenses"
import { duesFollowupsHandlers } from "./dues-followups"
import { callLogsHandlers } from "./call-logs"
import { licenseTrackerHandlers } from "./license-tracker"
import { analyticsHandlers } from "./analytics"
import { reportsHandlers } from "./reports"

export const handlers = [
  ...authHandlers,
  ...dashboardHandlers,
  ...patientCareHandlers,
  ...queueHandlers,
  ...workupHandlers,
  ...doctorHandlers,
  ...billingHandlers,
  ...pharmacyHandlers,
  ...opticalHandlers,
  ...labsHandlers,
  ...insuranceHandlers,
  ...staffHandlers,
  ...settingsHandlers,
  ...expensesHandlers,
  ...duesFollowupsHandlers,
  ...callLogsHandlers,
  ...licenseTrackerHandlers,
  ...analyticsHandlers,
  ...reportsHandlers,
]
