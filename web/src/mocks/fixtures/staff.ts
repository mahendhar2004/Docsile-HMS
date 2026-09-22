/**
 * Mock fixture data for the Staff module.
 * Role permissions built from ALL_PERMISSIONS catalog.
 */

import { ALL_PERMISSIONS } from "@/lib/permissions"
import type { StaffMember, StaffRole } from "@/pages/staff/types"

let _seq = 1
export function uid(prefix = "stf"): string {
  return `${prefix}-${String(_seq++).padStart(4, "0")}`
}

// ─── Permission helper ─────────────────────────────────────────────────────────

function allPerms(): string[] {
  const keys: string[] = []
  for (const group of Object.values(ALL_PERMISSIONS)) {
    for (const p of group.permissions) keys.push(p.key)
  }
  return keys
}

function perms(...keys: string[]): string[] {
  return keys
}

// ─── Roles ─────────────────────────────────────────────────────────────────────

export let roles: StaffRole[] = [
  {
    id: "role-001", name: "ADMIN", displayName: "Administrator",
    description: "Full access to all modules and settings",
    permissions: allPerms(),
    isSystem: true, isActive: true,
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "role-002", name: "DOCTOR", displayName: "Doctor",
    description: "Access to patient care, prescriptions and workup modules",
    permissions: perms(
      "dashboard:view",
      "patients:view", "patients:create", "patients:edit",
      "workup:view", "workup:create", "workup:edit",
      "doctor:view", "doctor:consult",
      "labs:view",
      "pharmacy:view",
      "optical:view",
      "inpatients:view", "inpatients:edit",
      "insurance:view",
      "reports:view",
      "billing:view",
      "queue:view",
    ),
    isSystem: true, isActive: true,
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "role-003", name: "RECEPTIONIST", displayName: "Receptionist",
    description: "Front desk: registration, billing, queue management",
    permissions: perms(
      "dashboard:view",
      "patients:view", "patients:create", "patients:edit",
      "billing:view", "billing:create",
      "queue:view",
      "dues:view",
      "insurance:view",
      "call_logs:view",
    ),
    isSystem: true, isActive: true,
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "role-004", name: "OPTOMETRIST", displayName: "Optometrist",
    description: "Optical and workup access",
    permissions: perms(
      "dashboard:view",
      "patients:view",
      "workup:view", "workup:create", "workup:edit",
      "optical:view", "optical:create", "optical:edit",
      "queue:view",
    ),
    isSystem: true, isActive: true,
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "role-005", name: "NURSE", displayName: "Nurse",
    description: "Nursing care and inpatient management",
    permissions: perms(
      "dashboard:view",
      "patients:view",
      "inpatients:view", "inpatients:edit",
      "doctor:view",
      "queue:view",
    ),
    isSystem: true, isActive: true,
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "role-006", name: "PHARMACIST", displayName: "Pharmacist",
    description: "Pharmacy stock and billing",
    permissions: perms(
      "dashboard:view",
      "patients:view",
      "pharmacy:view", "pharmacy:create", "pharmacy:edit", "pharmacy:manage_stock", "pharmacy:purchase_orders",
    ),
    isSystem: false, isActive: true,
    createdAt: "2026-02-15T08:00:00Z", updatedAt: "2026-02-15T08:00:00Z",
  },
  {
    id: "role-007", name: "LAB_TECHNICIAN", displayName: "Lab Technician",
    description: "Labs access for result entry",
    permissions: perms(
      "dashboard:view",
      "patients:view",
      "labs:view", "labs:create", "labs:edit", "labs:config",
    ),
    isSystem: false, isActive: true,
    createdAt: "2026-02-15T08:00:00Z", updatedAt: "2026-02-15T08:00:00Z",
  },
]

// ─── Staff Members ─────────────────────────────────────────────────────────────

