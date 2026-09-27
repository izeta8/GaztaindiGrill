"use client"

import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

type ReferenceTypeInfoModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function ReferenceTypeInfoModal({ isOpen, onClose }: ReferenceTypeInfoModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6 space-y-4 text-sm text-gray-700">
        <h3 className="text-lg font-semibold text-gray-900">Modo de ejecución</h3>

        <div>
          <p className="font-medium text-gray-900">Absoluto</p>
          <p>
            Cada paso de altura lleva la parrilla a un valor fijo, esté donde esté al empezar.
            Un paso de 20 % la deja siempre al 20 %.
          </p>
        </div>

        <div>
          <p className="font-medium text-gray-900">Relativo</p>
          <p>
            Cada paso de altura se suma a la altura que tiene la parrilla al pulsar Ejecutar.
            Con la parrilla al 40 %, un paso de +20 la sube al 60 % y uno de -20 la baja al 20 %.
            Si la suma pasa de 0 o de 100, se queda en el límite.
          </p>
          <p className="mt-1 text-gray-500">
            Sirve para colocar la parrilla a mano antes de empezar y que el programa trabaje desde ahí.
          </p>
        </div>

        <div>
          <p className="font-medium text-gray-900">Qué cambia según el modo</p>
          <ul className="mt-1 space-y-1 list-disc pl-5">
            <li>
              <span className="font-medium">Altura (actuador):</span> es lo único que cambia.
              0 % es abajo del todo, junto a las brasas, y 100 % arriba del todo.
            </li>
            <li>
              <span className="font-medium">Giro (rotor):</span> siempre absoluto. 0° es la
              rejilla plana y 180° dada la vuelta. Solo la parrilla izquierda tiene rotor.
            </li>
            <li>
              <span className="font-medium">Temperatura y esperas:</span> igual en los dos modos.
            </li>
          </ul>
        </div>

        <Button onClick={onClose} className="w-full">
          Entendido
        </Button>
      </div>
    </Modal>
  )
}
