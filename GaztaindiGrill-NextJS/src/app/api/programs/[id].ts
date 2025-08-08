import type { NextApiRequest, NextApiResponse } from 'next'
import { getConnection } from '@/lib/database'
import { Program, UpdateProgramRequest } from '@/lib/types'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Program | { success: boolean; message: string } | { error: string }>
) {
  const { id } = req.query

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid program ID' })
  }

  const programId = parseInt(id)

  try {
    const connection = await getConnection()

    switch (req.method) {
      case 'GET':
        // Obtener un programa específico
        const [rows] = await connection.execute(
          'SELECT * FROM PROGRAMAS_PARRILLA WHERE IdPrograma = ?',
          [programId]
        )
        
        const programs = rows as Program[]
        if (programs.length === 0) {
          return res.status(404).json({ error: 'Program not found' })
        }
        
        res.status(200).json(programs[0])
        break

      case 'PUT':
        // Actualizar un programa
        const updateData: UpdateProgramRequest = req.body
        
        const updateFields = []
        const updateValues = []
        
        if (updateData.nombre) {
          updateFields.push('Nombre = ?')
          updateValues.push(updateData.nombre)
        }
        if (updateData.descripcion !== undefined) {
          updateFields.push('Descripcion = ?')
          updateValues.push(updateData.descripcion)
        }
        if (updateData.pasosJSON) {
          updateFields.push('PasosJSON = ?')
          updateValues.push(updateData.pasosJSON)
        }
        if (updateData.cantidadUsos !== undefined) {
          updateFields.push('CantidadUsos = ?')
          updateValues.push(updateData.cantidadUsos)
        }
        if (updateData.fechaActualizacion) {
          updateFields.push('FechaActualizacion = ?')
          updateValues.push(updateData.fechaActualizacion)
        }
        if (updateData.activo !== undefined) {
          updateFields.push('Activo = ?')
          updateValues.push(updateData.activo)
        }

        if (updateFields.length === 0) {
          return res.status(400).json({ success: false, message: 'No fields to update' })
        }

        updateValues.push(programId)
        
        await connection.execute(
          `UPDATE PROGRAMAS_PARRILLA SET ${updateFields.join(', ')} WHERE IdPrograma = ?`,
          updateValues
        )
        
        res.status(200).json({ success: true, message: 'Program updated successfully' })
        break

      case 'DELETE':
        // Eliminar un programa
        await connection.execute(
          'DELETE FROM PROGRAMAS_PARRILLA WHERE IdPrograma = ?',
          [programId]
        )
        
        res.status(200).json({ success: true, message: 'Program deleted successfully' })
        break

      default:
        res.status(405).json({ error: 'Method not allowed' })
        break
    }
  } catch (error) {
    console.error(`Error in ${req.method || 'UNKNOWN'} /api/programs/${id}:`, error)
    res.status(500).json({ error: `Error ${req.method?.toLowerCase() || 'processing'} program` })
  }
}
