"use client"

import React, { useRef, useMemo, useEffect } from 'react'
import { useGLTF, Text3D, Outlines } from '@react-three/drei'
import { useFrame, useGraph, useThree, ThreeEvent } from '@react-three/fiber'
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
  showLabels?: boolean
  onGrillSelect?: (index: 0 | 1) => void
  // Points the camera at one grill, framing its whole travel.
  focusGrill?: 0 | 1
}

const MIN_HEIGHT = 1  // Altura cuando la parrilla está al 0%
const MAX_HEIGHT = 1.8  // Altura cuando la parrilla está al 100%

export const GRILL_NODE_NAMES = ['padre_parrilla_ezkerra', 'padre_parrilla_eskubi'] as const

export const heightForPosition = (percent: number) => MIN_HEIGHT + (percent / 100) * (MAX_HEIGHT - MIN_HEIGHT)

export const positionForHeight = (height: number) => ((height - MIN_HEIGHT) / (MAX_HEIGHT - MIN_HEIGHT)) * 100

// Left grill from a corner so the rotor tilt shows, right grill straight on.
const FOCUS_DIRECTIONS = [new THREE.Vector3(1.2, 0.9, 1), new THREE.Vector3(0, 0.4, 1)]

// Pointer travel in px above which a click is really the end of a drag.
const CLICK_MAX_DELTA = 4

const grillIndexOf = (object: THREE.Object3D | null): 0 | 1 | undefined => {
  for (let current = object; current; current = current.parent) {
    const index = (GRILL_NODE_NAMES as readonly string[]).indexOf(current.name)
    if (index !== -1) return index as 0 | 1
  }
  return undefined
}

// R3F hands the handler only the nearest mesh of the scene, often a wall in front of the grill.
const grillIndexAt = (intersections: THREE.Intersection[]) => {
  for (const hit of intersections) {
    const index = grillIndexOf(hit.object)
    if (index !== undefined) return index
  }
  return undefined
}

