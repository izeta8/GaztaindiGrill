import 'server-only'
import mysql from 'mysql2/promise'
import { drizzle } from 'drizzle-orm/mysql2'
import * as schema from '@/db/schema'

// next dev reloads this module on every edit; keep one pool across reloads.
const globalForDb = globalThis as unknown as { pool?: mysql.Pool }

const pool = globalForDb.pool ?? mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5,
})

if (process.env.NODE_ENV !== 'production') globalForDb.pool = pool

export const db = drizzle(pool, { schema, mode: 'default' })
