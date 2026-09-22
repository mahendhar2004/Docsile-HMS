/**
 * DuesFollowupsPage — placeholder.
 *
 * Phase 7 TODO: Implement dues & follow-ups module UI:
 * - Dues dashboard (GET /dues-followups/dues)
 * - Follow-ups list (GET /dues-followups/followups)
 * - Mark due as paid (PATCH /dues-followups/dues/{id}/mark-paid)
 * - Doctor and department lists for filtering
 * - Email templates (GET /dues-followups/email-templates)
 * - Send patient email (POST /dues-followups/send-email)
 * Permissions: dues:view, dues:edit
 */
export default function DuesFollowupsPage() {
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold text-foreground">Dues & Follow-ups</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Phase 7 TODO: Outstanding dues tracking and patient follow-up email management.
      </p>
    </main>
  )
}
