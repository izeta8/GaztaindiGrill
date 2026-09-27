"use client"

import { useCallback, useMemo, useRef } from 'react'
import SimulatorScene from '@/components/three/SimulatorScene'
import type { ProgramStep, ReferenceType } from '@/types'
import { planSimulation, stepNotice, type GrillPose } from '@/utils'

type StepPreviewProps = {
  // The steps that run before this one, which decide where it starts.
  previousSteps: ProgramStep[]
  // Null while the value being typed is not a valid step yet.
  step: ProgramStep | null
  referenceType: ReferenceType
  start: GrillPose
}

// Where the left grill ends up once this step has run after the ones before it.
export function StepPreview({ previousSteps, step, referenceType, start }: StepPreviewProps) {
  const plan = useMemo(
    () => planSimulation(step ? [...previousSteps, step] : previousSteps, referenceType, start),
    [previousSteps, step, referenceType, start]
  )
  const simulated = step ? plan[plan.length - 1] : undefined
  const pose = plan.length > 0 ? plan[plan.length - 1].end : start
  const notice = simulated ? stepNotice(simulated) : null

  const poseRef = useRef(pose)
  poseRef.current = pose
  const getPose = useCallback(() => poseRef.current, [])

  return (
    <div className="space-y-2">
      <div className="relative">
        <SimulatorScene className="w-full h-[240px]" getPose={getPose} />
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center rounded-xl bg-white/90 border border-gray-200 shadow-sm px-3 h-10 text-base font-semibold text-gray-900 whitespace-nowrap">
          {Math.round(pose.position)}% · {Math.round(pose.rotation) % 360}°
        </div>
      </div>
      {notice && <p className="text-xs text-amber-700">{notice}</p>}
    </div>
  )
}
