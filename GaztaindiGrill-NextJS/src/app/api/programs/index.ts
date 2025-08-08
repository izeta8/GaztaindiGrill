import type { NextApiRequest, NextApiResponse } from 'next'
import { getConnection } from '@/lib/database'
import { Program } from '@/lib/types'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Program[] | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const connection = await getConnection()
    
    const [rows] = await connection.execute(
      'SELECT * FROM PROGRAMAS_PARRILLA'
    )
    
    res.status(200).json(rows as Program[])
  } catch (error) {
    console.error('Error fetching programs:', error)
    res.status(500).json({ error: 'Error fetching programs' })
  }
}
