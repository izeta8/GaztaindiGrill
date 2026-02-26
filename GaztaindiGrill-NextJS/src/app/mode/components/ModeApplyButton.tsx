import { Button } from '@/components/ui/Button'

interface ModeApplyButtonProps {
  onApply: () => void
  isConnected: boolean
}

export function ModeApplyButton({ onApply, isConnected }: ModeApplyButtonProps) {

  return (
    <>
      <Button
        onClick={onApply}
        disabled={!isConnected}
        variant="primary"
        className="w-full py-4 text-lg font-semibold"
      >
        Aplicar Modo Seleccionado
      </Button>
      
      {!isConnected && (
        <p className="text-center text-sm text-red-600 mt-3">
          El móvil o la parrilla no está conectada al sistema domótico.
        </p>
      )}
    </>
  )
}