export function GrillModel({ showLabels = true, onGrillSelect, focusGrill, ...props }: GrillModelProps) {
  const grillState0 = useGrillState(0)
  const grillState1 = useGrillState(1)
  
  // Solo obtenemos la escena base del caché
  const { scene } = useGLTF('/models/parrilla_model_v5.glb')
  
  // Clonamos la escena para tener una instancia única por componente
  const clonedScene = useMemo(() => scene.clone(), [scene])
  
  // Extraemos los nodos de la escena clonada
  const { nodes } = useGraph(clonedScene) as unknown as GLTFResult
  
  const leftGrillRef = useRef<THREE.Object3D | null>(null)
  const rightGrillRef = useRef<THREE.Object3D | null>(null)
  const rotorRef = useRef<THREE.Object3D | null>(null)
  const rotorBaseX = useRef(0)
  const leftTextRef = useRef<THREE.Group | null>(null)
  const rightTextRef = useRef<THREE.Group | null>(null)
  // A fresh clone starts at the heights baked into the .glb; the first frame jumps to the real ones.
  const hasSnapped = useRef(false)
  const isFocused = useRef(false)
  const { camera, gl } = useThree()

  const box3 = useMemo(() => new THREE.Box3(), [])
  const vector3 = useMemo(() => new THREE.Vector3(), [])

  useMemo(() => {
    if (nodes[GRILL_NODE_NAMES[0]]) leftGrillRef.current = nodes[GRILL_NODE_NAMES[0]]
    if (nodes[GRILL_NODE_NAMES[1]]) rightGrillRef.current = nodes[GRILL_NODE_NAMES[1]]
    // The node already carries a small X tilt that levels it inside its parent; the rotor angle adds to it.
    if (nodes['rotor_cilindro+parrilla']) {
      rotorRef.current = nodes['rotor_cilindro+parrilla']
      rotorBaseX.current = rotorRef.current.rotation.x
    }
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
    positionPercent: number,
    smoothing: number
  ) => {
    if (!grillRef.current) return

    const targetY = heightForPosition(positionPercent)
    grillRef.current.position.y = THREE.MathUtils.lerp(grillRef.current.position.y, targetY, smoothing)
    
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

  const updateRotor = (degrees: number, smoothing: number) => {
    if (!rotorRef.current) return

    const target = rotorBaseX.current + THREE.MathUtils.degToRad(degrees)
    // Shortest way round, so 359 -> 0 does not spin the rack a full turn backwards.
    const delta = THREE.MathUtils.euclideanModulo(target - rotorRef.current.rotation.x + Math.PI, Math.PI * 2) - Math.PI
    rotorRef.current.rotation.x += delta * smoothing
  }

  // Returns true once the framing stops changing: <Center> moves the model after the first frames.
  const focusCamera = (index: 0 | 1) => {
    const grill = index === 0 ? leftGrillRef.current : rightGrillRef.current
    if (!grill) return false

    // The rack, not the whole node: the columns above it would shrink the part that moves.
    let rack: THREE.Object3D = grill
    grill.traverse((child) => { if (child.name.startsWith('padre_rejilla')) rack = child })

    grill.updateWorldMatrix(true, true)
    const box = new THREE.Box3().setFromObject(rack)
    box.min.y -= Math.max(0, grill.position.y - MIN_HEIGHT)
    box.max.y += Math.max(0, MAX_HEIGHT - grill.position.y)

    const sphere = box.getBoundingSphere(new THREE.Sphere())
    const fov = (camera as THREE.PerspectiveCamera).fov
    const distance = sphere.radius / Math.sin(THREE.MathUtils.degToRad(fov / 2))

    const target = sphere.center.clone().add(FOCUS_DIRECTIONS[index].clone().normalize().multiplyScalar(distance))
    const isStable = camera.position.distanceTo(target) < 1e-3
    camera.position.copy(target)
    camera.lookAt(sphere.center)
    return isStable
  }

  useFrame(() => {
    const smoothing = hasSnapped.current ? 0.1 : 1
    updateGrill(leftGrillRef, leftTextRef, grillState0.position, smoothing)
    updateGrill(rightGrillRef, rightTextRef, grillState1.position, smoothing)
    updateRotor(grillState0.rotation, smoothing)
    hasSnapped.current = true

    if (focusGrill !== undefined && !isFocused.current) {
      isFocused.current = focusCamera(focusGrill)
    }
  })

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    // R3F fires a click even after the model was turned, so a turn would open the grill.
    if (!onGrillSelect || event.delta > CLICK_MAX_DELTA) return
    const index = grillIndexAt(event.intersections)
    if (index === undefined) return
    event.stopPropagation()
    onGrillSelect(index)
  }

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    gl.domElement.style.cursor = grillIndexAt(event.intersections) === undefined ? 'auto' : 'pointer'
  }

  // A focused view shows its grill alone: the walls and the other grill would hide it.
  useEffect(() => {
    if (focusGrill === undefined) return
    clonedScene.children.forEach((child) => { child.visible = child.name === GRILL_NODE_NAMES[focusGrill] })
  }, [clonedScene, focusGrill])

  useEffect(() => {
    const canvas = gl.domElement
    return () => { canvas.style.cursor = 'auto' }
  }, [gl])

  // Only the left grill has a thermocouple
  const textLabels = [
    { ref: leftTextRef, position: grillState0.position, temperature: grillState0.temperature, hasThermocouple: true, id: 'left' },
    { ref: rightTextRef, position: grillState1.position, temperature: null, hasThermocouple: false, id: 'right' }
  ]

  return (
    <group {...props} dispose={null}>
      {/* 4. Renderizamos la escena clonada */}
      <primitive
        object={clonedScene}
        onClick={onGrillSelect ? handleClick : undefined}
        onPointerMove={onGrillSelect ? handlePointerMove : undefined}
        onPointerOut={onGrillSelect ? () => { gl.domElement.style.cursor = 'auto' } : undefined}
      />

      {showLabels && textLabels.map((label) => (
        <group ref={label.ref} key={label.id}>
          <LabelText text={`${Math.round(label.position)}%`} size={0.35} color="white" />

          {label.hasThermocouple && (
            <LabelText
              text={label.temperature === null ? '—°C' : `${label.temperature}°C`}
              size={0.22}
              color={label.temperature === null ? '#a3a3a3' : '#fb923c'}
              position={[0, -0.42, 0]}
            />
          )}
        </group>
      ))}
    </group>
  )
}

interface LabelTextProps {
  text: string
  size: number
  color: string
  position?: [number, number, number]
}

function LabelText({ text, size, color, position }: LabelTextProps) {
  return (
    <Text3D
      position={position}
      font="/fonts/Geist_Regular.json" 
      size={size}
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
      {text}
      
      <meshBasicMaterial 
        color={color} 
        polygonOffset={true}
        polygonOffsetFactor={3}
      />
      
      <Outlines 
        thickness={1}
        color="#525252" 
        angle={Math.PI / 2}
      />
    </Text3D>
  )
}

useGLTF.preload('/models/parrilla_model_v5.glb')