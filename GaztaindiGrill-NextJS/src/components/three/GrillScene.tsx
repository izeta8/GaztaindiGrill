"use client"

import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stage, Center, ContactShadows, Html } from '@react-three/drei'
import { GrillModel, type GrillModelProps } from './GrillModel'

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


interface GrillSceneProps {
  className?: string
  cameraPosition?: [number, number, number]
  controls?: boolean
  showLabels?: boolean
  onGrillSelect?: (index: 0 | 1) => void
  focusGrill?: 0 | 1
  target?: GrillModelProps['target']
}

export default function GrillScene({
  className = 'w-full h-[290px]',
  cameraPosition = [0, 6.2, 9],
  controls = true,
  showLabels = true,
  onGrillSelect,
  focusGrill,
  target,
}: GrillSceneProps) {
  return (
    
    <div className={className}>
    {/* <div className="w-full h-[250px] bg-white rounded-xl shadow-inner border border-gray-100 overflow-hidden relative"> */}
      <Canvas
        frameloop="always"
        shadows
        camera={{ position: cameraPosition, fov: 23 }} 
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={<Loader />}>
        
          <Stage 
            // Served locally: the "city" preset fetches this file from a CDN at runtime, and without it the model never loads.
            environment={{ files: '/hdri/potsdamer_platz_1k.hdr' }}
            intensity={0.5} 
            adjustCamera={false}
          >
            <Center top>
              <GrillModel 
                scale={1} 
                showLabels={showLabels}
                onGrillSelect={onGrillSelect}
                focusGrill={focusGrill}
                target={target}
              />
            </Center>
          </Stage>
          
          {controls && (
            <OrbitControls 
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
      </Canvas>
      
      {/* <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-xs px-3 py-1 rounded-full text-[10px] text-gray-500 pointer-events-none">
        Manten click para rotar · Scroll para zoom
      </div> */}
    </div>
  )
}
