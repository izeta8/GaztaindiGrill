import * as THREE from 'three'
import { GLTF } from 'three-stdlib'

// What every 3D grill needs to know about the .glb: node names, heights and framing.

export const MODEL_URL = '/models/parrilla_model_v5.glb'

export type GLTFResult = GLTF & {
  nodes: { [key: string]: THREE.Object3D }
  materials: { [key: string]: THREE.Material }
}

const MIN_HEIGHT = 1  // Altura cuando la parrilla está al 0%
const MAX_HEIGHT = 1.8  // Altura cuando la parrilla está al 100%

export const GRILL_NODE_NAMES = ['padre_parrilla_ezkerra', 'padre_parrilla_eskubi'] as const

export const ROTOR_NODE_NAME = 'rotor_cilindro+parrilla'

export const heightForPosition = (percent: number) => MIN_HEIGHT + (percent / 100) * (MAX_HEIGHT - MIN_HEIGHT)

export const positionForHeight = (height: number) => ((height - MIN_HEIGHT) / (MAX_HEIGHT - MIN_HEIGHT)) * 100

// Left grill from a corner so the rotor tilt shows, right grill straight on.
const FOCUS_DIRECTIONS = [new THREE.Vector3(1.2, 0.9, 1), new THREE.Vector3(0, 0.4, 1)]

// How far towards the canvas edge the corners of the rack's travel box may land, per camera. Higher
// for the corner view: from there the box corners stick out well beyond the rack itself.
const FOCUS_FILL = [0.8, 0.6]

// Everything but the focused grill, kept for context and greyed out so it reads as not draggable.
const FADED_MATERIAL = new THREE.MeshStandardMaterial({ color: '#9ca3af', transparent: true, opacity: 0.25, depthWrite: false })

// The rack, not the whole node: the columns above it would shrink the part that moves.
export const findRack = (grill: THREE.Object3D) => {
  let rack: THREE.Object3D = grill
  grill.traverse((child) => { if (child.name.startsWith('padre_rejilla')) rack = child })
  return rack
}

// Returns true once the framing stops changing: <Center> moves the model after the first frames.
export const focusCamera = (camera: THREE.Camera, grill: THREE.Object3D, index: 0 | 1) => {
  grill.updateWorldMatrix(true, true)
  const box = new THREE.Box3().setFromObject(findRack(grill))
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

// Swaps materials on this clone's meshes only; the cached .glb materials stay untouched.
export const fadeAllButGrill = (scene: THREE.Object3D, index: 0 | 1) => {
  scene.children.forEach((child) => {
    if (child.name === GRILL_NODE_NAMES[index]) return
    child.traverse((mesh) => { if (mesh instanceof THREE.Mesh) mesh.material = FADED_MATERIAL })
  })
}
