"use client"

import React, { useId, useLayoutEffect, useRef } from 'react'
import { GrillModel, type GrillModelProps } from './GrillModel'
import { useGrillCanvasSlots } from './SharedGrillCanvas'

interface GrillSceneProps {
  className?: string
  cameraPosition?: [number, number, number]
  controls?: boolean
  showLabels?: boolean
  onGrillSelect?: (index: 0 | 1) => void
  focusGrill?: 0 | 1
  target?: GrillModelProps['target']
}

const DEFAULT_CAMERA: [number, number, number] = [0, 6.2, 9]

// A place for the shared canvas (SharedGrillCanvas). The last scene mounted holds it.
export default function GrillScene({
  className = 'w-full h-[290px]',
  cameraPosition = DEFAULT_CAMERA,
  controls = true,
  showLabels = true,
  onGrillSelect,
  focusGrill,
  target,
}: GrillSceneProps) {
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  const { upsert, remove } = useGrillCanvasSlots()

  // Every render: the target carries the drag handlers and the values being picked.
  useLayoutEffect(() => {
    if (!ref.current) return
    upsert({
      id,
      element: ref.current,
      props: {
        cameraPosition,
        controls,
        content: (
          <GrillModel
            scale={1}
            showLabels={showLabels}
            onGrillSelect={onGrillSelect}
            focusGrill={focusGrill}
            target={target}
          />
        ),
      },
    })
  })

  // Layout too, so the canvas is back in the page before the closed modal is painted away.
  useLayoutEffect(() => () => remove(id), [id, remove])

  return <div ref={ref} className={className} />
}
