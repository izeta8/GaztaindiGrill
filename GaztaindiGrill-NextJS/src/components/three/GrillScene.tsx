"use client"

import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stage, Center, ContactShadows, Html } from '@react-three/drei'
import { GrillModel } from './GrillModel'
import type { GrillState } from '@/types'

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
  grillState: GrillState
}

export default function GrillScene({ grillState }: GrillSceneProps) {
  return (
    <div className="w-full h-[400px] bg-white rounded-xl shadow-inner border border-gray-100 overflow-hidden relative">
      <Canvas
        shadows
        camera={{ position: [5, 3, 5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={<Loader />}>
          {/* Corregido: contactShadow espera un objeto de configuración o booleano según versión */}
          <Stage 
            environment="city" 
            intensity={0.5} 
            adjustCamera={true}
          >
            <Center>
              {/* Ahora acepta 'scale' porque lo definimos en la interface de GrillModel */}
              <GrillModel grillState={grillState} scale={1} />
            </Center>
          </Stage>
          
          <OrbitControls 
            enablePan={false} 
            minPolarAngle={Math.PI / 2.2} 
            maxPolarAngle={Math.PI / 2.2}
            minAzimuthAngle={-1.309}
            maxAzimuthAngle={1.309}
            enableZoom={true}
            autoRotate={false}
          />
          
          <ContactShadows 
            position={[0, -1.5, 0]} 
            opacity={0.4} 
            scale={10} 
            blur={2} 
            far={4.5} 
          />
        </Suspense>
      </Canvas>
      
      <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-xs px-3 py-1 rounded-full text-[10px] text-gray-500 pointer-events-none">
        Manten click para rotar · Scroll para zoom
      </div>
    </div>
  )
}
