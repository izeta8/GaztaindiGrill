"use client"

import React, { useRef, useMemo } from 'react'
import { useGLTF, Text3D, Outlines } from '@react-three/drei'
import { useFrame, useGraph } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTF } from 'three-stdlib'
import { useGrillState } from '@/app/control/hooks/useGrillState'

type GLTFResult = GLTF & {
  nodes: { [key: string]: THREE.Object3D }
  materials: { [key: string]: THREE.Material }
}

interface GrillModelProps {
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number | [number, number, number]
}

export function GrillModel({ ...props }: GrillModelProps) {
  const grillState0 = useGrillState(0)
  const grillState1 = useGrillState(1)
  
  // Solo obtenemos la escena base del caché
  const { scene } = useGLTF('/models/parrilla_model_v2.glb')
  
  // Clonamos la escena para tener una instancia única por componente
  const clonedScene = useMemo(() => scene.clone(), [scene])
  
  // Extraemos los nodos de la escena clonada
  const { nodes } = useGraph(clonedScene) as unknown as GLTFResult
  
  const leftGrillRef = useRef<THREE.Object3D | null>(null)
  const rightGrillRef = useRef<THREE.Object3D | null>(null)
  const leftTextRef = useRef<THREE.Group | null>(null)
  const rightTextRef = useRef<THREE.Group | null>(null)

  const MIN_HEIGHT = 1  // Altura cuando la parrilla está al 0%
  const MAX_HEIGHT = 1.8  // Altura cuando la parrilla está al 100%
  
  const box3 = useMemo(() => new THREE.Box3(), [])
  const vector3 = useMemo(() => new THREE.Vector3(), [])

  useMemo(() => {
    if (nodes.padre_parrilla_ezkerra) leftGrillRef.current = nodes.padre_parrilla_ezkerra
    if (nodes.padre_parrilla_eskubi) rightGrillRef.current = nodes.padre_parrilla_eskubi
  }, [nodes])

  const findBase = (root: THREE.Object3D) => {
    let base: THREE.Object3D | null = null
    root.traverse((child) => {
      if (!base && child.name.toLowerCase().includes('base')) {
        base = child
      }
    })
    return base || root
  }

  const updateGrill = (
    grillRef: React.RefObject<THREE.Object3D | null>,
    textRef: React.RefObject<THREE.Group | null>,
    positionPercent: number
  ) => {
    if (!grillRef.current) return

    const targetY = MIN_HEIGHT + (positionPercent / 100) * (MAX_HEIGHT - MIN_HEIGHT)
    grillRef.current.position.y = THREE.MathUtils.lerp(grillRef.current.position.y, targetY, 0.1)
    
    if (textRef.current) {
      const base = findBase(grillRef.current)
      
      box3.setFromObject(base)
      box3.getCenter(vector3)
      
      const FORWARD_OFFSET = 0 
      const X_OFFSET = 0.3       
      const Y_OFFSET = 1.3       

      textRef.current.position.set(
        vector3.x + X_OFFSET,
        vector3.y + Y_OFFSET,
        box3.max.z + FORWARD_OFFSET 
      )
    }
  }

  useFrame(() => {
    updateGrill(leftGrillRef, leftTextRef, grillState0.position)
    updateGrill(rightGrillRef, rightTextRef, grillState1.position)
  })

  const textLabels = [
    { ref: leftTextRef, position: grillState0.position, id: 'left' },
    { ref: rightTextRef, position: grillState1.position, id: 'right' }
  ]

  return (
    <group {...props} dispose={null}>
      {/* 4. Renderizamos la escena clonada */}
      <primitive object={clonedScene} />

      {textLabels.map((label) => (
        <group ref={label.ref} key={label.id}>
         <Text3D
            font="/fonts/Geist_Regular.json" 
            size={0.35}
            height={0.05}
            curveSegments={12}
            bevelEnabled
            bevelThickness={0.05}
            bevelSize={0.01}
            bevelSegments={1}
            ref={(mesh) => {
              if (mesh) mesh.geometry.center()
            }}
            onUpdate={(self) => {
              self.geometry.center()
            }}
          >
            {`${Math.round(label.position)}%`}
            
            <meshBasicMaterial 
              color="white" 
              polygonOffset={true}
              polygonOffsetFactor={3}
            />
            
            <Outlines 
              thickness={1}
              color="#525252" 
              angle={Math.PI / 2}
            />
          </Text3D>
        </group>
      ))}
    </group>
  )
}

useGLTF.preload('/models/parrilla_model_v2.glb')