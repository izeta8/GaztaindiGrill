import type { NextApiRequest, NextApiResponse } from 'next'
import { getConnection } from '@/lib/database'
import { CreateProgramRequest } from '@/lib/types'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ success: boolean; message: string; id?: number }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  try {
    const {
      name,
      description,
      stepsJson,
      creatorName,
    }: CreateProgramRequest = req.body

    // Validación básica
    if (!name || !stepsJson || !creatorName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nombre, pasosJson y creador son requeridos' 
      })
    }

    const connection = await getConnection()
    
    const usageCount = 0;
    const creationDate = new Date().toISOString();
    const updateDate = new Date().toISOString();
    const isActive = 1;
    
    const [result] = await connection.execute(
      `INSERT INTO programs 
       (name, description, steps_json, usage_count, creation_date, update_date, creator_name, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description, stepsJson, usageCount, creationDate, updateDate, creatorName, isActive]
    )
    
    const insertResult = result as any
    
    res.status(201).json({ 
      success: true, 
      message: 'Programa creado correctamente',
      id: insertResult.insertId 
    })
  } catch (error) {
    console.error('Error creating program:', error)
    res.status(500).json({ success: false, message: 'Error creating program: ' + error })
  }
}
