/**
 * UnauthorizedPage — matches main's /unauthorized route exactly
 * (src/app/(hospital)/unauthorized/page.tsx). Was missing from the
 * migration entirely (only per-page inline "access denied" gates existed).
 */

import { Link } from "react-router-dom"
import { ShieldX } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
        <ShieldX className="h-8 w-8 text-red-600" aria-hidden="true" />
      </div>
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Access Denied</h1>
        <p className="mt-1 text-sm text-gray-500">
          You don&apos;t have permission to access this page.
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link to="/dashboard">Go to Dashboard</Link>
      </Button>
    </div>
  )
}
