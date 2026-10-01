import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { loadEnvFile } from './env.js'

loadEnvFile()

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set.')
  process.exit(1)
}

const { Pool } = await import('@neondatabase/serverless')
const sql = await readFile(path.resolve('db/migrations/001_init.sql'), 'utf8')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
await pool.query(sql)
await pool.end()
console.log('Migration applied.')
