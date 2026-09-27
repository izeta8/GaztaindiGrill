"use client"

import React, { useEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame, useGraph, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { GrillPose } from '@/utils'
import {
  MODEL_URL,
  GRILL_NODE_NAMES,
  ROTOR_NODE_NAME,
  heightForPosition,
  focusCamera,
  fadeAllButGrill,
  type GLTFResult,
} from './grillRig'

interface SimulatedGrillProps {
  // Read every frame rather than passed as a pose, so the animation never re-renders React.
  getPose: () => GrillPose
}

// The left grill at whatever pose it is handed, framed like the position modal. Reads nothing
// from the real grill.
export function SimulatedGrill({ getPose }: SimulatedGrillProps) {
  const { scene } = useGLTF(MODEL_URL)
  const clonedScene = useMemo(() => scene.clone(), [scene])
  const { nodes } = useGraph(clonedScene) as unknown as GLTFResult
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const isFocused = useRef(false)

  // The node already carries a small X tilt that levels it inside its parent; the angle adds to it.
  const rotorBaseX = useMemo(() => nodes[ROTOR_NODE_NAME]?.rotation.x ?? 0, [nodes])

  // The shared canvas is sized after it moves into the page, so the first framing may be stale.
  useEffect(() => { isFocused.current = false }, [size.width, size.height])

  useEffect(() => { fadeAllButGrill(clonedScene, 0) }, [clonedScene])

  useFrame(() => {
    const grill = nodes[GRILL_NODE_NAMES[0]]
    if (!grill) return
    const pose = getPose()
    grill.position.y = heightForPosition(pose.position)
    const rotor = nodes[ROTOR_NODE_NAME]
    if (rotor) rotor.rotation.x = rotorBaseX + THREE.MathUtils.degToRad(pose.rotation)
    if (!isFocused.current) isFocused.current = focusCamera(camera, grill, 0)
  })

  return <primitive object={clonedScene} dispose={null} />
}
