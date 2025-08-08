import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { CreateProgramRequest } from '@/lib/types';

export async function POST(req: Request) {
  
    try {
    const {
      name,
      description,
      stepsJson,
      creatorName,
    }: CreateProgramRequest = await req.json();

    // Basic validation
    if (!name || !stepsJson || !creatorName) {
      return NextResponse.json(
        { success: false, message: 'El nombre, los pasos y el creador son requeridos' },
        { status: 400 }
      );
    }

    const connection = await getConnection();

    const usageCount = 0;
    const creationDate = new Date().toISOString();
    const updateDate = new Date().toISOString();
    const isActive = 1;

    const [result] = await connection.execute(
      `INSERT INTO programs 
       (name, description, steps_json, usage_count, creation_date, update_date, creator_name, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description, stepsJson, usageCount, creationDate, updateDate, creatorName, isActive]
    );

    const insertResult = result as { insertId: number };

    return NextResponse.json(
      { success: true, message: 'Programa creado correctamente', id: insertResult.insertId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating program:', error);
    return NextResponse.json(
      { success: false, message: 'Error creating program: ' + error },
      { status: 500 }
    );
  }
}
