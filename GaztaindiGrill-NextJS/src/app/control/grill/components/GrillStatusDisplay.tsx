"use client"

import { Thermometer, ArrowUp, RotateCw } from 'lucide-react'
import type { GrillState } from '@/lib/types'

interface GrillStatusDisplayProps {
  title: string
  grillState: GrillState
  showRotation: boolean
}

export function GrillStatusDisplay({ title, grillState, showRotation }: GrillStatusDisplayProps) {
  const { position, temperature, rotation, lastUpdate } = grillState
  
  const formatLastUpdate = (date: Date | null) => {
    if (!date) return 'Nunca'
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diff < 60) return `Hace ${diff}s`
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)}m`
    return date.toLocaleTimeString()
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-blue-50 rounded-lg p-4 flex justify-between items-center">
          <div className='h-full'>
            <div className="flex items-center space-x-2 mb-2">
              <ArrowUp className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Posición</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{position}%</p>
          </div>
          {/* Vertical Bar */}
          <div className="w-2 bg-blue-200 rounded-full h-15 flex flex-col justify-end">
            <div 
              className="bg-blue-600 rounded-full w-full transition-all duration-300"
              style={{ height: `${position}%` }}
            />
          </div>
        </div>

        {/* Temperature */}
        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Thermometer className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium text-red-800">Temperatura</span>
          </div>
          <p className="text-2xl font-bold text-red-900">{temperature}°C</p>
        </div>
      </div>

      {/* Rotation (only for left grill) */}
      {showRotation && (
        <div className="bg-purple-50 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <RotateCw className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">Rotación</span>
          </div>
          <div className='grid grid-cols-3'>
            <div className="text-2xl font-bold text-purple-900">{rotation}°</div>
            <div className="flex items-center justify-center mt-2">
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full border-4 border-purple-200" />
                <div 
                  className="absolute inset-2 rounded-full bg-purple-600 transition-transform duration-300"
                  style={{ transform: `rotate(${rotation}deg)` }}
                >
                  <div className="absolute top-0 left-1/2 w-1 h-2 bg-white transform -translate-x-1/2" />
                </div>
              </div>
            </div>
            <div></div>
          </div>
        </div>
      )}

      {/* Last Update */}
      <div className="text-xs text-gray-500 text-center">
        Última actualización: {formatLastUpdate(lastUpdate)}
      </div>
    </div>
  )
}