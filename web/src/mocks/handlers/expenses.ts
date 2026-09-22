/**
 * MSW v2 handlers for the Expenses module.
 *
 * GET  /expenses/categories
 * POST /expenses/categories
 * POST /expenses/categories/seed
 * PATCH /expenses/categories/reorder      ← must precede /:id handler
 * PATCH /expenses/categories/:id
 * DELETE /expenses/categories/:id
 * GET  /expenses?startDate=&endDate=
 * POST /expenses
 * PATCH /expenses/:id
 * DELETE /expenses/:id
 */

import { http } from "msw"
import { ok, created } from "../envelope"
import {
  expenseCategories,
  expenses,
  nextCatId,
  nextExpId,
} from "../fixtures/expenses"
import type { CategoryInput, ExpenseInput, ReorderInput } from "@/pages/expenses/types"

export const expensesHandlers = [
  // ── Categories ──────────────────────────────────────────────────────────────

  http.get("/expenses/categories", () => ok([...expenseCategories])),

  http.post("/expenses/categories/seed", () => ok(expenseCategories)),

  // Must be before /expenses/categories/:id
  http.patch("/expenses/categories/reorder", async ({ request }) => {
    const { order } = (await request.json()) as ReorderInput
    for (const { id, sortOrder } of order) {
      const cat = expenseCategories.find((c) => c.id === id)
      if (cat) cat.sortOrder = sortOrder
    }
    expenseCategories.sort((a, b) => a.sortOrder - b.sortOrder)
    return ok(expenseCategories)
  }),

  http.post("/expenses/categories", async ({ request }) => {
    const input = (await request.json()) as CategoryInput
    const newCat = {
      id: nextCatId(),
      name: input.name,
      color: input.color,
      sortOrder: expenseCategories.length + 1,
      hospitalId: "mock-hospital-id",
    }
    expenseCategories.push(newCat)
    return created(newCat)
  }),

  http.patch("/expenses/categories/:id", async ({ params, request }) => {
    const { id } = params as { id: string }
    const input = (await request.json()) as CategoryInput
    const cat = expenseCategories.find((c) => c.id === id)
    if (!cat) return ok(null)
    cat.name = input.name
    cat.color = input.color
    return ok(cat)
  }),

  http.delete("/expenses/categories/:id", ({ params }) => {
    const { id } = params as { id: string }
    const idx = expenseCategories.findIndex((c) => c.id === id)
    if (idx !== -1) expenseCategories.splice(idx, 1)
    return ok(null)
  }),

  // ── Expenses ────────────────────────────────────────────────────────────────

  http.get("/expenses", ({ request }) => {
    const url = new URL(request.url)
    const startDate = url.searchParams.get("startDate")
    const endDate = url.searchParams.get("endDate")

    let result = [...expenses]
    if (startDate) result = result.filter((e) => e.date >= startDate)
    if (endDate) result = result.filter((e) => e.date <= endDate)

    return ok(result)
  }),

  http.post("/expenses", async ({ request }) => {
    const input = (await request.json()) as ExpenseInput
    const category = expenseCategories.find((c) => c.id === input.categoryId)!
    const newExp = {
      id: nextExpId(),
      title: input.title,
      categoryId: input.categoryId,
      amount: input.amount,
      date: input.date,
      reason: input.reason ?? null,
      paymentMode: null,
      hospitalId: "mock-hospital-id",
      createdAt: new Date().toISOString(),
      category,
    }
    expenses.push(newExp)
    return created(newExp)
  }),

  http.patch("/expenses/:id", async ({ params, request }) => {
    const { id } = params as { id: string }
    const input = (await request.json()) as ExpenseInput
    const exp = expenses.find((e) => e.id === id)
    if (!exp) return ok(null)
    exp.title = input.title
    exp.categoryId = input.categoryId
    exp.amount = input.amount
    exp.date = input.date
    exp.reason = input.reason ?? null
    exp.category = expenseCategories.find((c) => c.id === input.categoryId) ?? exp.category
    return ok(exp)
  }),

  http.delete("/expenses/:id", ({ params }) => {
    const { id } = params as { id: string }
    const idx = expenses.findIndex((e) => e.id === id)
    if (idx !== -1) expenses.splice(idx, 1)
    return ok(null)
  }),
]
