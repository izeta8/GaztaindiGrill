"use client"

import React, { useRef, useMemo, useEffect } from 'react'
import { useGLTF, Text3D, Outlines } from '@react-three/drei'
import { useFrame, useGraph, useThree, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTF } from 'three-stdlib'
import { useGrillState } from '@/app/control/hooks/useGrillState'
import { minSafePosition } from '@/utils/rotation'

type GLTFResult = GLTF & {
  nodes: { [key: string]: THREE.Object3D }
  materials: { [key: string]: THREE.Material }
}

export interface GrillModelProps {
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number | [number, number, number]
  showLabels?: boolean
  onGrillSelect?: (index: 0 | 1) => void
  // Points the camera at one grill, framing its whole travel.
  focusGrill?: 0 | 1
  // The pose being picked for the focused grill, drawn solid and dragged by the pointer, while
  // the grill where it really is fades out. Dragging moves whichever of the two `mode` selects.
  target?: {
    position: number
    rotation: number
    mode: 'height' | 'rotation'
    onDragHeight: (position: number) => void
    onDragRotation: (degrees: number) => void
  }
}

const MIN_HEIGHT = 1  // Altura cuando la parrilla está al 0%
const MAX_HEIGHT = 1.8  // Altura cuando la parrilla está al 100%

export const GRILL_NODE_NAMES = ['padre_parrilla_ezkerra', 'padre_parrilla_eskubi'] as const

export const heightForPosition = (percent: number) => MIN_HEIGHT + (percent / 100) * (MAX_HEIGHT - MIN_HEIGHT)

export const positionForHeight = (height: number) => ((height - MIN_HEIGHT) / (MAX_HEIGHT - MIN_HEIGHT)) * 100

// Left grill from a corner so the rotor tilt shows, right grill straight on.
const FOCUS_DIRECTIONS = [new THREE.Vector3(1.2, 0.9, 1), new THREE.Vector3(0, 0.4, 1)]

// How far towards the canvas edge the corners of the rack's travel box may land, per camera. Higher
// for the corner view: from there the box corners stick out well beyond the rack itself.
const FOCUS_FILL = [0.8, 0.6]

// Everything but the focused grill, kept for context and greyed out so it reads as not draggable.
const FADED_MATERIAL = new THREE.MeshStandardMaterial({ color: '#9ca3af', transparent: true, opacity: 0.25, depthWrite: false })

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

const CURRENT_POSITION_OPACITY = 0.2

const ROTOR_NODE_NAME = 'rotor_cilindro+parrilla'

// Degrees per step while dragging. Typing in the modal is exact.
const ROTATION_DRAG_STEP = 15

// The heights a rack at the picked tilt may not stay at, shown under it.
const FORBIDDEN_MATERIAL = new THREE.MeshBasicMaterial({ color: '#dc2626', transparent: true, opacity: 0.18, depthWrite: false })

