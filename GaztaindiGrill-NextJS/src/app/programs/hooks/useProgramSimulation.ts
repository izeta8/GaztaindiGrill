"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ProgramStep, ReferenceType } from '@/types'
import { planSimulation, poseAt, stepDuration, type GrillPose } from '@/utils'

export const SIMULATION_SPEEDS = [1, 2, 5, 10] as const
export type SimulationSpeed = typeof SIMULATION_SPEEDS[number]

export type SimulationStatus = 'idle' | 'running' | 'paused' | 'finished'

// What the page shows as text, rounded so it only re-renders when a number on screen changes.
interface SimulationReadout {
  position: number
  rotation: number
  stepElapsed: number
}

// Plays a program's simulation. The 3D grill reads getPose() every frame; the page only gets the
// step, the status and a rounded readout.
export function useProgramSimulation(steps: ProgramStep[], referenceType: ReferenceType, start: GrillPose) {
  const plan = useMemo(() => planSimulation(steps, referenceType, start), [steps, referenceType, start])

  const [status, setStatus] = useState<SimulationStatus>('idle')
  const [stepIndex, setStepIndex] = useState(0)
  const [speed, setSpeedState] = useState<SimulationSpeed>(1)
  const [readout, setReadout] = useState<SimulationReadout>({ ...start, stepElapsed: 0 })

  // Simulated seconds into the current step: `elapsed` banked, plus real time since `since` while running.
  const clock = useRef<{ elapsed: number; since: number | null }>({ elapsed: 0, since: null })
  const live = useRef({ plan, status, stepIndex, speed, start })
  live.current = { plan, status, stepIndex, speed, start }

  const stepElapsed = useCallback((now: number) => {
    const { elapsed, since } = clock.current
    return since === null ? elapsed : elapsed + ((now - since) / 1000) * live.current.speed
  }, [])

  const getPose = useCallback((): GrillPose => {
    const { plan, status, stepIndex, start } = live.current
    if (status === 'idle' || plan.length === 0) return start
    if (stepIndex >= plan.length) return plan[plan.length - 1].end
    return poseAt(plan[stepIndex], stepElapsed(performance.now()))
  }, [stepElapsed])

  const showReadout = useCallback((pose: GrillPose, elapsed: number) => {
    const next = { position: Math.round(pose.position), rotation: Math.round(pose.rotation) % 360, stepElapsed: Math.floor(elapsed) }
    setReadout((current) =>
      current.position === next.position && current.rotation === next.rotation && current.stepElapsed === next.stepElapsed
        ? current
        : next)
  }, [])

  const reset = useCallback(() => {
    clock.current = { elapsed: 0, since: null }
    setStatus('idle')
    setStepIndex(0)
    showReadout(live.current.start, 0)
  }, [showReadout])

  // Editing the program, its mode or where it starts leaves nothing to resume.
  useEffect(() => { reset() }, [plan, reset])

  const goToStep = useCallback((index: number, now: number) => {
    const running = live.current.status === 'running'
    clock.current = { elapsed: 0, since: running ? now : null }
    live.current.stepIndex = index
    setStepIndex(index)
    if (index >= live.current.plan.length) {
      clock.current.since = null
      live.current.status = 'finished'
      setStatus('finished')
    }
  }, [])

  // Moves on through every step whose time is up, then shows where the grill is.
  useEffect(() => {
    if (status !== 'running') return
    let frame = 0
    const tick = () => {
      const now = performance.now()
      let index = live.current.stepIndex
      let elapsed = stepElapsed(now)
      while (index < plan.length && elapsed >= stepDuration(plan[index])) {
        elapsed -= stepDuration(plan[index])
        index++
      }
      if (index !== live.current.stepIndex) {
        goToStep(index, now)
        clock.current.elapsed = index < plan.length ? elapsed : 0
      }
      showReadout(getPose(), stepElapsed(now))
      if (index < plan.length) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [status, plan, stepElapsed, getPose, goToStep, showReadout])

  const play = useCallback(() => {
    if (live.current.plan.length === 0) return
    if (live.current.status === 'finished') {
      clock.current = { elapsed: 0, since: null }
      live.current.stepIndex = 0
      setStepIndex(0)
    }
    clock.current.since = performance.now()
    setStatus('running')
  }, [])

  const pause = useCallback(() => {
    clock.current = { elapsed: stepElapsed(performance.now()), since: null }
    setStatus('paused')
  }, [stepElapsed])

  // Ends the step where it would have ended, so the next one starts from its final pose.
  const skip = useCallback(() => {
    const { status, stepIndex } = live.current
    if (status !== 'running' && status !== 'paused') return
    goToStep(stepIndex + 1, performance.now())
    showReadout(getPose(), 0)
  }, [goToStep, getPose, showReadout])

  const setSpeed = useCallback((next: SimulationSpeed) => {
    const now = performance.now()
    clock.current = { elapsed: stepElapsed(now), since: clock.current.since === null ? null : now }
    setSpeedState(next)
  }, [stepElapsed])

  return { plan, status, stepIndex, speed, readout, getPose, play, pause, skip, reset, setSpeed }
}
