// Run with: node scripts/check-connection.mjs
//
// Standalone sanity check for the Supabase connection — separate from the
// React app on purpose, so you can confirm the database is reachable
// (right URL/key, schema.sql actually ran) before wiring any UI to it.
//
// Reads .env.local directly (Vite's import.meta.env isn't available
// outside the Vite dev/build process), so no extra dependency is needed.

import { readFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function loadEnvLocal() {
  const path = new URL('../.env.local', import.meta.url)
  if (!existsSync(path)) {
    console.error(
      '\n.env.local not found. Copy .env.example to .env.local and fill in ' +
        'your Supabase project URL and anon key first.\n',
    )
    process.exit(1)
  }

  const env = {}
  const contents = readFileSync(path, 'utf-8')
  for (const line of contents.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return env
}

const env = loadEnvLocal()
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY

if (!url || url.includes('your-project-ref') || !key || key.includes('your-anon')) {
  console.error(
    '\n.env.local exists but still has placeholder values. Fill in the ' +
      'real VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your ' +
      'Supabase project (Settings → API).\n',
  )
  process.exit(1)
}

const supabase = createClient(url, key)

console.log(`Connecting to ${url} ...`)

const expectedTables = [
  'admin_profile',
  'events',
  'rsvps',
  'categories',
  'category_slots',
  'signups',
]

let allOk = true

for (const table of expectedTables) {
  const { error } = await supabase.from(table).select('*', { head: true, count: 'exact' })
  if (error) {
    allOk = false
    console.error(`  ✗ ${table}: ${error.message}`)
  } else {
    console.log(`  ✓ ${table} reachable`)
  }
}

if (allOk) {
  console.log('\nAll tables reachable — Supabase connection is good.\n')
} else {
  console.error(
    '\nSome tables were not reachable. Make sure supabase/schema.sql has ' +
      'been run in your project\'s SQL Editor, and that the URL/key in ' +
      '.env.local match that same project.\n',
  )
  process.exit(1)
}
