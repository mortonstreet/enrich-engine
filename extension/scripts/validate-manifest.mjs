import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const mode = (process.argv[2] ?? 'production').toLowerCase()

if (mode !== 'development' && mode !== 'production') {
  console.error(
    `[manifest] Invalid mode "${mode}". Use "development" or "production".`,
  )
  process.exit(1)
}

const manifestPath = resolve(process.cwd(), 'dist/manifest.json')
if (!existsSync(manifestPath)) {
  console.error(`[manifest:${mode}] Missing build output at ${manifestPath}`)
  process.exit(1)
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const permissions = Array.isArray(manifest.permissions) ? manifest.permissions : []
const hostPermissions = Array.isArray(manifest.host_permissions)
  ? manifest.host_permissions
  : []
const contentScripts = Array.isArray(manifest.content_scripts)
  ? manifest.content_scripts
  : []

const allowedPermissions = new Set(['storage', 'activeTab', 'sidePanel'])
const localhostPattern = /(localhost|127\.0\.0\.1|0\.0\.0\.0)/i
const insecureHttpPattern = /^http:\/\//i

const errors = []

for (const permission of permissions) {
  if (!allowedPermissions.has(permission)) {
    errors.push(`Unexpected permission "${permission}" in dist manifest.`)
  }
}

if (!permissions.includes('storage')) {
  errors.push('Missing required permission "storage".')
}

if (!permissions.includes('sidePanel')) {
  errors.push('Missing required permission "sidePanel".')
}

const linkedInContentScriptFound = contentScripts.some((script) => {
  const matches = Array.isArray(script.matches) ? script.matches : []
  return matches.includes('https://*.linkedin.com/*')
})

if (!linkedInContentScriptFound) {
  errors.push('Missing LinkedIn content script match pattern in dist manifest.')
}

if (mode === 'development') {
  const hasLocalhostScope = hostPermissions.some((host) =>
    localhostPattern.test(host),
  )
  if (!hasLocalhostScope) {
    errors.push(
      'Development manifest must include localhost host permission scope.',
    )
  }
}

if (mode === 'production') {
  const requiredHosts = new Set([
    'https://api.omnidial.io/*',
    'https://*.linkedin.com/*',
  ])

  for (const host of hostPermissions) {
    if (localhostPattern.test(host)) {
      errors.push(`Production manifest cannot include localhost host "${host}".`)
    }
    if (insecureHttpPattern.test(host)) {
      errors.push(`Production manifest cannot include insecure host "${host}".`)
    }
    if (!requiredHosts.has(host)) {
      errors.push(`Unexpected production host permission "${host}".`)
    }
  }

  for (const requiredHost of requiredHosts) {
    if (!hostPermissions.includes(requiredHost)) {
      errors.push(
        `Missing required production host permission "${requiredHost}".`,
      )
    }
  }
}

if (errors.length > 0) {
  console.error(`[manifest:${mode}] Validation failed:`)
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log(`[manifest:${mode}] Validation passed for dist/manifest.json`)
