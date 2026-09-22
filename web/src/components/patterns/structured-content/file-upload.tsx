/**
 * patterns/structured-content/file-upload.tsx
 *
 * FileUpload — drag-and-drop + click-to-browse file upload zone.
 *
 * Presentational only — no real upload logic. The caller controls the file
 * list and progress values. Actual upload (Supabase Storage, presigned URLs,
 * etc.) is wired when real pages are built.
 *
 * Props:
 *   files       — controlled list of files with per-file progress
 *   onAdd       — called when the user drops/selects new files
 *   onRemove    — called with the file id when the user clicks the × button
 *   accept      — MIME types / extensions (mirrors HTML input accept attr,
 *                 e.g. "image/*,.pdf")
 *   multiple    — allow selecting more than one file (default: true)
 *   maxSize     — per-file size limit in bytes; exceeded files trigger onError
 *   onError     — called when a file fails validation (size exceeded, wrong type)
 *   disabled    — disables the drop zone and all interactions
 *   className   — forwarded to the root div
 *
 * UploadFile shape:
 *   id           — stable identifier (caller-generated, e.g. crypto.randomUUID())
 *   file         — the native File object
 *   progress     — 0-100 percentage; null = pending/not started; -1 = failed
 *   errorMessage — optional failure reason shown below the file name
 *
 * Usage:
 *   const [files, setFiles] = useState<UploadFile[]>([])
 *
 *   <FileUpload
 *     files={files}
 *     onAdd={(newFiles) => {
 *       const entries = newFiles.map(f => ({
 *         id: crypto.randomUUID(), file: f, progress: null
 *       }))
 *       setFiles(prev => [...prev, ...entries])
 *       // kick off real upload here and update progress externally
 *     }}
 *     onRemove={(id) => setFiles(prev => prev.filter(f => f.id !== id))}
 *     accept="image/*,.pdf,.docx"
 *     maxSize={10 * 1024 * 1024} // 10 MB
 *   />
 */

