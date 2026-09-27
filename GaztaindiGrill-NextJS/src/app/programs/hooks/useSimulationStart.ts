"use client"

import { useMemo, useState } from 'react'
import { useGrillState } from '@/app/control/hooks/useGrillState'
import type { ReferenceType } from '@/types'

// Where simulations of the program being written start: the real left grill, or in relative mode
// a starting height typed over it. Shared so every simulation of the form starts at the same place.
export function useSimulationStart(referenceType: ReferenceType) {
  const grillState = useGrillState(0)

  // Null follows the real grill; typing fixes the starting height.
  const [startDraft, setStartDraft] = useState<string | null>(null)
  const typedStart = Number(startDraft)
  const hasTypedStart = startDraft !== null && startDraft !== '' && typedStart >= 0 && typedStart <= 100
  const startPosition = referenceType === 'relative' && hasTypedStart ? typedStart : grillState.position

  const start = useMemo(
    () => ({ position: startPosition, rotation: grillState.rotation }),
    [startPosition, grillState.rotation]
  )

  return {
    start,
    input: startDraft ?? String(grillState.position),
    setInput: setStartDraft,
    followsRealGrill: startDraft === null,
    followRealGrill: () => setStartDraft(null),
  }
}

export type SimulationStart = ReturnType<typeof useSimulationStart>
