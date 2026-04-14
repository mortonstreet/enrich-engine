import { readFile, writeFile } from 'node:fs/promises'
import { parseCSV, escapeCSV, getMappedFieldForHeader } from '@/utils/csvImport'
import { extractDomain, guessEmail } from '@/services/emailGuess.service'
import { findEmailByDomain } from '@/clients/prospeo.client'

interface CliArgs {
  input: string
  output: string
  prospeoKey?: string
}

const HELP_TEXT = `
Usage:
  pnpm --filter backend cli:enrich-csv --input leads.csv --output enriched.csv [--prospeo-key sk_xxx]

Options:
  --input        Path to input CSV file (required)
  --output       Path to output CSV file (required)
  --prospeo-key  Prospeo API key for fallback /email-finder lookups (optional)
`

function parseArgs(argv: string[]): CliArgs {
  const args: Partial<CliArgs> = {}

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = argv[i + 1]

    if (arg === '--help' || arg === '-h') {
      console.log(HELP_TEXT.trim())
      process.exit(0)
    }

    if (arg === '--input' && next) {
      args.input = next
      i++
      continue
    }

    if (arg === '--output' && next) {
      args.output = next
      i++
      continue
    }

    if (arg === '--prospeo-key' && next) {
      args.prospeoKey = next
      i++
      continue
    }
  }

  if (!args.input || !args.output) {
    throw new Error(
      'Missing required arguments. Use --input <file> --output <file>.',
    )
  }

  return args as CliArgs
}

function findHeaderIndex(headers: string[], target: string): number {
  return headers.findIndex(
    (header) => getMappedFieldForHeader(header) === target,
  )
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  const rawInput = await readFile(args.input, 'utf-8')
  const { headers, rows } = parseCSV(rawInput)

  if (headers.length === 0) {
    throw new Error('Input CSV is empty or missing headers')
  }

  if (rows.length === 0) {
    throw new Error('Input CSV has no rows')
  }

  const firstNameIndex = findHeaderIndex(headers, 'firstName')
  const lastNameIndex = findHeaderIndex(headers, 'lastName')
  const domainIndex = findHeaderIndex(headers, 'website')
  let emailIndex = findHeaderIndex(headers, 'email')

  const outputHeaders = [...headers]
  if (emailIndex === -1) {
    outputHeaders.push('email')
    emailIndex = outputHeaders.length - 1
  }

  const outputRows: string[][] = []

  let patternGuessed = 0
  let prospeoFound = 0
  let alreadyHadEmail = 0
  let skipped = 0

  for (const row of rows) {
    const outputRow = [...row]
    while (outputRow.length < outputHeaders.length) {
      outputRow.push('')
    }

    const currentEmail = (outputRow[emailIndex] ?? '').trim()
    if (currentEmail) {
      alreadyHadEmail++
      outputRows.push(outputRow)
      continue
    }

    const firstName =
      firstNameIndex >= 0 ? (outputRow[firstNameIndex] ?? '').trim() : ''
    const lastName =
      lastNameIndex >= 0 ? (outputRow[lastNameIndex] ?? '').trim() : ''
    const websiteOrDomain =
      domainIndex >= 0 ? (outputRow[domainIndex] ?? '').trim() : ''
    const domain = websiteOrDomain ? extractDomain(websiteOrDomain) : null

    let resolvedEmail: string | null = null

    if (domain && firstName && lastName) {
      resolvedEmail = guessEmail(domain, firstName, lastName)
      if (resolvedEmail) {
        patternGuessed++
      }
    }

    if (!resolvedEmail && args.prospeoKey && domain && firstName && lastName) {
      const prospeoResult = await findEmailByDomain(
        args.prospeoKey,
        domain,
        firstName,
        lastName,
      )

      if (prospeoResult.success && prospeoResult.email) {
        resolvedEmail = prospeoResult.email
        prospeoFound++
      }
    }

    if (resolvedEmail) {
      outputRow[emailIndex] = resolvedEmail
    } else {
      skipped++
    }

    outputRows.push(outputRow)
  }

  const csvLines = [
    outputHeaders.map((header) => escapeCSV(header)).join(','),
    ...outputRows.map((row) =>
      outputHeaders.map((_, index) => escapeCSV(row[index] ?? '')).join(','),
    ),
  ]

  await writeFile(args.output, `${csvLines.join('\n')}\n`, 'utf-8')

  console.log(`Wrote enriched CSV to ${args.output}`)
  console.log(
    `Total: ${rows.length} | Pattern-guessed: ${patternGuessed} | Prospeo: ${prospeoFound} | Skipped: ${skipped} | Existing: ${alreadyHadEmail}`,
  )
}

main().catch((error) => {
  console.error('CSV enrichment failed:', error)
  process.exit(1)
})
