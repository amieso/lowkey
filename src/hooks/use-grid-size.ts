'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'lowkey-grid-columns'
const DEFAULT_COLUMNS = 4
const MIN_COLUMNS = 2
const MAX_COLUMNS = 6

export function useGridSize() {
  const [columns, setColumns] = useState(DEFAULT_COLUMNS)
  const [isHydrated, setIsHydrated] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = parseInt(stored, 10)
      if (parsed >= MIN_COLUMNS && parsed <= MAX_COLUMNS) {
        setColumns(parsed)
      }
    }
    setIsHydrated(true)
  }, [])

  // Persist to localStorage on change
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY, columns.toString())
    }
  }, [columns, isHydrated])

  const increase = () => setColumns((c) => Math.min(c + 1, MAX_COLUMNS))
  const decrease = () => setColumns((c) => Math.max(c - 1, MIN_COLUMNS))

  return {
    columns,
    increase,
    decrease,
    canIncrease: columns < MAX_COLUMNS,
    canDecrease: columns > MIN_COLUMNS,
    isHydrated,
  }
}
