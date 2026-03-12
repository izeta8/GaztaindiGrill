"use client"

import React, { useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTF } from 'three-stdlib'
import type { GrillState } from '@/types'

// Definimos el resultado del GLTF de forma más flexible para evitar errores de Mesh/Object3D
type GLTFResult = GLTF & {
  nodes: { [key: string]: THREE.Object3D }
  materials: { [key: string]: THREE.Material }
}

interface GrillModelProps {
  grillState0: GrillState
  grillState1: GrillState
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number | [number, number, number]
}

export function GrillModel({ grillState0, grillState1, ...props }: GrillModelProps) {
  const { nodes, materials } = useGLTF('/models/parrilla_model.glb') as unknown as GLTFResult
  
  const grillPartRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (grillPartRef.current) {
      // ELEVACIÓN: Mapeamos la posición (0-100) al eje Y
      const targetY = (grillState0.position / 100) * 1.5 
      grillPartRef.current.position.y = THREE.MathUtils.lerp(
        grillPartRef.current.position.y, 
        targetY, 
        0.1
      )

      // ROTACIÓN: Si el modelo tiene giro
      const targetRotation = (grillState0.rotation * Math.PI) / 180
      grillPartRef.current.rotation.x = THREE.MathUtils.lerp(
        grillPartRef.current.rotation.x, 
        targetRotation, 
        0.1
      )
    }
  })

  return (
    <group {...props} dispose={null}>
      <group ref={grillPartRef}>
        <primitive object={nodes.Scene} />
      </group>
    </group>
  )
}

useGLTF.preload('/models/parrilla_model.glb')
