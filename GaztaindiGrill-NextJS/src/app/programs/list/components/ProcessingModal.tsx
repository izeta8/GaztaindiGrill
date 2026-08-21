"use client"

import { Modal } from "@/components/ui/Modal"

interface Props {
  isOpen: boolean
  title?: string
  message?: string
}

export function ProcessingModal({ isOpen, title = 'Procesando...', message = 'Conectando al broker y publicando el programa. Por favor, espera.' }: Props) {
  return (
    <Modal isOpen={isOpen} onClose={() => { /* block closing while processing */ }}>
      <div className="p-6 flex flex-col items-center text-center">
        <div className="h-10 w-10 rounded-full border-4 border-indigo-300 border-t-transparent animate-spin mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-700">{message}</p>
      </div>
    </Modal>
  )
}
