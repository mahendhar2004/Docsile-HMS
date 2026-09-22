/**
 * patient-search-section.tsx
 *
 * Cursor-based patient search autocomplete for the reports module.
 * Debounces the query (300ms), shows results in a dropdown via SearchBar
 * variant="with-autocomplete". On selection, notifies the parent component
 * with the selected PatientSearchResult.
 */

import { useState, useEffect, useRef } from "react"
import { FileSearch, Phone, User } from "lucide-react"
import { SearchBar } from "@/components/patterns"
import type { Suggestion } from "@/components/patterns/search/search-bar"
import { usePatientSearch } from "./hooks"
import type { PatientSearchResult } from "./types"

interface PatientSearchSectionProps {
  onSelect: (patient: PatientSearchResult) => void
  selectedPatientId?: string | null
}

export function PatientSearchSection({
  onSelect,
  selectedPatientId,
}: PatientSearchSectionProps) {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")

  // Debounce the search term (300ms — matches old PatientSearch)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebouncedQuery(query), 300)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

  const { data: results, isLoading } = usePatientSearch(debouncedQuery)

  const suggestions: Suggestion<PatientSearchResult>[] = results.map((p) => ({
    id: p.id,
    label: p.fullName,
    value: p,
  }))

  function handleSelect(suggestion: Suggestion<PatientSearchResult>) {
    onSelect(suggestion.value)
    setQuery("")
    setDebouncedQuery("")
  }

  return (
    <div className="py-8 px-4">
      <div className="text-center mb-5">
        <h2 className="text-lg font-semibold text-foreground">
          Search Patient Records
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Look up any patient by ID, name, or phone number to view their
          complete history
        </p>
      </div>

      <div className="max-w-xl mx-auto">
        <SearchBar
          variant="with-autocomplete"
          value={query}
          onChange={setQuery}
          placeholder="Search by Patient ID, name, or phone number..."
          aria-label="Search patients"
          suggestions={suggestions}
          onSuggestionSelect={handleSelect}
          isLoadingSuggestions={isLoading}
          noResultsMessage={
            debouncedQuery.length < 2
              ? "Type at least 2 characters to search"
              : "No patients found"
          }
          open={debouncedQuery.length >= 2}
          renderSuggestion={(s) => (
            <PatientSuggestionRow patient={s.value} />
          )}
          inputClassName="h-12 text-[0.95rem] rounded-xl shadow-sm"
        />

        {/* Currently selected patient badge */}
        {selectedPatientId && query === "" && (
          <p className="text-center text-xs text-muted-foreground mt-2">
            Viewing:{" "}
            <span className="font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              {selectedPatientId}
            </span>{" "}
            — search again to switch patient
          </p>
        )}
      </div>
    </div>
  )
}

function PatientSuggestionRow({ patient }: { patient: PatientSearchResult }) {
  const lastVisit = patient.lastVisitDate
    ? getDaysSinceVisit(patient.lastVisitDate)
    : null

  return (
    <div className="flex items-center justify-between gap-3 w-full">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/10">
          <User className="h-4 w-4 text-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground truncate">
              {patient.fullName}
            </span>
            <span className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
              {patient.patientId}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" aria-hidden="true" />
              {patient.phone}
            </span>
            {(patient.age || patient.gender) && (
              <span className="text-xs text-muted-foreground">
                {patient.age ? `${patient.age}Y` : ""}{" "}
                {patient.gender}
              </span>
            )}
          </div>
        </div>
      </div>
      {lastVisit && (
        <div className="text-right shrink-0">
          <p className="text-xs text-muted-foreground">Last visit</p>
          <p className="text-xs font-medium text-foreground">{lastVisit}</p>
        </div>
      )}
    </div>
  )
}

function getDaysSinceVisit(dateString: string): string {
  const days = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24),
  )
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

// ─── Empty state (no patient selected) ────────────────────────────────────────

export function PatientSearchEmptyState() {
  return (
    <div className="text-center py-16">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/5 mx-auto mb-5">
        <FileSearch className="h-9 w-9 text-primary/60" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-foreground">
        Search for a patient to get started
      </h3>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">
        Enter a Patient ID, name, or phone number above to view their complete
        medical history, prescriptions, lab records, and billing details.
      </p>
    </div>
  )
}