export let members: StaffMember[] = [
  {
    id: "stf-001", email: "anand.rao@docsile.in", fullName: "Dr. Anand Rao",
    phone: "+919876500001", role: "DOCTOR", department: "Ophthalmology",
    designation: "Senior Ophthalmologist", employeeId: "EMP-001",
    qualifications: "MBBS, MS (Ophthalmology), FRCS", joiningDate: "2022-06-01",
    address: "14 Lake View Colony, Hyderabad - 500034",
    emergencyContact: "+919876500011", bloodGroup: "B+",
    salary: 150000, salaryType: "MONTHLY",
    isActive: true, lastLogin: "2026-09-22T08:30:00Z",
    createdAt: "2022-06-01T08:00:00Z",
  },
  {
    id: "stf-002", email: "sunita.mehta@docsile.in", fullName: "Dr. Sunita Mehta",
    phone: "+919012500002", role: "DOCTOR", department: "Ophthalmology",
    designation: "Glaucoma Specialist", employeeId: "EMP-002",
    qualifications: "MBBS, DO, DNB (Ophthalmology)", joiningDate: "2023-01-15",
    address: "22 Green Park, Secunderabad - 500003",
    emergencyContact: "+919012500012", bloodGroup: "O+",
    salary: 130000, salaryType: "MONTHLY",
    isActive: true, lastLogin: "2026-09-22T09:00:00Z",
    createdAt: "2023-01-15T08:00:00Z",
  },
  {
    id: "stf-003", email: "kiran.patel@docsile.in", fullName: "Dr. Kiran Patel",
    phone: "+917890500003", role: "DOCTOR", department: "Ophthalmology",
    designation: "Vitreoretinal Surgeon", employeeId: "EMP-003",
    qualifications: "MBBS, MS (Ophthalmology), VR Fellowship", joiningDate: "2023-07-01",
    address: "7 Jubilee Hills, Hyderabad - 500033",
    emergencyContact: null, bloodGroup: "A+",
    salary: 180000, salaryType: "MONTHLY",
    isActive: true, lastLogin: "2026-09-21T17:00:00Z",
    createdAt: "2023-07-01T08:00:00Z",
  },
  {
    id: "stf-004", email: "ramya.optom@docsile.in", fullName: "Ramya Krishnan",
    phone: "+918765500004", role: "OPTOMETRIST", department: "Optometry",
    designation: "Chief Optometrist", employeeId: "EMP-004",
    qualifications: "B.Optom, M.Optom", joiningDate: "2022-08-01",
    address: "3 Banjara Hills, Hyderabad - 500034",
    emergencyContact: "+918765500014", bloodGroup: "AB+",
    salary: 45000, salaryType: "MONTHLY",
    isActive: true, lastLogin: "2026-09-22T08:00:00Z",
    createdAt: "2022-08-01T08:00:00Z",
  },
  {
    id: "stf-005", email: "reception1@docsile.in", fullName: "Padmini Reddy",
    phone: "+916543500005", role: "RECEPTIONIST", department: "Front Desk",
    designation: "Senior Receptionist", employeeId: "EMP-005",
    qualifications: null, joiningDate: "2023-03-01",
    address: "45 Film Nagar, Hyderabad - 500045",
    emergencyContact: "+916543500015", bloodGroup: "O-",
    salary: 25000, salaryType: "MONTHLY",
    isActive: true, lastLogin: "2026-09-22T07:45:00Z",
    createdAt: "2023-03-01T08:00:00Z",
  },
  {
    id: "stf-006", email: "pharmacy1@docsile.in", fullName: "Mohammed Faisal",
    phone: "+917654500006", role: "PHARMACIST", department: "Pharmacy",
    designation: "Pharmacist In-charge", employeeId: "EMP-006",
    qualifications: "B.Pharm", joiningDate: "2023-05-15",
    address: "12 Tolichowki, Hyderabad - 500008",
    emergencyContact: null, bloodGroup: "B-",
    salary: 35000, salaryType: "MONTHLY",
    isActive: true, lastLogin: "2026-09-22T08:15:00Z",
    createdAt: "2023-05-15T08:00:00Z",
  },
  {
    id: "stf-007", email: "lab.tech@docsile.in", fullName: "Anitha Sridhar",
    phone: "+915432500007", role: "LAB_TECHNICIAN", department: "Lab",
    designation: "Lab Technician", employeeId: "EMP-007",
    qualifications: "DMLT", joiningDate: "2024-01-10",
    address: "89 Malkajgiri, Hyderabad - 500047",
    emergencyContact: "+915432500017", bloodGroup: "A-",
    salary: 28000, salaryType: "MONTHLY",
    isActive: true, lastLogin: "2026-09-22T07:30:00Z",
    createdAt: "2024-01-10T08:00:00Z",
  },
  {
    id: "stf-008", email: "nurse1@docsile.in", fullName: "Geetha Varma",
    phone: "+914321500008", role: "NURSE", department: "Nursing",
    designation: "Staff Nurse", employeeId: "EMP-008",
    qualifications: "GNM", joiningDate: "2024-03-01",
    address: "33 Uppal, Hyderabad - 500039",
    emergencyContact: "+914321500018", bloodGroup: "O+",
    salary: 22000, salaryType: "MONTHLY",
    isActive: true, lastLogin: "2026-09-21T20:00:00Z",
    createdAt: "2024-03-01T08:00:00Z",
  },
  {
    id: "stf-009", email: "accounts@docsile.in", fullName: "Srinivas Murthy",
    phone: "+913210500009", role: "RECEPTIONIST", department: "Accounts",
    designation: "Accounts Manager", employeeId: "EMP-009",
    qualifications: "B.Com, CA Inter", joiningDate: "2022-09-01",
    address: "56 Ameerpet, Hyderabad - 500016",
    emergencyContact: null, bloodGroup: "B+",
    salary: 40000, salaryType: "MONTHLY",
    isActive: true, lastLogin: "2026-09-22T09:30:00Z",
    createdAt: "2022-09-01T08:00:00Z",
  },
  {
    id: "stf-010", email: "old.staff@docsile.in", fullName: "Vijay Kumar",
    phone: "+912109500010", role: "NURSE", department: "Nursing",
    designation: "Staff Nurse", employeeId: "EMP-010",
    qualifications: "B.Sc Nursing", joiningDate: "2021-01-01",
    address: "78 Dilsukhnagar, Hyderabad - 500060",
    emergencyContact: null, bloodGroup: "AB-",
    salary: 24000, salaryType: "MONTHLY",
    isActive: false, lastLogin: "2026-06-15T10:00:00Z",
    createdAt: "2021-01-01T08:00:00Z",
  },
]