import * as React from "react"
import { Upload, X, FileText, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

/* ─── Types ─────────────────────────────────────────────────────────────────── */

export interface UploadFile {
  /** Stable caller-generated id (e.g. crypto.randomUUID()) */
  id: string
  /** The native File object */
  file: File
  /**
   * Upload progress 0-100.
   * null = pending / not started
   * -1   = upload failed
   */
  progress: number | null
  /** Failure reason shown under the file name when progress === -1 */
  errorMessage?: string
}

export interface FileUploadProps {
  files: UploadFile[]
  onAdd: (files: File[]) => void
  onRemove: (id: string) => void
  /** MIME types or extensions (HTML accept attribute format) */
  accept?: string
  multiple?: boolean
  /** Per-file max size in bytes. Files exceeding this call onError. */
  maxSize?: number
  /** Called when a file fails size or type validation */
  onError?: (message: string, file: File) => void
  disabled?: boolean
  className?: string
}

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatAcceptLabel(accept: string): string {
  return accept
    .split(",")
    .map((a) => a.trim().replace("image/", "").replace("application/", "").toUpperCase())
    .join(", ")
}

/* ─── ProgressBar ───────────────────────────────────────────────────────────── */

function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-1 w-full rounded-full bg-[--color-muted] overflow-hidden"
    >
      <div
        className={cn(
          "h-full rounded-full bg-[--color-primary]",
          "transition-[width] duration-300 ease-out"
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

/* ─── FileUpload ────────────────────────────────────────────────────────────── */

const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(
  (
    {
      files,
      onAdd,
      onRemove,
      accept,
      multiple = true,
      maxSize,
      onError,
      disabled = false,
      className,
    },
    ref
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = React.useState(false)
    const dragCounterRef = React.useRef(0)

    /* ── File validation & dispatch ── */

    const handleFiles = React.useCallback(
      (rawFiles: FileList | null) => {
        if (!rawFiles || disabled) return

        const valid: File[] = []
        Array.from(rawFiles).forEach((file) => {
          if (maxSize && file.size > maxSize) {
            onError?.(
              `"${file.name}" exceeds the ${formatBytes(maxSize)} size limit.`,
              file
            )
            return
          }
          valid.push(file)
        })

        if (valid.length > 0) onAdd(valid)
      },
      [disabled, maxSize, onAdd, onError]
    )

    /* ── Drag events ── */

    const onDragEnter = (e: React.DragEvent) => {
      e.preventDefault()
      dragCounterRef.current += 1
      if (!disabled) setIsDragging(true)
    }

    const onDragLeave = (e: React.DragEvent) => {
      e.preventDefault()
      dragCounterRef.current -= 1
      if (dragCounterRef.current === 0) setIsDragging(false)
    }

    const onDragOver = (e: React.DragEvent) => {
      e.preventDefault()
    }

    const onDrop = (e: React.DragEvent) => {
      e.preventDefault()
      dragCounterRef.current = 0
      setIsDragging(false)
      handleFiles(e.dataTransfer.files)
    }

    /* ── Click to browse ── */

    const openBrowser = () => {
      if (!disabled) inputRef.current?.click()
    }

    const onKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        openBrowser()
      }
    }

    return (
      <div ref={ref} className={cn("flex flex-col gap-3", className)}>
        {/* Drop zone */}
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="Upload files — click or drag files here"
          aria-disabled={disabled}
          onClick={openBrowser}
          onKeyDown={onKeyDown}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
          className={cn(
            "flex flex-col items-center justify-center gap-2",
            "rounded-[--radius-lg] border-2 border-dashed",
            "px-6 py-10 text-center",
            "motion-interactive cursor-pointer select-none",
            "focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-[--color-ring] focus-visible:ring-offset-2",
            // States
            isDragging && !disabled
              ? "border-[--color-primary] bg-[--color-accent]"
              : "border-[--color-border] bg-[--color-muted] hover:border-[--color-primary] hover:bg-[--color-accent]",
            disabled && "opacity-50 cursor-not-allowed pointer-events-none"
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "flex items-center justify-center h-10 w-10 rounded-full mb-1",
              isDragging
                ? "bg-[--color-accent] text-[--color-primary]"
                : "bg-[--color-surface] text-[--color-muted-foreground]"
            )}
          >
            <Upload size={20} strokeWidth={1.5} />
          </span>

          <div>
            <p className="text-[length:var(--text-body)] font-medium text-[--color-foreground]">
              {isDragging ? "Drop files here" : "Click to browse or drag files"}
            </p>
            <p className="text-[length:var(--text-caption)] text-[--color-muted-foreground] mt-0.5">
              {accept ? formatAcceptLabel(accept) : "All file types"}
              {maxSize ? ` · Max ${formatBytes(maxSize)}` : ""}
            </p>
          </div>

          {/* Hidden file input */}
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            accept={accept}
            multiple={multiple}
            disabled={disabled}
            tabIndex={-1}
            onChange={(e) => handleFiles(e.target.files)}
            // Reset value so re-selecting the same file triggers onChange
            onClick={(e) => ((e.currentTarget as HTMLInputElement).value = "")}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <ul
            aria-label="Selected files"
            className="flex flex-col gap-2"
          >
            {files.map((item) => {
              const isFailed = item.progress === -1
              const isDone = item.progress === 100
              const isUploading =
                item.progress !== null &&
                item.progress >= 0 &&
                item.progress < 100

              return (
                <li
                  key={item.id}
                  className={cn(
                    "flex items-start gap-3 rounded-[--radius]",
                    "border border-[--color-border] bg-[--color-surface]",
                    "px-3 py-2.5",
                    isFailed && "border-[--color-error] bg-[--color-error-soft]"
                  )}
                >
                  {/* File icon */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "shrink-0 mt-0.5",
                      isFailed
                        ? "text-[--color-error-soft-foreground]"
                        : "text-[--color-muted-foreground]"
                    )}
                  >
                    <FileText size={18} strokeWidth={1.5} />
                  </span>

                  {/* File name + progress */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          "text-[length:var(--text-body)] font-medium truncate",
                          isFailed
                            ? "text-[--color-error-soft-foreground]"
                            : "text-[--color-foreground]"
                        )}
                      >
                        {item.file.name}
                      </p>
                      <span className="text-[length:var(--text-caption)] text-[--color-muted-foreground] shrink-0">
                        {formatBytes(item.file.size)}
                      </span>
                    </div>

                    {/* Error message */}
                    {isFailed && item.errorMessage && (
                      <p className="text-[length:var(--text-caption)] text-[--color-error-soft-foreground] mt-0.5">
                        {item.errorMessage}
                      </p>
                    )}

                    {/* Progress bar */}
                    {isUploading && (
                      <div className="mt-1.5">
                        <ProgressBar value={item.progress!} />
                        <p className="text-[10px] text-[--color-muted-foreground] mt-0.5">
                          {item.progress}%
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Status icon / remove */}
                  <div className="shrink-0 mt-0.5 flex items-center gap-1">
                    {isDone && (
                      <CheckCircle2
                        size={16}
                        className="text-[--color-success]"
                        aria-label="Upload complete"
                      />
                    )}
                    {isFailed && (
                      <AlertCircle
                        size={16}
                        className="text-[--color-error-soft-foreground]"
                        aria-label="Upload failed"
                      />
                    )}
                    <button
                      type="button"
                      aria-label={`Remove ${item.file.name}`}
                      onClick={() => onRemove(item.id)}
                      className={cn(
                        "flex items-center justify-center",
                        "h-5 w-5 rounded-[--radius-xs]",
                        "text-[--color-muted-foreground]",
                        "hover:text-[--color-foreground]",
                        "motion-interactive focus-visible:outline-none",
                        "focus-visible:ring-2 focus-visible:ring-[--color-ring]",
                        "focus-visible:ring-offset-1"
                      )}
                    >
                      <X size={13} strokeWidth={2} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    )
  }
)
FileUpload.displayName = "FileUpload"

export { FileUpload }
export type { UploadFile as FileUploadFile }
