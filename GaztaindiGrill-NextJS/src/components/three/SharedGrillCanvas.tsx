"use client"

import React, { createContext, Suspense, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stage, Center, ContactShadows, Html } from '@react-three/drei'

// What a scene asks the shared canvas to show while it holds it.
export interface GrillSlotProps {
  cameraPosition: [number, number, number]
  controls: boolean
  content: React.ReactNode
}

interface Slot {
  id: string
  element: HTMLDivElement
  props: GrillSlotProps
}

interface SlotRegistry {
  upsert: (slot: Slot) => void
  remove: (id: string) => void
}

const CAMERA = { position: [0, 6.2, 9] as [number, number, number], fov: 23 }

const SlotContext = createContext<SlotRegistry | null>(null)

export function useGrillCanvasSlots() {
  const registry = useContext(SlotContext)
  if (!registry) throw new Error('useGrillCanvasSlots must be used inside SharedGrillCanvasProvider')
  return registry
}

function Loader() {
  return (
    <Html center>
      <div className="flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-2"></div>
        <p className="text-blue-600 font-medium whitespace-nowrap">Cargando parrilla...</p>
      </div>
    </Html>
  )
}

// The camera outlives the slots, so each one starts it again from its own place.
function CameraReset({ position }: { position: [number, number, number] }) {
  const camera = useThree((state) => state.camera)
  const [x, y, z] = position
  useLayoutEffect(() => {
    camera.position.set(x, y, z)
    camera.lookAt(0, 0, 0)
    camera.updateMatrixWorld()
  }, [camera, x, y, z])
  return null
}

// Frames to draw in a new slot before showing it: the modal's framing settles over the first few.
const REVEAL_AFTER_FRAMES = 4

// The canvas is hidden when it moves, since it still shows the last slot's frame stretched to the
// new size. It fades back in once it has drawn a few frames at the size of the slot it is in.
function RevealWhenReady({ host, slot }: { host: HTMLDivElement; slot: HTMLDivElement }) {
  const frames = useRef(0)
  useFrame((state) => {
    if (frames.current > REVEAL_AFTER_FRAMES) return
    const rect = slot.getBoundingClientRect()
    if (Math.abs(state.size.width - rect.width) > 1 || Math.abs(state.size.height - rect.height) > 1) return
    frames.current += 1
    if (frames.current > REVEAL_AFTER_FRAMES) host.style.opacity = '1'
  })
  return null
}

// One WebGL context for every GrillScene. A new <Canvas> per scene compiled the shaders and built
// the environment again each time, which is what made the modal slow to open and to close. The
// canvas lives in a detached element that React never removes, so it can be moved into whichever
// slot mounted last: the modal stacks on top of the page and hands the canvas back when it closes.
export function SharedGrillCanvasProvider({ children }: { children: React.ReactNode }) {
  const [slots, setSlots] = useState<Slot[]>([])
  // Created on the client only: the static export prerenders this with no document.
  const [host] = useState(() => {
    if (typeof document === 'undefined') return null
    const element = document.createElement('div')
    element.style.width = '100%'
    element.style.height = '100%'
    element.style.transition = 'opacity 150ms ease-out'
    return element
  })
  const [hasStarted, setHasStarted] = useState(false)

  const registry = useMemo<SlotRegistry>(() => ({
    upsert: (slot) => setSlots((current) => {
      const index = current.findIndex((s) => s.id === slot.id)
      if (index === -1) return [...current, slot]
      const next = [...current]
      next[index] = slot
      return next
    }),
    remove: (id) => setSlots((current) => current.filter((s) => s.id !== id)),
  }), [])

  const active = slots.at(-1)

  useLayoutEffect(() => {
    if (!active || !host) return
    if (host.parentElement !== active.element) {
      // Not on the very first slot, where the loader has to stay visible while the model loads.
      if (host.parentElement) host.style.opacity = '0'
      active.element.appendChild(host)
    }
    setHasStarted(true)
  }, [active, host])

  return (
    <SlotContext.Provider value={registry}>
      {children}
      {host && hasStarted && createPortal(
        <Canvas
          // Nothing to draw with no slot mounted, e.g. away from /control.
          frameloop={active ? 'always' : 'never'}
          shadows
          camera={CAMERA}
          gl={{ antialias: true, alpha: true }}
        >
          <Suspense fallback={<Loader />}>
            <Stage
              // Served locally: the "city" preset fetches this file from a CDN at runtime, and without it the model never loads.
              environment={{ files: '/hdri/potsdamer_platz_256.hdr' }}
              intensity={0.5}
              adjustCamera={false}
            >
              {active && (
                // Keyed by slot so the model, its camera framing and the controls start clean.
                <React.Fragment key={active.id}>
                  <CameraReset position={active.props.cameraPosition} />
                  <RevealWhenReady host={host} slot={active.element} />
                  <Center top>
                    {active.props.content}
                  </Center>
                </React.Fragment>
              )}
            </Stage>

            {active?.props.controls && (
              <OrbitControls
                key={active.id}
                enablePan={false}
                minPolarAngle={Math.PI / 2.2}
                maxPolarAngle={Math.PI / 2}
                minAzimuthAngle={-Math.PI / 12}
                maxAzimuthAngle={Math.PI / 6}
                enableZoom={true}
                autoRotate={false}
                target={[0, 0.1, 0]}
              />
            )}

            <ContactShadows
              position={[0, -1.5, 0]}
              opacity={0.4}
              scale={10}
              blur={2}
              far={4.5}
            />
          </Suspense>
        </Canvas>,
        host,
      )}
    </SlotContext.Provider>
  )
}
