import { sql } from 'drizzle-orm'
import { date, int, longtext, mysqlEnum, mysqlTable, timestamp, tinyint, varchar } from 'drizzle-orm/mysql-core'

// Written by hand from the live MariaDB: `drizzle-kit pull` hangs on the json_valid check.

export const categories = mysqlTable('categories', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 200 }).notNull().unique(),
})

export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  creationDate: timestamp('creation_date', { mode: 'string' }).defaultNow(),
  isActive: tinyint('is_active').default(1),
})

export const programs = mysqlTable('programs', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  description: varchar('description', { length: 1000 }),
  categoryId: int('category_id').references(() => categories.id, { onDelete: 'set null' }),
  // JSON is a LONGTEXT alias in MariaDB; the client parses it, so it stays a string here.
  stepsJson: longtext('steps_json').notNull(),
  usageCount: int('usage_count').notNull().default(0),
  creationDate: date('creation_date', { mode: 'string' }).notNull().default(sql`(current_timestamp())`),
  updateDate: date('update_date', { mode: 'string' }).notNull().default(sql`(current_timestamp())`),
  isActive: tinyint('is_active').notNull().default(1),
  referenceType: mysqlEnum('reference_type', ['absolute', 'relative']).notNull(),
  userId: int('user_id').notNull().references(() => users.id),
})
