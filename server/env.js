import { existsSync, readFileSync } from 'node:fs'

function applyEnvFile(filename) {
  if (!existsSync(filename)) return
  const text = readFileSync(filename, 'utf8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index === -1) continue
    const key = trimmed.slice(0, index).trim()
    let value = trimmed.slice(index + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (value) process.env[key] = value
  }
}

export function loadEnvFile() {
  applyEnvFile('.env')
  applyEnvFile('.env.local')
}
