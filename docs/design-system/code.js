window.DS_CODE = {
brief: `# HMS UI rules (eye hospital, desktop, India)
- Stack: React + TypeScript + Tailwind v4. Use ONLY tokens from web/src/index.css through Tailwind classes: bg-background, bg-card, bg-muted, bg-accent, text-foreground, text-muted-foreground, text-primary, border-border, rounded-(--radius), rounded-lg, shadow-[--shadow-card]. Never hardcode a hex or invent colours/themes.
- Page background is pure white (--color-background, one line in tokens.css). Cards are white with a border ring (shadow-[--shadow-card]).
- Status colours only through <StatusPill>: success | warning | error | info | neutral (bg-*-soft text-*-soft-foreground).
- Type: Inter. display 2rem/700 (KPI), title 1.25rem/700, subtitle 1rem/600, body 0.875rem, caption 0.75rem/500, overline 11px/600 uppercase. Identifiers (token no., UHID, bill no., eye readings) = font-mono font-semibold. Numbers and amounts = tabular-nums. Currency: INR with en-IN grouping. Phone: +91.
- Speed first: one primary action per screen, its shortcut shown inside the button (N new, / search, Cmd+K palette, Enter confirm, Esc close, Cmd+Enter save and next). Prefer side panels over page changes. At most one click to the next step.
- Buttons: primary | secondary | soft | ghost | link | destructive; sizes sm/md/lg; disabled = opacity-45; focus = ring-[3px] ring-ring/35.
- Icons: lucide-react, strokeWidth 2, size 16 / 20 / 24.`,

typography: `// Tailwind classes per type role (root font-size is 17px)
display    : text-[length:var(--text-display)] font-bold tabular-nums     // KPI numbers
title      : text-[length:var(--text-title)] font-bold                    // page title, one per screen
subtitle   : text-[length:var(--text-subtitle)] font-semibold             // card / section / dialog title
body       : text-[length:var(--text-body)]                               // default text, table cells, inputs
body-strong: text-[length:var(--text-body)] font-semibold                 // patient name in rows
caption    : text-[length:var(--text-caption)] font-medium text-muted-foreground
overline   : text-[11px] font-semibold uppercase tracking-wider text-muted-foreground  // table headers
mono-id    : font-mono text-[13px] font-semibold                          // token A-14, UHID P-000482, INV-2026-0183
mono-kbd   : font-mono text-[11px] font-semibold                          // shortcuts
amount     : tabular-nums text-right; format with new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"})
phone      : "+91 98410 22817"  (group 5+5)
eye values : font-mono, true minus sign "−2.25 / −0.75 × 180"`,

button: `type Variant = "primary" | "secondary" | "soft" | "ghost" | "link" | "destructive"
const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80",
  secondary: "bg-card text-foreground shadow-[--shadow-card] hover:bg-muted active:bg-border/50",
  soft: "bg-accent text-accent-foreground hover:bg-accent/70",
  ghost: "text-muted-foreground hover:bg-muted active:bg-border/50",
  link: "text-primary hover:underline px-0",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
}
const sizes = { sm: "h-8 px-3 text-[13px]", md: "h-10 px-4 text-sm", lg: "h-12 px-5 text-base" }

export function Button({ variant = "primary", size = "md", shortcut, icon, loading, fullWidth, className, children, ...p }: ButtonProps) {
  return (
    <button disabled={p.disabled || loading}
      className={cn("inline-flex items-center justify-center gap-2 rounded-(--radius) font-semibold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35 disabled:opacity-45 disabled:pointer-events-none",
        variants[variant], sizes[size], fullWidth && "w-full", className)} {...p}>
      {loading ? <Spinner /> : icon}
      {children}
      {shortcut && <kbd className="rounded-sm bg-white/20 px-1.5 font-mono text-[11px]">{shortcut}</kbd>}
    </button>
  )
}
// icon-only: <Button variant="secondary" size="sm" aria-label="More" className="w-8 px-0"><MoreHorizontal size={16}/></Button>`,

fields: `export function Field({ label, error, help, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold">{label}</span>
      {children}
      {(error || help) && <span className={cn("mt-1 block text-xs", error ? "text-error-soft-foreground" : "text-muted-foreground")}>{error ?? help}</span>}
    </label>
  )
}
const control = "h-10 w-full rounded-(--radius) border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground hover:border-muted-foreground focus:border-ring focus:ring-[3px] focus:ring-ring/15 focus:outline-none disabled:bg-muted disabled:opacity-60 read-only:bg-muted aria-[invalid=true]:border-error"

export function Input({ prefix, hint, ...p }: InputProps) {
  return (
    <div className="relative flex items-center">
      {prefix && <span className="absolute left-3 text-sm text-muted-foreground">{prefix}</span>}
      <input className={cn(control, prefix && "pl-10")} {...p} />
      {hint && <kbd className="absolute right-3 font-mono text-[11px] text-muted-foreground">{hint}</kbd>}
    </div>
  )
}
export const Textarea = (p: TextareaProps) => <textarea className={cn(control, "h-auto min-h-[76px] py-2.5")} {...p} />
export const Select = (p: SelectProps) => <select className={control} {...p} />
// usage: <Field label="Phone" error={err}><Input prefix="+91" hint="/" inputMode="numeric" /></Field>`,

select: `// Checkbox / Radio / Switch (native input + peer styling)
export const Checkbox = ({ label, ...p }: CheckboxProps) => (
  <label className="flex items-center gap-2.5 text-sm has-[:disabled]:opacity-50">
    <input type="checkbox" className="size-[18px] rounded-[4px] border-input accent-primary aria-[invalid=true]:border-error" {...p} />{label}
  </label>
)
export const Radio = ({ label, ...p }: RadioProps) => (
  <label className="flex items-center gap-2.5 text-sm has-[:disabled]:opacity-50">
    <input type="radio" className="size-[18px] accent-primary" {...p} />{label}
  </label>
)
export const Switch = ({ checked, onChange, disabled }: SwitchProps) => (
  <button role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
    className={cn("h-5 w-9 rounded-full p-0.5 transition-colors disabled:opacity-50", checked ? "bg-primary" : "bg-border")}>
    <span className={cn("block size-4 rounded-full bg-white shadow transition-transform", checked && "translate-x-4")} />
  </button>
)`,

tabs: `export function Tabs({ items, value, onChange }: TabsProps) {
  return (
    <div role="tablist" className="flex gap-5 border-b border-border/60">
      {items.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} disabled={t.disabled} onClick={() => onChange(t.value)}
          className={cn("-mb-px border-b-2 border-transparent py-2 text-sm font-medium text-muted-foreground disabled:opacity-45",
            value === t.value && "border-primary font-semibold text-primary")}>{t.label}</button>
      ))}
    </div>
  )
}
export function Segmented({ options, value, onChange }: SegmentedProps) {
  return (
    <div className="inline-flex gap-0.5 rounded-(--radius) bg-muted p-[3px] text-[13px] font-medium">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={cn("rounded-md px-3.5 py-1.5 text-muted-foreground", value === o.value && "bg-card font-semibold text-foreground shadow-[--shadow-card]")}>{o.label}</button>
      ))}
    </div>
  )
}
// FilterChip: use the existing .filter-chip / .filter-chip.active classes in index.css`,

status: `type Tone = "success" | "warning" | "error" | "info" | "neutral"
const tone: Record<Tone, string> = {
  success: "bg-success-soft text-success-soft-foreground",
  warning: "bg-warning-soft text-warning-soft-foreground",
  error: "bg-error-soft text-error-soft-foreground",
  info: "bg-info-soft text-info-soft-foreground",
  neutral: "bg-neutral-soft text-neutral-soft-foreground",
}
export const StatusPill = ({ status }: { status: string }) => (
  <span className={cn("inline-block rounded-full px-3 py-1 text-xs font-semibold", tone[toneOf(status)])}>{status}</span> // toneOf: status-map.ts
)
export const CountBadge = ({ n, tone: t = "primary" }: BadgeProps) => (
  <span className={cn("min-w-5 rounded-full px-1.5 text-center text-[11px] font-bold", t === "primary" ? "bg-primary text-primary-foreground" : t === "error" ? "bg-error text-white" : "bg-muted")}>{n}</span>
)
const av = { sm: "size-7 text-[11px]", md: "size-9 text-[13px]", lg: "size-12 text-base" }
export const Avatar = ({ name, size = "md" }: AvatarProps) => (
  <span className={cn("grid place-items-center rounded-full bg-accent font-bold text-accent-foreground", av[size])}>
    {name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
  </span>
)`,

card: `type CardVariant = "stat" | "patient" | "callout" | "alert"
const card: Record<CardVariant, string> = {
  stat: "bg-card shadow-[--shadow-card] p-4",
  patient: "bg-card shadow-[--shadow-card] p-4 hover:shadow-[--shadow-card-hover]",
  callout: "bg-accent text-accent-foreground p-4 text-[13px] font-semibold",
  alert: "bg-error-soft text-error-soft-foreground p-4 text-[13px] font-semibold",
}
export function Card({ variant = "stat", selected, className, ...p }: CardProps) {
  return <div className={cn("rounded-lg", card[variant], selected && "bg-accent ring-[1.5px] ring-primary", className)} {...p} />
}
export const StatCard = ({ label, value, delta }: StatProps) => (
  <Card variant="stat">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-[length:var(--text-display)] font-bold tabular-nums">{value}</div>
    {delta && <div className="text-xs font-semibold text-success-soft-foreground">{delta}</div>}
  </Card>
)`,

table: `export function DataTable<T>({ columns, rows, density = "comfortable", rowAction, selectedId, loading, empty }: DataTableProps<T>) {
  const pad = density === "compact" ? "py-[7px]" : "py-3.5"
  if (!loading && rows.length === 0) return empty
  return (
    <div role="table" className="overflow-hidden rounded-lg bg-card text-[13px] shadow-[--shadow-card]">
      <div role="row" className="flex bg-muted px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {columns.map((c) => <span key={c.key} className={c.className}>{c.header}</span>)}
      </div>
      {loading ? <Skeleton rows={3} /> : rows.map((r) => (
        <div key={r.id} role="row" tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && rowAction?.(r).run()}
          className={cn("flex items-center border-t border-border/60 px-4 focus-visible:ring-2 focus-visible:ring-ring", pad, selectedId === r.id && "bg-accent")}>
          {columns.map((c) => <span key={c.key} className={c.className}>{c.cell(r)}</span>)}
          {rowAction && <button onClick={() => rowAction(r).run()} className="font-semibold text-primary">{rowAction(r).label} →</button>}
        </div>
      ))}
    </div>
  )
}`,

overlays: `// Dialog (confirm) — shadcn/radix Dialog styled with tokens
<DialogContent className="w-[340px] rounded-lg bg-card p-5 shadow-[--shadow-overlay] motion-dialog-in">
  <DialogTitle className="text-[length:var(--text-subtitle)] font-bold">Discard this workup?</DialogTitle>
  <DialogDescription className="my-1.5 mb-4 text-[13px] text-muted-foreground">Unsaved readings for Lakshmi N. will be lost.</DialogDescription>
  <div className="flex justify-end gap-2"><Button variant="secondary" shortcut="Esc">Keep editing</Button><Button variant="destructive">Discard</Button></div>
</DialogContent>

// Toast: bottom-right, 4s, with Undo. Dot colour = success / error token.
toast({ tone: "success", title: "Sent to Dr. Menon", action: { label: "Undo", run: undo } })
<div className="flex w-80 items-center gap-2.5 rounded-lg bg-card px-3.5 py-3 text-[13px] shadow-[--shadow-card] motion-toast-in">
  <span className="size-2 rounded-full bg-success" /><b className="flex-1">{title}</b><button className="font-semibold text-primary">Undo</button>
</div>

// Tooltip: bg-foreground text-background text-xs rounded-sm px-2 py-1
// CommandPalette (Cmd+K): input on top; groups Actions / Patients / Go to; Enter runs the highlighted row (bg-accent text-accent-foreground);
// first row is always "Register “<query>” as new patient". Use cmdk library.`,

feedback: `const banner: Record<Tone, string> = {
  info: "bg-info-soft text-info-soft-foreground", success: "bg-success-soft text-success-soft-foreground",
  warning: "bg-warning-soft text-warning-soft-foreground", error: "bg-error-soft text-error-soft-foreground", neutral: "bg-neutral-soft text-neutral-soft-foreground",
}
export const Banner = ({ tone = "info", children }: BannerProps) => (
  <div className={cn("rounded-lg px-4 py-2.5 text-[13px] font-semibold", banner[tone])}>{children}</div>
)
export const Progress = ({ value }: { value: number }) => (
  <div className="h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary" style={{ width: value + "%" }} /></div>
)
export function Stepper({ steps, current }: StepperProps) {
  return (
    <ol className="flex items-center gap-2 text-[13px] font-semibold">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span className={cn("grid size-[22px] place-items-center rounded-full text-[11px]",
            i < current ? "bg-success text-white" : i === current ? "bg-primary text-white" : "text-muted-foreground ring-[1.5px] ring-border")}>{i < current ? "✓" : i + 1}</span>
          <span className={i > current ? "text-muted-foreground" : ""}>{s}</span>
          {i < steps.length - 1 && <span className={cn("h-0.5 w-7", i < current ? "bg-success" : "bg-border")} />}
        </li>
      ))}
    </ol>
  )
}`,

kbd: `export const Kbd = ({ children, onPrimary }: { children: React.ReactNode; onPrimary?: boolean }) => (
  <kbd className={cn("rounded-sm px-2 py-0.5 font-mono text-[11px] font-semibold", onPrimary ? "bg-white/20 text-white" : "bg-muted ring-1 ring-border")}>{children}</kbd>
)
// global shortcuts: N new patient · / search · Cmd+K palette · Enter confirm · Esc close · Cmd+Enter save and next · arrows move row`,

shell: `export function AppShell({ nav, title, subtitle, action, children }: AppShellProps) {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="flex w-44 shrink-0 flex-col gap-0.5 border-r border-border/60 p-2.5">
        <div className="px-2 pb-3 text-base font-bold">Docsile</div>
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to}
            className={({ isActive }) => cn("flex items-center gap-2 rounded-(--radius) px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
              isActive && "bg-accent font-semibold text-accent-foreground")}>
            <span className="flex-1">{n.label}</span><kbd className="font-mono text-[10px]">{n.key}</kbd>
          </NavLink>
        ))}
        <UserMenu className="mt-auto" />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center gap-3 border-b border-border/60 px-5">
          <button onClick={openPalette} className="flex h-8 w-80 items-center gap-2 rounded-(--radius) px-2.5 text-xs text-muted-foreground ring-1 ring-border">
            Search name, phone, UHID… <Kbd>⌘K</Kbd>
          </button>
          <span className="ml-auto text-xs text-muted-foreground">OPD · Main branch</span>
        </header>
        <main className="flex-1 overflow-auto px-6 py-5">
          <div className="mb-4 flex items-center">
            <div className="flex-1">
              <h1 className="text-[length:var(--text-title)] font-bold">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
            {action}
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}`,

banner: `export function PatientBanner({ p, actions }: { p: Patient; actions?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3.5 rounded-lg bg-card px-4 py-3.5 shadow-[--shadow-card]">
      <Avatar name={p.name} size="lg" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[length:var(--text-subtitle)] font-bold">{p.name}</span>
          <span className="font-mono text-xs font-semibold text-muted-foreground">{p.uhid}</span>
          {p.token && <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-bold">{p.token}</span>}
        </div>
        <div className="mt-0.5 text-sm text-muted-foreground">{p.age} · {p.sex} · +91 {p.phone} · {p.doctor}{p.complaint ? " · “" + p.complaint + "”" : ""}</div>
      </div>
      {p.flags.map((f) => <StatusPill key={f.label} status={f.label} tone={f.tone} />)}
      {actions}
    </div>
  )
}`,

queue: `export function QueueRow({ q, selected, onAct }: { q: QueueItem; selected?: boolean; onAct: () => void }) {
  return (
    <div role="row" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onAct()}
      className={cn("flex items-center gap-3.5 border-t border-border/60 px-4 py-2.5 text-sm first:border-t-0 focus-visible:ring-2 focus-visible:ring-ring", selected && "bg-accent")}>
      <span className="w-11 font-mono text-sm font-bold">{q.token}</span>
      <span className="min-w-0 flex-[1.4]"><b>{q.name}</b> <span className="text-muted-foreground">{q.age} · {q.sex}</span></span>
      <span className="flex-1 text-muted-foreground">{q.doctor}</span>
      <span className="w-32"><StatusPill status={q.status} /></span>
      <span className="w-14 tabular-nums text-muted-foreground">{q.wait}</span>
      <button onClick={onAct} className="w-24 text-right font-semibold text-primary">{q.nextAction} →</button>
    </div>
  )
}
export const FilterBar = ({ chips, value, onChange, right }: FilterBarProps) => (
  <div className="flex items-center gap-1.5">
    {chips.map((c) => <button key={c.value} onClick={() => onChange(c.value)} className={cn("filter-chip", value === c.value && "active")}>{c.label} {c.count}</button>)}
    <div className="ml-auto">{right}</div>
  </div>
)
export const Pagination = ({ page, pages, total, onPage }: PaginationProps) => (
  <div className="flex items-center text-xs text-muted-foreground">
    <span className="flex-1">{(page - 1) * 5 + 1}–{Math.min(page * 5, total)} of {total}</span>
    <div className="flex gap-1">
      <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => onPage(page - 1)}>‹</Button>
      {Array.from({ length: pages }, (_, i) => <Button key={i} size="sm" variant={page === i + 1 ? "primary" : "secondary"} onClick={() => onPage(i + 1)}>{i + 1}</Button>)}
      <Button size="sm" variant="secondary" disabled={page === pages} onClick={() => onPage(page + 1)}>›</Button>
    </div>
  </div>
)
export const BulkBar = ({ n, children, onClear }: BulkBarProps) => (
  <div className="fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-lg bg-foreground px-4 py-2.5 text-[13px] text-background">
    <b>{n} selected</b>{children}<button onClick={onClear} className="opacity-70">✕</button>
  </div>
)`,

combobox: `// built on cmdk + Popover. Enter picks, ArrowUp/Down moves, Esc closes.
export function Combobox<T>({ label, query, onQuery, results, render, onPick, onCreate }: ComboboxProps<T>) {
  return (
    <Popover open={query.length > 0}>
      <PopoverAnchor asChild><Input value={query} onChange={(e) => onQuery(e.target.value)} aria-label={label} /></PopoverAnchor>
      <PopoverContent className="mt-1.5 rounded-lg bg-popover p-1 text-[13px] shadow-[--shadow-popover]">
        <Command shouldFilter={false}>
          {results.map((r) => (
            <CommandItem key={r.id} onSelect={() => onPick(r)} className="rounded-(--radius) px-2.5 py-2 data-[selected=true]:bg-accent">{render(r)}</CommandItem>
          ))}
          {onCreate && (
            <CommandItem onSelect={() => onCreate(query)} className="mt-1 border-t border-border/60 px-2.5 py-2 font-semibold text-primary">
              + Register “{query}” as new <Kbd>⏎</Kbd>
            </CommandItem>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
// Multi-select variant: selected values render as chips inside the input: "bg-accent text-accent-foreground rounded-md px-2 py-0.5 text-[13px] font-semibold" with ✕.`,

date: `// DatePicker: react-day-picker styled with tokens + presets.
<DayPicker mode="single" selected={date} onSelect={setDate} weekStartsOn={0}
  classNames={{
    day: "rounded-(--radius) py-1.5 text-xs tabular-nums hover:bg-muted",
    day_selected: "bg-primary text-primary-foreground font-semibold",
    day_today: "font-bold text-primary",
    day_outside: "text-muted-foreground opacity-50",
    day_disabled: "text-muted-foreground opacity-40",
  }} />
<div className="mt-2.5 flex gap-1.5 text-[11px] font-semibold">
  {[["Today", 0], ["+1 wk", 7], ["+1 mo", 30]].map(([l, d]) => <button key={l} onClick={() => setDate(addDays(new Date(), d))} className="rounded-(--radius) bg-muted px-2 py-1">{l}</button>)}
</div>

// SlotPicker: 4-col grid of times. free = shadow-[--shadow-card]; selected = bg-primary text-white; booked = line-through opacity-45 disabled.
export const SlotPicker = ({ slots, value, onChange }: SlotPickerProps) => (
  <div className="grid grid-cols-4 gap-1.5 text-xs font-semibold tabular-nums">
    {slots.map((s) => (
      <button key={s.time} disabled={s.booked} onClick={() => onChange(s.time)}
        className={cn("rounded-(--radius) py-2 shadow-[--shadow-card]", value === s.time && "bg-primary text-primary-foreground shadow-none", s.booked && "line-through opacity-45")}>{s.time}</button>
    ))}
  </div>
)`,

refraction: `type Row = { sph: string; cyl: string; axis: string; va: string }
export function RefractionGrid({ re, le, onChange }: RefractionGridProps) {
  // Tab moves across fields; "c" (when no field is focused) copies RE to LE.
  useHotkeys("c", () => onChange("le", re))
  return (
    <div className="flex gap-4.5">
      {(["re", "le"] as const).map((eye) => (
        <section key={eye} className="flex-1 rounded-lg bg-muted p-4">
          <h3 className="mb-2.5 text-base font-bold">{eye === "re" ? "Right eye (RE)" : "Left eye (LE)"}</h3>
          <div className="grid grid-cols-[96px_repeat(4,1fr)] items-center gap-2">
            {["", "SPH", "CYL", "AXIS", "VA"].map((h) => <span key={h} className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</span>)}
            {ROWS.map((row) => (
              <Fragment key={row.key}>
                <span className="text-xs font-semibold">{row.label}</span>
                {(["sph", "cyl", "axis", "va"] as const).map((f) => (
                  <input key={f} value={data[eye][row.key][f]} onChange={(e) => set(eye, row.key, f, e.target.value)}
                    onBlur={(e) => set(eye, row.key, f, format(f, e.target.value))}
                    className="h-[34px] rounded-(--radius) border border-input bg-card px-2.5 font-mono text-[13px] font-semibold focus:border-ring focus:ring-[3px] focus:ring-ring/15 focus:outline-none" />
                ))}
              </Fragment>
            ))}
          </div>
          <IopField eye={eye} /> {/* flag if > 21: text-primary "▲ High" */}
        </section>
      ))}
    </div>
  )
}
// format(): sph/cyl → signed 2-decimal with true minus (−2.25); axis → 0–180 integer`,

rx: `export function PrescriptionRow({ m, onRemove }: { m: Medicine; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2.5 rounded-(--radius) bg-card px-3 py-2 text-[13px]">
      <b className="flex-[1.5]">{m.name}</b>
      <span className="w-[70px] text-muted-foreground">{m.eye}</span>
      <span className="w-[70px] text-muted-foreground">{m.frequency}</span>
      <span className="w-[70px] text-muted-foreground">{m.duration}</span>
      <button onClick={onRemove} aria-label="Remove" className="text-muted-foreground hover:text-foreground">✕</button>
    </div>
  )
}
export function TemplatePicker({ templates, onApply }: TemplatePickerProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">Template:</span>
      {templates.map((t) => <button key={t.id} onClick={() => onApply(t)} className="rounded-full bg-card px-2.5 py-1 font-semibold hover:bg-accent hover:text-accent-foreground">{t.name}</button>)}
    </div>
  )
}
// "+ Add medicine": <Combobox> over the formulary; Tab moves to dose, Enter adds the row. Apply template replaces/merges the medicine list.`,

bill: `const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n)
export function BillTable({ items, discount = 0, tax = 0 }: BillTableProps) {
  const total = items.reduce((s, i) => s + i.qty * i.rate, 0) - discount + tax
  return (
    <div className="overflow-hidden rounded-lg bg-card text-[13px] shadow-[--shadow-card]">
      <div className="flex bg-muted px-4 py-2 text-[11px] font-semibold text-muted-foreground">
        <span className="flex-1">Item</span><span className="w-12 text-right">Qty</span><span className="w-24 text-right">Rate</span><span className="w-28 text-right">Amount</span>
      </div>
      {items.map((i) => (
        <div key={i.id} className="flex border-t border-border/60 px-4 py-2.5 tabular-nums">
          <span className="flex-1 font-semibold">{i.name}</span><span className="w-12 text-right">{i.qty}</span>
          <span className="w-24 text-right text-muted-foreground">{inr(i.rate)}</span><span className="w-28 text-right font-semibold">{inr(i.qty * i.rate)}</span>
        </div>
      ))}
      <div className="flex flex-col items-end gap-1 border-t border-border/60 px-4 py-2.5 tabular-nums">
        <Row label="Discount" value={"− " + inr(discount)} muted /><Row label="GST" value={inr(tax)} muted />
        <div className="flex gap-8 text-[length:var(--text-subtitle)] font-bold"><span>Total</span><span className="w-28 text-right">{inr(total)}</span></div>
      </div>
    </div>
  )
}
const MODES = ["Cash", "UPI", "Card", "Insurance", "Split", "Credit"]
export function PaymentSelector({ mode, onMode, due, tendered, onTendered, onCollect }: PaymentSelectorProps) {
  return (
    <div className="flex w-[300px] flex-col gap-2.5">
      <div className="grid grid-cols-3 gap-1.5 text-xs font-semibold">
        {MODES.map((m) => <button key={m} onClick={() => onMode(m)} className={cn("rounded-(--radius) py-2.5 shadow-[--shadow-card]", mode === m && "bg-accent text-accent-foreground ring-[1.5px] ring-primary shadow-none")}>{m}</button>)}
      </div>
      <Input prefix="₹" inputMode="numeric" value={tendered} onChange={(e) => onTendered(e.target.value)} />
      {tendered > due && <span className="text-xs font-semibold text-success-soft-foreground">Change {inr(tendered - due)}</span>}
      <Button shortcut="⏎" onClick={onCollect}>Collect {inr(due)}</Button>
    </div>
  )
}`,

drawer: `// Right-side panel (radix Dialog as a sheet). Esc closes, Enter submits the form.
export function DetailDrawer({ open, onClose, title, footer, children }: DrawerProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogOverlay className="bg-foreground/25 motion-overlay-in" />
      <DialogContent className="fixed inset-y-0 right-0 flex w-[380px] flex-col bg-card shadow-[--shadow-overlay] motion-sheet-in-r">
        <div className="flex items-center border-b border-border/60 px-4.5 py-3.5">
          <DialogTitle className="flex-1 text-[length:var(--text-subtitle)] font-bold">{title}</DialogTitle><Kbd>Esc</Kbd>
        </div>
        <div className="flex-1 space-y-3 overflow-auto px-4.5 py-4">{children}</div>
        <div className="flex justify-end gap-2 border-t border-border/60 px-4.5 py-3">{footer}</div>
      </DialogContent>
    </Dialog>
  )
}
// usage: <DetailDrawer title="New patient" footer={<><Button variant="secondary">Cancel</Button><Button shortcut="⏎">Register</Button></>}>…fields…</DetailDrawer>`,

timeline: `export function VisitTimeline({ visits }: { visits: Visit[] }) {
  return (
    <ol className="w-[360px]">
      {visits.map((v, i) => (
        <li key={v.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className={cn("mt-1.5 size-2.5 rounded-full", i === 0 ? "bg-primary" : "bg-border")} />
            {i < visits.length - 1 && <span className="w-0.5 flex-1 bg-border/60" />}
          </div>
          <div className="pb-4.5">
            <div className="text-xs tabular-nums text-muted-foreground">{v.date} · {v.doctor}</div>
            <div className="mt-0.5 text-[13px] font-semibold">{v.title}</div>
            <div className="text-xs text-muted-foreground">{v.note}</div>
          </div>
        </li>
      ))}
    </ol>
  )
}
export function StockRow({ s }: { s: StockItem }) {
  const pct = Math.min(100, Math.round((s.qty / s.max) * 100))
  const tone = s.qty === 0 ? "error" : pct < 25 ? "warning" : "success"
  return (
    <div className="flex items-center gap-3 border-t border-border/60 px-4 py-2.5 text-[13px] first:border-t-0">
      <span className="flex-[1.4] font-semibold">{s.name}<div className="font-mono text-[11px] font-medium text-muted-foreground">{s.batch}</div></span>
      <span className={cn("w-20 tabular-nums", s.expiringSoon && "text-warning-soft-foreground")}>{s.expiry}</span>
      <span className="w-28"><Progress value={pct} /></span>
      <StatusPill status={tone === "success" ? "In stock" : tone === "warning" ? "Low" : "Out"} />
    </div>
  )
}`,

icons: `import { Users, UserPlus, Eye, Stethoscope, Pill, Glasses, Receipt, FlaskConical, Calendar, Search, Bell, Settings, Printer, FileText, Clock, AlertTriangle, Check, X, MoreHorizontal, ChevronRight, Plus, Shield } from "lucide-react"
// strokeWidth={2}; size 16 inline, 20 in buttons, 24 in empty states. Colour = currentColor.
// Mapping: Patients Users · New patient UserPlus · Workup Eye · Doctor Stethoscope · Pharmacy Pill · Optical Glasses · Billing Receipt · Labs FlaskConical
//          Appointments Calendar · Search Search · Alerts AlertTriangle · Insurance Shield · Print Printer · Wait time Clock`
,
tokens: "/* Single source of truth. Values mirror web/src/index.css; only --color-background is changed (pure white). */\n:root{\n  --color-background:#ffffff; /* ← change this ONE line to restyle every page */\n  --color-foreground:#111827;\n  --color-card:#ffffff;\n  --color-muted:#f1f5f9;\n  --color-muted-foreground:#64748b;\n  --color-border:#cbd5e1;\n  --color-divider:#e2e8f0;\n  --color-ring:#2563eb;\n  --color-primary:#2563eb;\n  --color-primary-hover:#1d4ed8;\n  --color-primary-foreground:#ffffff;\n  --color-accent:#e8f4ff;\n  --color-accent-foreground:#2563eb;\n  --color-destructive:#ff3b30;\n  --color-success:#34c759;--color-success-soft:#e8f9ee;--color-success-soft-foreground:#1a7f37;\n  --color-warning:#ff9f0a;--color-warning-soft:#fff4e5;--color-warning-soft-foreground:#b5650a;\n  --color-error:#ff3b30;--color-error-soft:#ffece9;--color-error-soft-foreground:#c62b1f;\n  --color-info-soft:#eaf1ff;--color-info-soft-foreground:#1d4ed8;\n  --color-neutral-soft:#f1f5f9;--color-neutral-soft-foreground:#475569;\n  --radius-sm:6px;--radius:8px;--radius-lg:12px;--radius-full:9999px;\n  --shadow-sm:0 1px 2px 0 rgba(15,23,42,.04),0 2px 6px -1px rgba(15,23,42,.08);\n  --shadow-card:0 0 0 1px var(--color-border),var(--shadow-sm);\n  --font-sans:\"Inter\",-apple-system,BlinkMacSystemFont,\"Helvetica Neue\",Arial,sans-serif;\n  --font-mono:\"SF Mono\",\"Fira Code\",monospace;\n}\nbody{margin:0;background:var(--color-background);color:var(--color-foreground);font-family:var(--font-sans)}\na{color:var(--color-primary)}a:hover{color:var(--color-primary-hover)}\n"
,
forms2: "// Field anatomy: label row = text + (required ? red * : \"Optional\" tag) + (error ? inline red message : none)\nexport function Field({ label, required, optional = !required, auto, error, help, children }: FieldProps) {\n  return (\n    <label className=\"block min-w-0\">\n      <span className=\"mb-2 flex items-center gap-1 text-[12.5px] font-medium\">\n        {label}{required && <span className=\"font-bold text-error-soft-foreground\">*</span>}\n        {error ? <span className=\"ml-auto text-[11.5px] font-semibold text-error-soft-foreground\">{error}</span>\n          : auto ? <span className=\"ml-auto text-[11px] text-muted-foreground\">Auto</span>\n          : optional && <span className=\"ml-auto text-[11px] text-muted-foreground\">Optional</span>}\n      </span>\n      {children}\n      {help && <span className=\"mt-1 block text-xs text-muted-foreground\">{help}</span>}\n    </label>\n  )\n}\n// Control: calm ring, blue focus ring + glow, hover darkens. Wrapper carries the ring so prefix/suffix sit inside.\nconst box = \"flex h-[46px] items-center gap-2 rounded-xl bg-card px-4 text-sm ring-1 ring-inset ring-border transition-shadow hover:ring-muted-foreground focus-within:ring-[1.5px] focus-within:ring-primary focus-within:shadow-[0_0_0_4px_rgb(37_99_235/.14)] data-[invalid=true]:ring-error\"\n// PhoneInput: prefix \"+91\", digits only, max 10.  CurrencyInput: prefix ₹, tabular-nums, right aligned, en-IN grouping.\n// AddressFields: Input + popover list of saved addresses (substring match, hide exact match). On submit, if value not in list (case-insensitive) add it to the saved list (dropdown option \"address\").\n// MultiSelect: chips inside the box (bg-accent text-accent-foreground rounded-lg px-2.5 py-1 font-semibold) with ✕ to remove.\n// FileUpload: dashed border-border rounded-2xl, \"drop or browse\", accept pdf/jpg/png, max 10 MB.\n// Section legend (top of any form): \"* required, everything else optional\". Readonly/auto values: bg-muted, no ring.\n// Linked fields: Age <-> DOB (editing one recalculates the other); Doctor -> Department auto-fills (user can override).",
wizard: "// <WizardDialog steps={[\"Patient Info\",\"Services & Payment\",\"Receipt\"]}>\n// Header: title + sub (record ID · \"* required\"), step pills: done = bg-accent + ✓, current = bg-primary text-white, upcoming = text-muted-foreground.\n// Body: border-t border-divider, scroll, sections as cards (rounded-[20px] ring-1 ring-divider p-6, gap-5). Footer: border-t, error message left (text-error-soft-foreground), Back (secondary) + Next/Primary right.\n// Rules: validate on Next, show field-level \"Required\" in label row AND the first error in the footer; create the record at the step that owns it (patient on step 1) so Back/edit updates instead of duplicating.\n// Full-screen on tablet (inset-0), centered max-w-[880px] on desktop. Esc closes, Enter advances.",
navbits: "// PageHeader: [Back] [Title + description] [center: Tabs/Segmented] [actions: Refresh (icon), Stats (outline), Primary \"+ Add X\" with shortcut]\n// Breadcrumbs: text-[13px] text-muted-foreground, separator \"/\", current page text-foreground font-semibold.\n// DateNavigator: ‹ [date] › + \"Today\" (soft button, only when not today). Changing date resets pagination.\n// SearchBar variant=\"with-autocomplete\": rounded-full, suggestions popover (name + \"ID · phone\"); selecting jumps to the record; Enter filters the current list; shows \"Showing results for “x” Clear\".",
states: "// EmptyState: centered card, title (font-semibold), one-line reason, primary action (e.g. \"Register Patient\").\n// ErrorState: same layout, title \"Failed to load …\", secondary \"Retry\" button.\n// Skeleton: rows of bg-muted rounded-md bars matching real column widths; never spinners for lists.\n// StatBadge: rounded-full px-4 h-[38px], tone soft bg, bold value + label (info = Admitted, success = Discharged).\n// RemovableChip: rounded-full bg-accent text-accent-foreground px-3 h-[30px] with ✕.",
charts: "// Chart theme (recharts): primary = current series, accent = history, success/warning = paid/due, no gridlines except a faint divider baseline, tooltip = card with shadow-[--shadow-card].\n// Bar: radius [6,6,0,0], today's bar bg-primary others bg-accent. Line/Area: stroke var(--color-primary) 2.5px, area fill primary at 14% opacity. Donut: conic split success/warning with the % in the centre.\n// Always show ONE headline number above the chart (text-2xl font-bold tabular-nums).",
misc: "// Accordion: rounded-[20px] ring-1 ring-divider, items separated by border-divider, chevron ▴/▾, one open at a time.\n// DropdownMenu (row actions): trigger = kebab ⋮ in a 30px rounded-lg button; panel = rounded-[14px] bg-card ring-1 ring-divider shadow-popover p-1.5; items rounded-lg px-3 py-2 hover:bg-muted; destructive item text-error-soft-foreground hover:bg-error-soft.",
receipt: "// Printed documents use ReceiptLayout + ReceiptHeader (hospital name/logo/registration no.). White paper, black text, dashed rules (border-dashed border-slate-300), mono for IDs, tabular-nums for amounts.\n// Documents: CashReceipt, PrescriptionReceipt, ReadingsReceipt, ClinicalFindingsReceipt, ReadingsAndFindings, InsuranceCashReceipt, InsuranceEnhancementBill, InsuranceFinalBill, Report.\n// Screen tokens don't apply to print; keep @media print rules, page-break-inside: avoid on item rows."
};
