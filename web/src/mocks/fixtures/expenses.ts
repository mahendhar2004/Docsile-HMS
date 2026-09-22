/**
 * Mock fixtures for the Expenses module.
 * Uses `let` arrays so mutations can modify in-memory state.
 */

import type { ExpenseCategory, ExpenseWithCategory } from "@/pages/expenses/types"

export let expenseCategories: ExpenseCategory[] = [
  { id: "cat-1", name: "Medicines & Supplies", color: "#3B82F6", sortOrder: 1, hospitalId: "mock-hospital-id" },
  { id: "cat-2", name: "Equipment Maintenance", color: "#10B981", sortOrder: 2, hospitalId: "mock-hospital-id" },
  { id: "cat-3", name: "Staff Salaries", color: "#F59E0B", sortOrder: 3, hospitalId: "mock-hospital-id" },
  { id: "cat-4", name: "Utilities", color: "#EF4444", sortOrder: 4, hospitalId: "mock-hospital-id" },
  { id: "cat-5", name: "Housekeeping", color: "#8B5CF6", sortOrder: 5, hospitalId: "mock-hospital-id" },
]

function getCategory(id: string): ExpenseCategory {
  return expenseCategories.find((c) => c.id === id) ?? expenseCategories[0]
}

export let expenses: ExpenseWithCategory[] = [
  {
    id: "exp-1",
    title: "Surgical gloves and masks (bulk)",
    categoryId: "cat-1",
    amount: 18500,
    date: "2026-09-20",
    reason: "Monthly procurement for OT and ward",
    paymentMode: "Bank Transfer",
    hospitalId: "mock-hospital-id",
    createdAt: "2026-09-20T09:00:00Z",
    category: getCategory("cat-1"),
  },
  {
    id: "exp-2",
    title: "ECG machine servicing",
    categoryId: "cat-2",
    amount: 7200,
    date: "2026-09-18",
    reason: "Annual preventive maintenance contract",
    paymentMode: "Cheque",
    hospitalId: "mock-hospital-id",
    createdAt: "2026-09-18T11:30:00Z",
    category: getCategory("cat-2"),
  },
  {
    id: "exp-3",
    title: "September nursing staff salaries",
    categoryId: "cat-3",
    amount: 285000,
    date: "2026-09-15",
    reason: null,
    paymentMode: "Bank Transfer",
    hospitalId: "mock-hospital-id",
    createdAt: "2026-09-15T10:00:00Z",
    category: getCategory("cat-3"),
  },
  {
    id: "exp-4",
    title: "Electricity bill — August",
    categoryId: "cat-4",
    amount: 42000,
    date: "2026-09-12",
    reason: "TNEB commercial tariff",
    paymentMode: "Online",
    hospitalId: "mock-hospital-id",
    createdAt: "2026-09-12T08:00:00Z",
    category: getCategory("cat-4"),
  },
  {
    id: "exp-5",
    title: "Floor cleaning materials",
    categoryId: "cat-5",
    amount: 3800,
    date: "2026-09-10",
    reason: "Phenyl, mops, disinfectants",
    paymentMode: "Cash",
    hospitalId: "mock-hospital-id",
    createdAt: "2026-09-10T14:00:00Z",
    category: getCategory("cat-5"),
  },
  {
    id: "exp-6",
    title: "IV fluids and infusion sets",
    categoryId: "cat-1",
    amount: 24300,
    date: "2026-09-08",
    reason: "Restocking for IPD",
    paymentMode: "Bank Transfer",
    hospitalId: "mock-hospital-id",
    createdAt: "2026-09-08T09:30:00Z",
    category: getCategory("cat-1"),
  },
  {
    id: "exp-7",
    title: "Autoclave sterilizer repair",
    categoryId: "cat-2",
    amount: 5500,
    date: "2026-09-05",
    reason: "Seal replacement",
    paymentMode: "Cash",
    hospitalId: "mock-hospital-id",
    createdAt: "2026-09-05T15:00:00Z",
    category: getCategory("cat-2"),
  },
  {
    id: "exp-8",
    title: "Water charges",
    categoryId: "cat-4",
    amount: 8400,
    date: "2026-09-03",
    reason: "Metro water quarterly bill",
    paymentMode: "Online",
    hospitalId: "mock-hospital-id",
    createdAt: "2026-09-03T10:00:00Z",
    category: getCategory("cat-4"),
  },
  {
    id: "exp-9",
    title: "Receptionist and housekeeping wages",
    categoryId: "cat-3",
    amount: 62000,
    date: "2026-09-01",
    reason: null,
    paymentMode: "Bank Transfer",
    hospitalId: "mock-hospital-id",
    createdAt: "2026-09-01T09:00:00Z",
    category: getCategory("cat-3"),
  },
  {
    id: "exp-10",
    title: "Sutures and wound dressings",
    categoryId: "cat-1",
    amount: 9800,
    date: "2026-08-28",
    reason: "Restock for surgical wards",
    paymentMode: "Cheque",
    hospitalId: "mock-hospital-id",
    createdAt: "2026-08-28T11:00:00Z",
    category: getCategory("cat-1"),
  },
  {
    id: "exp-11",
    title: "X-Ray film processor maintenance",
    categoryId: "cat-2",
    amount: 3600,
    date: "2026-08-25",
    reason: "Quarterly service visit",
    paymentMode: "Cash",
    hospitalId: "mock-hospital-id",
    createdAt: "2026-08-25T13:00:00Z",
    category: getCategory("cat-2"),
  },
  {
    id: "exp-12",
    title: "Pest control — full hospital",
    categoryId: "cat-5",
    amount: 4200,
    date: "2026-08-22",
    reason: "Monthly fumigation",
    paymentMode: "Cash",
    hospitalId: "mock-hospital-id",
    createdAt: "2026-08-22T08:00:00Z",
    category: getCategory("cat-5"),
  },
]

let _nextCatId = 6
let _nextExpId = 13

export function nextCatId(): string {
  return `cat-${_nextCatId++}`
}

export function nextExpId(): string {
  return `exp-${_nextExpId++}`
}
