/**
 * AnalyticsPage — full hospital analytics dashboard.
 *
 * Page 17/18 in the real-page implementation phase.
 *
 * Tabs (matching old app's AnalyticsPage.tsx TABS constant exactly):
 *   Overview | Patients | Revenue & Finance | Performance | Region
 *
 * Shared filter (page-level, affects all tabs):
 *   today | week | month | year | custom
 *   When custom: DateRangePicker shown to select start/end dates.
 *
 * All 19 analytics endpoints are consumed; each tab manages its own queries.
 * Permission: reports:view
 */

import { useEffect, useState } from "react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import { Sparkles } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  PageHeader,
  SegmentedControl,
  DateRangePicker,
  ErrorState,
} from "@/components/patterns"
import type { SelectOption } from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"
import { useAiContextStore } from "@/store/ai-context"
import { OverviewTab }     from "./analytics/overview-tab"
import { PatientsTab }     from "./analytics/patients-tab"
import { RevenueTab }      from "./analytics/revenue-tab"
import { PerformanceTab }  from "./analytics/performance-tab"
import { RegionTab }       from "./analytics/region-tab"
import type { TimeFilter } from "./analytics/types"

// ─── Filter options ───────────────────────────────────────────────────────────

const FILTER_OPTIONS: SelectOption[] = [
  { value: "today", label: "Today"  },
  { value: "week",  label: "Week"   },
  { value: "month", label: "Month"  },
  { value: "year",  label: "Year"   },
  { value: "custom", label: "Custom" },
]

// ─── Tab definition (matching old app TABS constant exactly) ─────────────────

type TabKey = "overview" | "patients" | "revenue" | "performance" | "region"

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview",    label: "Overview" },
  { key: "patients",   label: "Patients" },
  { key: "revenue",    label: "Revenue & Finance" },
  { key: "performance", label: "Performance" },
  { key: "region",      label: "Region" },
]

// ─── AnalyticsPage ────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { can } = usePermissions()
  const hasAccess = can("reports:view")

  const [filter, setFilter]           = useState<TimeFilter>("today")
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined)

  // Sitha's global widget switches into hospital-analytics mode while this
  // page is open; cleared on unmount so it doesn't leak into other pages.
  const setAiContext = useAiContextStore((s) => s.setAiContext)
  const clearAiContext = useAiContextStore((s) => s.clearAiContext)
  const toggleSitha = useAiContextStore((s) => s.toggleOpen)
  const sithaOpen = useAiContextStore((s) => s.open)
  useEffect(() => {
    setAiContext({ patientId: null, module: "analytics" })
    return () => clearAiContext()
  }, [setAiContext, clearAiContext])

  // Permission gate
  if (!hasAccess) {
    return (
      <main>
        <ErrorState
          title="Access denied"
          description="You need the reports:view permission to view analytics. Contact your administrator."
        />
      </main>
    )
  }

  // Convert DateRange → string params for hooks
  const customStart = customRange?.from
    ? format(customRange.from, "yyyy-MM-dd")
    : undefined
  const customEnd = customRange?.to
    ? format(customRange.to, "yyyy-MM-dd")
    : undefined

  // Shared props passed to every tab
  const tabProps = { filter, customStart, customEnd }

  return (
    <main className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Hospital analytics — revenue, patient trends, doctor performance, and operational insights."
        actions={
          <Button
            variant={sithaOpen ? "primary" : "outline"}
            size="sm"
            onClick={toggleSitha}
            aria-label="Ask Sitha AI"
            className={!sithaOpen ? "bg-primary/5 border-primary/20 text-primary hover:bg-primary/10" : undefined}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" aria-hidden />
            {sithaOpen ? "Hide Sitha" : "Ask Sitha"}
          </Button>
        }
        toolbar={
          <>
            <SegmentedControl
              options={FILTER_OPTIONS}
              value={filter}
              onValueChange={(v) => setFilter(v as TimeFilter)}
              aria-label="Select time filter"
            />

            {filter === "custom" && (
              <DateRangePicker
                value={customRange}
                onChange={setCustomRange}
                toDate={new Date()}
                placeholder="Select date range"
                aria-label="Custom date range"
              />
            )}
          </>
        }
      />

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="overview">
        <TabsList aria-label="Analytics sections">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6">
          <TabsContent value="overview">
            <OverviewTab {...tabProps} />
          </TabsContent>

          <TabsContent value="patients">
            <PatientsTab {...tabProps} />
          </TabsContent>

          <TabsContent value="revenue">
            <RevenueTab {...tabProps} />
          </TabsContent>

          <TabsContent value="performance">
            <PerformanceTab {...tabProps} />
          </TabsContent>

          <TabsContent value="region">
            <RegionTab {...tabProps} />
          </TabsContent>
        </div>
      </Tabs>
    </main>
  )
}
