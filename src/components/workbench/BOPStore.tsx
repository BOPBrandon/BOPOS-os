/**
 * BOPStore — Per-user persistent store for Workbench-built tools.
 *
 * Every AI-generated tool calls useBOPStore(toolId, initial). Data is
 * persisted row-by-row into public.bop_tool_data, scoped by auth.uid().
 * RLS in Supabase guarantees no other user can read or write this data.
 *
 * Hook contract (locked by BOPOS_Workbench_Brain.md):
 *   const [data, setData, syncStatus] = useBOPStore(toolId, initialState)
 *   <SyncIndicator status={syncStatus} />
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

export type SyncStatus = "idle" | "saving" | "saved"

const DEBOUNCE_MS = 2000

export function useBOPStore<T extends Record<string, unknown>>(
  toolId: string,
  initial: T,
): [T, (next: T | ((prev: T) => T)) => void, SyncStatus] {
  const [data,       setDataState] = useState<T>(initial)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle")
  const userIdRef = useRef<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedKey  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hydrated  = useRef(false)

  // ── Initial hydrate from Supabase (per-user, per-tool) ──────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) { hydrated.current = true; return }
      userIdRef.current = auth.user.id

      const { data: rows } = await supabase
        .from("bop_tool_data")
        .select("key, value")
        .eq("user_id", auth.user.id)
        .eq("tool_id", toolId)

      if (!cancelled && rows && rows.length > 0) {
        const loaded = { ...initial } as Record<string, unknown>
        for (const row of rows) loaded[row.key] = row.value
        setDataState(loaded as T)
      }
      hydrated.current = true
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolId])

  // ── Debounced write on any setData after hydration ──────────
  const persist = useCallback(async (snapshot: T) => {
    const userId = userIdRef.current
    if (!userId) { setSyncStatus("idle"); return }

    setSyncStatus("saving")
    const rows = Object.entries(snapshot).map(([key, value]) => ({
      user_id: userId,
      tool_id: toolId,
      key,
      value:   value as unknown,
    }))

    const { error } = await supabase
      .from("bop_tool_data")
      .upsert(rows, { onConflict: "user_id,tool_id,key" })

    if (error) { setSyncStatus("idle"); return }
    setSyncStatus("saved")
    if (savedKey.current) clearTimeout(savedKey.current)
    savedKey.current = setTimeout(() => setSyncStatus("idle"), 1800)
  }, [toolId])

  const setData = useCallback((next: T | ((prev: T) => T)) => {
    setDataState((prev) => {
      const resolved = typeof next === "function"
        ? (next as (p: T) => T)(prev)
        : next
      if (hydrated.current) {
        if (saveTimer.current) clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(() => persist(resolved), DEBOUNCE_MS)
      }
      return resolved
    })
  }, [persist])

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    if (savedKey.current)  clearTimeout(savedKey.current)
  }, [])

  return [data, setData, syncStatus]
}

/**
 * SyncIndicator — fixed-position badge shown inside every Workbench-built tool.
 * Matches the spec in BOPOS_Workbench_Brain.md.
 */
export function SyncIndicator({ status }: { status: SyncStatus }) {
  if (status === "idle") return null
  const isSaving = status === "saving"
  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium shadow-md",
        isSaving
          ? "bg-amber-50 text-amber-700 border border-amber-200"
          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
      )}
    >
      {isSaving
        ? <Loader2 className="h-3 w-3 animate-spin" />
        : <CheckCircle2 className="h-3 w-3" />
      }
      {isSaving ? "Saving…" : "Saved to BOP"}
    </div>
  )
}