export function GrillModel({ showLabels = true, onGrillSelect, focusGrill, target, ...props }: GrillModelProps) {
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
    if (nodes[ROTOR_NODE_NAME]) {
      rotorRef.current = nodes[ROTOR_NODE_NAME]
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

    const center = box.getCenter(new THREE.Vector3())
    const direction = FOCUS_DIRECTIONS[index].clone().normalize()
    const place = (distance: number) => {
      camera.position.copy(center).addScaledVector(direction, distance)
      camera.lookAt(center)
      camera.updateMatrixWorld()
    }

    // Place at a guess, then scale the distance by how much of the screen the box takes: a
    // bounding sphere leaves the travel too small to drag with any precision.
    const previous = camera.position.clone()
    const guess = box.getSize(new THREE.Vector3()).length() * 2
    place(guess)
    let extent = 0
    for (const x of [box.min.x, box.max.x]) {
      for (const y of [box.min.y, box.max.y]) {
        for (const z of [box.min.z, box.max.z]) {
          const corner = new THREE.Vector3(x, y, z).project(camera)
          extent = Math.max(extent, Math.abs(corner.x), Math.abs(corner.y))
        }
      }
    }
    place((guess * extent) / FOCUS_FILL[index])

    return previous.distanceTo(camera.position) < 1e-3
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

  const hasTarget = focusGrill !== undefined && target !== undefined
  const targetRef = useRef(target)
  targetRef.current = target

  const forbiddenRef = useRef<THREE.Mesh | null>(null)

  // Footprint of the rack and how far it hangs below its node, measured once: the forbidden
  // slab is drawn where the rack itself would be, not where its parent node sits.
  const rackBounds = useMemo(() => {
    if (focusGrill === undefined) return null
    const grill = nodes[GRILL_NODE_NAMES[focusGrill]]
    let rack: THREE.Object3D = grill
    grill.traverse((child) => { if (child.name.startsWith('padre_rejilla')) rack = child })

    grill.updateWorldMatrix(true, true)
    const box = new THREE.Box3().setFromObject(rack)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    return { x: center.x, z: center.z, width: size.x, depth: size.z, bottomOffset: box.min.y - grill.position.y }
  }, [nodes, focusGrill])

  // Cloned before the effect below fades the real grill, so the copy keeps the .glb materials.
  const targetObject = useMemo(() => {
    if (focusGrill === undefined || !hasTarget) return null
    return nodes[GRILL_NODE_NAMES[focusGrill]].clone(true)
  }, [nodes, focusGrill, hasTarget])

  useFrame(() => {
    if (!targetObject || !targetRef.current) return
    targetObject.position.y = heightForPosition(targetRef.current.position)
    const targetRotor = targetObject.getObjectByName(ROTOR_NODE_NAME)
    if (targetRotor) targetRotor.rotation.x = rotorBaseX.current + THREE.MathUtils.degToRad(targetRef.current.rotation)

    const slab = forbiddenRef.current
    if (!slab || !rackBounds) return
    const floor = minSafePosition(targetRef.current.rotation)
    slab.visible = floor > 0
    if (!slab.visible) return

    const bottom = heightForPosition(0) + rackBounds.bottomOffset
    const height = heightForPosition(floor) - heightForPosition(0)
    slab.scale.set(rackBounds.width, height, rackBounds.depth)
    slab.position.set(rackBounds.x, bottom + height / 2, rackBounds.z)
  })

  useEffect(() => {
    if (focusGrill === undefined || !hasTarget) return
    const faded: THREE.Material[] = []
    nodes[GRILL_NODE_NAMES[focusGrill]].traverse((mesh) => {
      if (!(mesh instanceof THREE.Mesh) || Array.isArray(mesh.material)) return
      const material = mesh.material.clone()
      material.transparent = true
      material.opacity = CURRENT_POSITION_OPACITY
      material.depthWrite = false
      mesh.material = material
      faded.push(material)
    })
    return () => faded.forEach((material) => material.dispose())
  }, [nodes, focusGrill, hasTarget])

  // Drags by the height difference under the pointer, projected on a vertical plane facing the
  // camera, so the rack follows the finger from any angle.
  useEffect(() => {
    if (focusGrill === undefined || !hasTarget) return
    const canvas = gl.domElement
    const grill = nodes[GRILL_NODE_NAMES[focusGrill]]
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const plane = new THREE.Plane()
    const hit = new THREE.Vector3()
    let drag: { startY: number; startAngle: number; startValue: number } | null = null

    const heightUnder = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(pointer, camera)
      const normal = camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize().negate()
      plane.setFromNormalAndCoplanarPoint(normal, grill.getWorldPosition(new THREE.Vector3()))
      return raycaster.ray.intersectPlane(plane, hit) ? hit.y : null
    }

    // Angle of the pointer around the rotor axis on screen, so turning reads like a knob.
    const angleAround = (event: PointerEvent) => {
      const rotor = targetObject?.getObjectByName(ROTOR_NODE_NAME)
      if (!rotor) return null
      const rect = canvas.getBoundingClientRect()
      const pivot = rotor.getWorldPosition(new THREE.Vector3()).project(camera)
      const pivotX = rect.left + ((pivot.x + 1) / 2) * rect.width
      const pivotY = rect.top + ((1 - pivot.y) / 2) * rect.height
      return Math.atan2(event.clientY - pivotY, event.clientX - pivotX)
    }

    const handleDown = (event: PointerEvent) => {
      if (!targetRef.current) return
      const y = heightUnder(event)
      const angle = angleAround(event)
      if (y === null || angle === null) return
      canvas.setPointerCapture(event.pointerId)
      drag = {
        startY: y,
        startAngle: angle,
        startValue: targetRef.current.mode === 'height' ? targetRef.current.position : targetRef.current.rotation,
      }
    }

    const handleMove = (event: PointerEvent) => {
      if (!drag || !targetRef.current) return

      if (targetRef.current.mode === 'height') {
        const y = heightUnder(event)
        if (y === null) return
        targetRef.current.onDragHeight(positionForHeight(heightForPosition(drag.startValue) + y - drag.startY))
        return
      }

      const angle = angleAround(event)
      if (angle === null) return
      const turned = THREE.MathUtils.radToDeg(angle - drag.startAngle)
      const degrees = drag.startValue + Math.round(turned / ROTATION_DRAG_STEP) * ROTATION_DRAG_STEP
      targetRef.current.onDragRotation(((degrees % 360) + 360) % 360)
    }

    const handleUp = (event: PointerEvent) => {
      drag = null
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
    }

    canvas.addEventListener('pointerdown', handleDown)
    canvas.addEventListener('pointermove', handleMove)
    canvas.addEventListener('pointerup', handleUp)
    canvas.addEventListener('pointercancel', handleUp)
    return () => {
      canvas.removeEventListener('pointerdown', handleDown)
      canvas.removeEventListener('pointermove', handleMove)
      canvas.removeEventListener('pointerup', handleUp)
      canvas.removeEventListener('pointercancel', handleUp)
    }
  }, [hasTarget, focusGrill, nodes, gl, camera, targetObject])

  // Swaps materials on this clone's meshes only; the cached .glb materials stay untouched.
  useEffect(() => {
    if (focusGrill === undefined) return
    clonedScene.children.forEach((child) => {
      if (child.name === GRILL_NODE_NAMES[focusGrill]) return
      child.traverse((mesh) => { if (mesh instanceof THREE.Mesh) mesh.material = FADED_MATERIAL })
    })
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

      {targetObject && <primitive object={targetObject} />}

      {targetObject && rackBounds && (
        <mesh ref={forbiddenRef} material={FORBIDDEN_MATERIAL} visible={false}>
          <boxGeometry args={[1, 1, 1]} />
        </mesh>
      )}

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