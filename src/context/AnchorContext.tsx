import { createContext, useContext, useState, useCallback } from "react"
import { DEFAULT_RHYTHM_ITEMS } from "@/components/anchor/anchor-data"
import type { RhythmItem } from "@/components/anchor/anchor-types"

const ITEMS_KEY = "bopos_anchor_items"

function loadItems(): RhythmItem[] {
  try {
    const s = localStorage.getItem(ITEMS_KEY)
    return s ? JSON.parse(s) : DEFAULT_RHYTHM_ITEMS
  } catch { return DEFAULT_RHYTHM_ITEMS }
}

function saveItems(items: RhythmItem[]) {
  localStorage.setItem(ITEMS_KEY, JSON.stringify(items))
}

interface AnchorContextValue {
  items: RhythmItem[]
  addItem: (item: RhythmItem) => void
}

const AnchorContext = createContext<AnchorContextValue | null>(null)

export function AnchorProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<RhythmItem[]>(loadItems)

  const addItem = useCallback((item: RhythmItem) => {
    setItems((prev) => {
      const next = [...prev, item]
      saveItems(next)
      return next
    })
  }, [])

  return (
    <AnchorContext.Provider value={{ items, addItem }}>
      {children}
    </AnchorContext.Provider>
  )
}

export function useAnchor(): AnchorContextValue {
  const ctx = useContext(AnchorContext)
  if (!ctx) throw new Error("useAnchor must be used inside <AnchorProvider>")
  return ctx
}
