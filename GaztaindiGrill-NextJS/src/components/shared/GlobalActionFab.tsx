"use client"

import React, { useState, useRef, useEffect } from 'react'
import { MoreVertical, RotateCcw, X } from 'lucide-react'
import { useSystemActions } from '@/hooks/useSystemActions'
import { cn } from '@/utils'

export function GlobalActionFab() {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { handleSystemReset, isConnected } = useSystemActions()

  // --- CONFIGURACIÓN DE ACCIONES ---
  const actions = [
    {
      label: 'Resetear sistema',
      icon: RotateCcw,
      danger: true,
      disabled: !isConnected,
      onClick: async () => {
        const confirmed = window.confirm("¿Estás seguro de que quieres resetear todo el sistema? Los actuadores se moverán al tope superior.")
        if (confirmed) {
          await handleSystemReset()
        }
      }
    },
  ]

  // Cerrar menú al hacer click fuera del componente
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end" ref={menuRef}>
      
      {/* MENÚ DESPLEGABLE */}
      {isOpen && (
        <div className="mb-3 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-gray-100 p-1.5 min-w-[180px] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex flex-col gap-0.5">
            {actions.map((item) => (
              <button
                key={item.label}
                disabled={item.disabled}
                onClick={async () => {
                  await item.onClick()
                  setIsOpen(false)
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors",
                  item.disabled 
                    ? "text-gray-300 cursor-not-allowed" 
                    : item.danger 
                      ? "text-red-600 hover:bg-red-50 active:bg-red-100" 
                      : "text-gray-600 hover:bg-gray-50 active:bg-gray-100"
                )}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* BOTÓN FLOTANTE (FAB) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-11 h-11 rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.15)] transition-all duration-300 active:scale-95 border border-gray-50",
          isOpen 
            ? "bg-gray-800 text-white rotate-90" 
            : "bg-white text-gray-500 hover:bg-gray-50"
        )}
      >
        {isOpen ? <X className="w-5 h-5" /> : <MoreVertical className="w-5 h-5" />}
      </button>
    </div>
  )
}
