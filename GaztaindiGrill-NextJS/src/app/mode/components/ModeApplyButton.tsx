import { Button } from '@/components/ui/Button'

interface ModeApplyButtonProps {
  onApply: () => void
  isConnected: boolean
  isExecuting: boolean
}

export function ModeApplyButton({ onApply, isConnected, isExecuting }: ModeApplyButtonProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <Button
        onClick={onApply}
        disabled={!isConnected || isExecuting}
        variant="primary"
        className="w-full py-4 text-lg font-semibold"
      >
        {isExecuting ? 'Aplicando...' : 'Aplicar Modo Seleccionado'}
      </Button>
      
      {!isConnected && (
        <p className="text-center text-sm text-red-600 mt-3">
          Conecta MQTT para aplicar cambios
        </p>
      )}
    </div>
  )
}
