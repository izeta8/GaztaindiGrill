"use client"

import { BarChart3, Calendar, Pencil, Play, Tag, Eye } from "lucide-react"
import { Button } from "@/components/ui/Button"
import type { Program } from "@/lib/types"
import { truncate, formatDate } from "@/lib/utils"

interface Props {
  program: Program
  categoryName: string
  stepsCount: number
  onViewSteps: (program: Program) => void
  onExecute: (program: Program) => void
  onEdit: (program: Program) => void
}

export function ProgramCard({ program: p, categoryName, stepsCount, onViewSteps, onExecute, onEdit }: Props) {

  console.log(p)

  return (
    
    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        
        {/* Left: title + description */}
        <div className="md:col-span-2 min-w-0">
          
          {/* Header row */}
          <div className="flex justify-between items-center gap-2">
           
            <div className="flex text-md px-4 gap-2 py-0.5 rounded-full bg-gray-200 w-fit text-base items-center">
              <h3 className="italic font-semibold text-gray-900 truncate">{p.name}</h3>
              <span className="italic opacity-75 text-xs"># {p.id}</span>
            </div>
            
            <span className="justify-self-left w-fit text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 inline-flex items-center gap-1">
              <Tag className="h-3.5 w-3.5" /> {categoryName}
            </span>
            
          </div>

          {p.description ? (
            <p className="text-sm text-gray-700 my-5">{truncate(p.description, 140)}</p>
          ) : null}

          {/* Meta grid */}
          <div className="my-5 grid justify-center grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs text-gray-700">
            
            <div className="flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-gray-500" />
              <span className="font-medium">Usos:</span> {p.usageCount ?? 0}
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-gray-500" />
              <span className="font-medium">Actualiz.:</span> {formatDate(p.updateDate)}
            </div>
          </div>

          {/* Steps button */}
          <div className="flex flex-wrap gap-2 mt-3 justify-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onViewSteps(p)}
              ariaLabel={`Ver pasos de ${p.name}`}
            >
              <Eye className="h-4 w-4 mr-2" /> Ver pasos ({stepsCount})
            </Button>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex md:flex-col gap-2 md:justify-start justify-end md:items-stretch items-end">
          <Button onClick={() => onExecute(p)} size="sm" ariaLabel={`Ejecutar ${p.name}`} className="w-full md:w-auto">
            <Play className="h-4 w-4 mr-2" /> Ejecutar
          </Button>
          <Button variant="secondary" onClick={() => onEdit(p)} size="sm" ariaLabel={`Editar ${p.name}`} className="w-full md:w-auto">
            <Pencil className="h-4 w-4 mr-2" /> Editar
          </Button>
        </div>
      </div>
    </div>
  )
}
