export type LeadCsvMappableField =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'company'
  | 'title'
  | 'linkedInUrl'
  | 'website'

// CSV field mappings to canonical lead fields (case-insensitive)
export const FIELD_MAPPINGS: Record<string, LeadCsvMappableField> = {
  first_name: 'firstName',
  firstname: 'firstName',
  'first name': 'firstName',
  first: 'firstName',
  last_name: 'lastName',
  lastname: 'lastName',
  'last name': 'lastName',
  last: 'lastName',
  email: 'email',
  email_address: 'email',
  'email address': 'email',
  'e-mail': 'email',
  phone: 'phone',
  phone_number: 'phone',
  phonenumber: 'phone',
  'phone number': 'phone',
  mobile: 'phone',
  mobile_phone: 'phone',
  'mobile phone': 'phone',
  cell: 'phone',
  cell_phone: 'phone',
  'cell phone': 'phone',
  cellphone: 'phone',
  telephone: 'phone',
  tel: 'phone',
  work_phone: 'phone',
  'work phone': 'phone',
  direct_phone: 'phone',
  'direct phone': 'phone',
  'direct dial': 'phone',
  direct: 'phone',
  number: 'phone',
  contact_phone: 'phone',
  'contact phone': 'phone',
  company: 'company',
  company_name: 'company',
  'company name': 'company',
  organization: 'company',
  org: 'company',
  employer: 'company',
  title: 'title',
  job_title: 'title',
  jobtitle: 'title',
  'job title': 'title',
  position: 'title',
  role: 'title',
  linkedin: 'linkedInUrl',
  linkedin_url: 'linkedInUrl',
  linkedinurl: 'linkedInUrl',
  'linkedin url': 'linkedInUrl',
  'linkedin profile': 'linkedInUrl',
  website: 'website',
  website_url: 'website',
  websiteurl: 'website',
  'website url': 'website',
  domain: 'website',
  company_website: 'website',
  'company website': 'website',
  url: 'website',
  site: 'website',
}

export const normalizeCsvHeader = (header: string): string =>
  header.toLowerCase().trim()

export const getMappedFieldForHeader = (
  header: string,
): LeadCsvMappableField | undefined =>
  FIELD_MAPPINGS[normalizeCsvHeader(header)]

export function parseCSV(content: string): {
  headers: string[]
  rows: string[][]
} {
  const lines = content.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length === 0) {
    return { headers: [], rows: [] }
  }

  const headers = parseCSVLine(lines[0])
  const rows = lines.slice(1).map(parseCSVLine)

  return { headers, rows }
}

export function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"' && !inQuotes) {
      inQuotes = true
    } else if (char === '"' && inQuotes) {
      if (nextChar === '"') {
        current += '"'
        i++
      } else {
        inQuotes = false
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

export function escapeCSV(value: string | null | undefined): string {
  if (value == null) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}
