import { fileRepo } from './file-repo.js'
import { neonRepo } from './neon-repo.js'

export function getRepo() {
  if (process.env.DATABASE_URL) return neonRepo
  if (process.env.VERCEL) return null
  return fileRepo
}
