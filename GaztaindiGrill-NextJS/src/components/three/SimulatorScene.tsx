"use client"

import React, { useId, useLayoutEffect, useRef } from 'react'
import type { GrillPose } from '@/utils'
import { SimulatedGrill } from './SimulatedGrill'
import { useGrillCanvasSlots } from './SharedGrillCanvas'

interface SimulatorSceneProps {
  className?: string
  getPose: () => GrillPose
}

const DEFAULT_CAMERA: [number, number, number] = [0, 6.2, 9]

// A place for the shared canvas showing the program simulator's grill.
export default function SimulatorScene({ className = 'w-full h-[290px]', getPose }: SimulatorSceneProps) {
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  const { upsert, remove } = useGrillCanvasSlots()

  // Only when getPose changes: the pose itself is read by the model every frame.
  useLayoutEffect(() => {
    if (!ref.current) return
    upsert({
      id,
      element: ref.current,
      props: { cameraPosition: DEFAULT_CAMERA, controls: false, content: <SimulatedGrill getPose={getPose} /> },
    })
  }, [id, upsert, getPose])

  useLayoutEffect(() => () => remove(id), [id, remove])

  return <div ref={ref} className={className} />
}
