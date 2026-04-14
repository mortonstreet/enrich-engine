import * as dns from 'node:dns/promises'
import * as net from 'node:net'
import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/db'
import logger from '@/lib/logger'
import { detectEmailPattern, extractDomain } from './emailGuess.service'

const DOMAIN_PROFILE_TTL_HOURS = 24 * 7
const SMTP_CONNECT_TIMEOUT_MS = 7000
const SMTP_COMMAND_TIMEOUT_MS = 5000
const SMTP_PROBE_PORT = 25
const MAX_RANKED_CANDIDATES = 6

export type EmailVerificationStatus =
  | 'deliverable_high_confidence'
  | 'deliverable_medium_confidence'
  | 'risky_catch_all'
  | 'undeliverable'
  | 'unknown_temp_failure'
  | 'unknown_policy_blocked'

export type CatchAllState = 'yes' | 'no' | 'suspected' | 'unknown'

export type SmtpResponseClass =
  | 'accept'
  | 'hard_reject'
  | 'temp_fail'
  | 'timeout'
  | 'blocked'

export interface DomainProfileResult {
  domain: string
  mxHosts: string[]
  mxPresent: boolean
  smtpReachable: boolean
  catchAllState: CatchAllState
  lastProfiledAt: Date | null
  profileExpiresAt: Date
  sampleSize: number
  acceptRate: number
  tempFailRate: number
  hardRejectRate: number
}

export interface RankedEmailCandidate {
  email: string
  pattern: string | null
  baseScore: number
  patternScore: number
  domainHealthScore: number
  historicalOutcomeScore: number
  riskPenalty: number
}

export interface VerifyLeadEmailCandidatesInput {
  organizationId: string
  leadId?: string | null
  domain: string
  firstName?: string | null
  lastName?: string | null
  candidates: string[]
}

export interface EmailVerificationDecision {
  email: string
  domain: string
  status: EmailVerificationStatus
  score: number
  reason: string
  smtpHost: string | null
  smtpPort: number | null
  responseCode: string | null
  responseClass: SmtpResponseClass | null
  latencyMs: number | null
  verificationMethod: 'smtp' | 'inference'
}

interface SmtpProbeResult {
  smtpHost: string
  smtpPort: number
  responseCode: number | null
  responseClass: SmtpResponseClass
  message: string | null
  latencyMs: number | null
}

interface SmtpReadResponse {
  code: number
  message: string
  lines: string[]
}

function normalizeDomain(domainOrWebsite: string): string | null {
  return extractDomain(domainOrWebsite)
}

function randomLocalPart(length = 16): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let output = 'eeprobe'
  for (let i = 0; i < length; i++) {
    output += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return output
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function classifyRcptCode(code: number | null): SmtpResponseClass {
  if (code === null) return 'timeout'

  if (code >= 250 && code < 260) {
    return 'accept'
  }

  if (code === 421 || (code >= 450 && code <= 452)) {
    return 'temp_fail'
  }

  if (code >= 500 && code < 600) {
    return 'hard_reject'
  }

  return 'blocked'
}

function scoreDeltaFromSmtpClass(responseClass: SmtpResponseClass): number {
  switch (responseClass) {
    case 'accept':
      return 35
    case 'hard_reject':
      return -40
    case 'temp_fail':
      return -10
    case 'timeout':
      return -12
    case 'blocked':
      return -8
    default:
      return 0
  }
}

function toVerificationStatus(
  score: number,
  responseClass: SmtpResponseClass | null,
  catchAllState: CatchAllState,
): EmailVerificationStatus {
  if (responseClass === 'hard_reject') {
    return 'undeliverable'
  }

  if (catchAllState === 'yes' || catchAllState === 'suspected') {
    return score >= 45 ? 'risky_catch_all' : 'unknown_policy_blocked'
  }

  if (score >= 80) {
    return 'deliverable_high_confidence'
  }

  if (score >= 65) {
    return 'deliverable_medium_confidence'
  }

  if (responseClass === 'temp_fail') {
    return 'unknown_temp_failure'
  }

  if (responseClass === 'timeout' || responseClass === 'blocked') {
    return 'unknown_policy_blocked'
  }

  return 'undeliverable'
}

function statusReason(
  status: EmailVerificationStatus,
  catchAllState: CatchAllState,
  responseClass: SmtpResponseClass | null,
): string {
  if (status === 'risky_catch_all') {
    return catchAllState === 'yes'
      ? 'Domain appears catch-all; mailbox-level certainty is limited'
      : 'Domain appears likely catch-all'
  }

  if (status === 'undeliverable') {
    return responseClass === 'hard_reject'
      ? 'SMTP rejected recipient as undeliverable'
      : 'No reliable deliverability signal'
  }

  if (status === 'unknown_temp_failure') {
    return 'SMTP temp failure; retry recommended'
  }

  if (status === 'unknown_policy_blocked') {
    return 'SMTP policy/timeouts prevent deterministic verification'
  }

  return 'SMTP accepted recipient'
}

function domainHealthScore(profile: DomainProfileResult): number {
  let score = 0
  if (profile.mxPresent) score += 10
  if (profile.smtpReachable) score += 6
  if (profile.catchAllState === 'no') score += 4
  if (profile.catchAllState === 'yes') score -= 3
  return Math.max(0, Math.min(20, score))
}

function riskPenalty(profile: DomainProfileResult): number {
  if (profile.catchAllState === 'yes') return -15
  if (profile.catchAllState === 'suspected') return -8
  if (profile.catchAllState === 'unknown') return -4
  return 0
}

function defaultPatternConfidence(pattern: string | null): number {
  if (!pattern) return 0.35

  switch (pattern) {
    case 'first.last':
      return 0.78
    case 'f_last':
    case 'flast':
      return 0.72
    case 'firstlast':
      return 0.68
    case 'first':
    case 'last':
      return 0.6
    default:
      return 0.55
  }
}

function historicalScoreFromStatus(status: string | null): number {
  switch (status) {
    case 'deliverable_high_confidence':
      return 15
    case 'deliverable_medium_confidence':
      return 8
    case 'risky_catch_all':
      return 2
    case 'undeliverable':
      return -15
    default:
      return 0
  }
}

async function resolveMxHosts(domain: string): Promise<string[]> {
  try {
    const records = await dns.resolveMx(domain)
    if (!records.length) return []

    return records
      .sort((a, b) => a.priority - b.priority)
      .map((r) => r.exchange.toLowerCase().trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

function createLineReader(socket: net.Socket) {
  let buffer = ''
  const lines: string[] = []
  let waiting:
    | {
        resolve: (line: string) => void
        reject: (error: Error) => void
        timer: NodeJS.Timeout
      }
    | undefined
  let terminalError: Error | null = null

  const flushBuffer = () => {
    while (true) {
      const idx = buffer.indexOf('\n')
      if (idx === -1) break

      const line = buffer.slice(0, idx).replace(/\r$/, '')
      buffer = buffer.slice(idx + 1)
      if (waiting) {
        const current = waiting
        waiting = undefined
        clearTimeout(current.timer)
        current.resolve(line)
      } else {
        lines.push(line)
      }
    }
  }

  const failWaiter = (error: Error) => {
    if (!waiting) return
    const current = waiting
    waiting = undefined
    clearTimeout(current.timer)
    current.reject(error)
  }

  socket.setEncoding('utf8')
  socket.on('data', (chunk: string) => {
    buffer += chunk
    flushBuffer()
  })
  socket.on('error', (error) => {
    terminalError = error
    failWaiter(error)
  })
  socket.on('close', () => {
    if (!terminalError) {
      terminalError = new Error('SMTP socket closed')
    }
    failWaiter(terminalError)
  })

  const readLine = async (timeoutMs: number): Promise<string> => {
    if (terminalError) {
      throw terminalError
    }

    if (lines.length > 0) {
      return lines.shift()!
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        waiting = undefined
        reject(new Error('SMTP read timed out'))
      }, timeoutMs)
      waiting = { resolve, reject, timer }
    })
  }

  const readResponse = async (timeoutMs: number): Promise<SmtpReadResponse> => {
    const responseLines: string[] = []

    while (true) {
      const line = await readLine(timeoutMs)
      responseLines.push(line)

      const matched = line.match(/^(\d{3})([ -])(.*)$/)
      if (matched && matched[2] === ' ') {
        return {
          code: Number(matched[1]),
          message: matched[3] ?? '',
          lines: responseLines,
        }
      }
    }
  }

  return {
    readResponse,
  }
}

async function openSmtpSocket(mxHost: string): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({
      host: mxHost,
      port: SMTP_PROBE_PORT,
    })

    const timer = setTimeout(() => {
      socket.destroy(new Error('SMTP connect timed out'))
      reject(new Error('SMTP connect timed out'))
    }, SMTP_CONNECT_TIMEOUT_MS)

    socket.once('connect', () => {
      clearTimeout(timer)
      resolve(socket)
    })

    socket.once('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
  })
}

async function probeMailbox(
  mxHost: string,
  email: string,
): Promise<SmtpProbeResult> {
  const startedAt = Date.now()
  let socket: net.Socket | null = null

  try {
    socket = await openSmtpSocket(mxHost)
    const reader = createLineReader(socket)

    const writeCommand = (command: string) => {
      socket!.write(`${command}\r\n`)
    }

    const greeting = await reader.readResponse(SMTP_COMMAND_TIMEOUT_MS)
    if (greeting.code !== 220) {
      return {
        smtpHost: mxHost,
        smtpPort: SMTP_PROBE_PORT,
        responseCode: greeting.code,
        responseClass: 'blocked',
        message: greeting.message,
        latencyMs: Date.now() - startedAt,
      }
    }

    writeCommand('EHLO enrichengine.local')
    let ehloResponse = await reader.readResponse(SMTP_COMMAND_TIMEOUT_MS)

    if (ehloResponse.code >= 500) {
      writeCommand('HELO enrichengine.local')
      ehloResponse = await reader.readResponse(SMTP_COMMAND_TIMEOUT_MS)
    }

    if (ehloResponse.code >= 500) {
      return {
        smtpHost: mxHost,
        smtpPort: SMTP_PROBE_PORT,
        responseCode: ehloResponse.code,
        responseClass: 'blocked',
        message: ehloResponse.message,
        latencyMs: Date.now() - startedAt,
      }
    }

    writeCommand('MAIL FROM:<>')
    const mailFromResponse = await reader.readResponse(SMTP_COMMAND_TIMEOUT_MS)

    if (mailFromResponse.code >= 500) {
      return {
        smtpHost: mxHost,
        smtpPort: SMTP_PROBE_PORT,
        responseCode: mailFromResponse.code,
        responseClass: 'blocked',
        message: mailFromResponse.message,
        latencyMs: Date.now() - startedAt,
      }
    }

    writeCommand(`RCPT TO:<${email}>`)
    const rcptResponse = await reader.readResponse(SMTP_COMMAND_TIMEOUT_MS)

    writeCommand('QUIT')

    return {
      smtpHost: mxHost,
      smtpPort: SMTP_PROBE_PORT,
      responseCode: rcptResponse.code,
      responseClass: classifyRcptCode(rcptResponse.code),
      message: rcptResponse.message,
      latencyMs: Date.now() - startedAt,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SMTP probe failed'
    const isTimeout = /timed out/i.test(message)

    return {
      smtpHost: mxHost,
      smtpPort: SMTP_PROBE_PORT,
      responseCode: null,
      responseClass: isTimeout ? 'timeout' : 'blocked',
      message,
      latencyMs: Date.now() - startedAt,
    }
  } finally {
    socket?.destroy()
  }
}

function mapDomainProfileRow(row: {
  domain: string
  mxHosts: string[]
  mxPresent: boolean
  smtpReachable: boolean
  catchAllState: string
  lastProfiledAt: Date | null
  profileExpiresAt: Date
  sampleSize: number
  acceptRate: string
  tempFailRate: string
  hardRejectRate: string
}): DomainProfileResult {
  return {
    domain: row.domain,
    mxHosts: row.mxHosts,
    mxPresent: row.mxPresent,
    smtpReachable: row.smtpReachable,
    catchAllState: (row.catchAllState as CatchAllState) ?? 'unknown',
    lastProfiledAt: row.lastProfiledAt,
    profileExpiresAt: row.profileExpiresAt,
    sampleSize: row.sampleSize,
    acceptRate: Number(row.acceptRate ?? 0),
    tempFailRate: Number(row.tempFailRate ?? 0),
    hardRejectRate: Number(row.hardRejectRate ?? 0),
  }
}

export async function profileDomain(
  domainInput: string,
  options?: { forceRefresh?: boolean },
): Promise<DomainProfileResult> {
  const domain = normalizeDomain(domainInput)
  if (!domain) {
    throw new Error(`Invalid domain: ${domainInput}`)
  }

  const now = new Date()
  const existing = await db
    .selectFrom('email_domain_profile')
    .where('domain', '=', domain)
    .selectAll()
    .executeTakeFirst()

  if (existing && !options?.forceRefresh && existing.profileExpiresAt > now) {
    return mapDomainProfileRow(existing)
  }

  const mxHosts = await resolveMxHosts(domain)
  const mxPresent = mxHosts.length > 0

  let smtpReachable = false
  let catchAllState: CatchAllState = 'unknown'
  let sampleSize = 0
  let acceptCount = 0
  let tempFailCount = 0
  let hardRejectCount = 0

  if (mxPresent) {
    const mxHost = mxHosts[0]
    const randomEmails = [
      `${randomLocalPart()}@${domain}`,
      `${randomLocalPart()}@${domain}`,
    ]

    const probeResults: SmtpProbeResult[] = []
    for (const randomEmail of randomEmails) {
      const result = await probeMailbox(mxHost, randomEmail)
      probeResults.push(result)

      if (result.responseClass === 'accept') acceptCount += 1
      if (result.responseClass === 'temp_fail') tempFailCount += 1
      if (result.responseClass === 'hard_reject') hardRejectCount += 1

      const probeStatus: EmailVerificationStatus =
        result.responseClass === 'accept'
          ? 'risky_catch_all'
          : result.responseClass === 'hard_reject'
            ? 'undeliverable'
            : result.responseClass === 'temp_fail'
              ? 'unknown_temp_failure'
              : 'unknown_policy_blocked'

      await recordVerificationAttempt({
        organizationId: 'system',
        email: randomEmail,
        domain,
        attemptType: 'domain_probe',
        smtpHost: result.smtpHost,
        smtpPort: result.smtpPort,
        responseCode: result.responseCode ? String(result.responseCode) : null,
        responseClass: result.responseClass,
        latencyMs: result.latencyMs,
        resultStatus: probeStatus,
      })
    }

    sampleSize = probeResults.length
    smtpReachable = probeResults.some(
      (result) =>
        result.responseClass === 'accept' ||
        result.responseClass === 'temp_fail' ||
        result.responseClass === 'hard_reject',
    )

    if (probeResults.every((r) => r.responseClass === 'accept')) {
      catchAllState = 'yes'
    } else if (probeResults.every((r) => r.responseClass === 'hard_reject')) {
      catchAllState = 'no'
    } else if (probeResults.some((r) => r.responseClass === 'accept')) {
      catchAllState = 'suspected'
    }
  }

  const acceptRateNumeric = sampleSize > 0 ? acceptCount / sampleSize : 0
  const tempFailRateNumeric = sampleSize > 0 ? tempFailCount / sampleSize : 0
  const hardRejectRateNumeric =
    sampleSize > 0 ? hardRejectCount / sampleSize : 0

  const acceptRate = acceptRateNumeric.toFixed(4)
  const tempFailRate = tempFailRateNumeric.toFixed(4)
  const hardRejectRate = hardRejectRateNumeric.toFixed(4)

  const profileExpiresAt = new Date(now)
  profileExpiresAt.setHours(
    profileExpiresAt.getHours() + DOMAIN_PROFILE_TTL_HOURS,
  )

  await db
    .insertInto('email_domain_profile')
    .values({
      id: uuidv4(),
      domain,
      mxHosts,
      mxPresent,
      smtpReachable,
      catchAllState,
      lastProfiledAt: now,
      profileExpiresAt,
      sampleSize,
      acceptRate,
      tempFailRate,
      hardRejectRate,
      createdAt: now,
      updatedAt: now,
    })
    .onConflict((oc) =>
      oc.column('domain').doUpdateSet({
        mxHosts,
        mxPresent,
        smtpReachable,
        catchAllState,
        lastProfiledAt: now,
        profileExpiresAt,
        sampleSize,
        acceptRate,
        tempFailRate,
        hardRejectRate,
        updatedAt: now,
      }),
    )
    .execute()

  return {
    domain,
    mxHosts,
    mxPresent,
    smtpReachable,
    catchAllState,
    lastProfiledAt: now,
    profileExpiresAt,
    sampleSize,
    acceptRate: acceptRateNumeric,
    tempFailRate: tempFailRateNumeric,
    hardRejectRate: hardRejectRateNumeric,
  }
}

async function fetchLatestAttemptStatuses(
  emails: string[],
): Promise<Map<string, string | null>> {
  if (emails.length === 0) {
    return new Map()
  }

  const rows = await db
    .selectFrom('email_verification_attempt')
    .where('email', 'in', emails)
    .select(['email', 'resultStatus', 'createdAt'])
    .orderBy('createdAt', 'desc')
    .execute()

  const latest = new Map<string, string | null>()
  for (const row of rows) {
    if (!latest.has(row.email)) {
      latest.set(row.email, row.resultStatus)
    }
  }

  return latest
}

async function fetchPatternConfidenceByDomain(
  domain: string,
): Promise<Map<string, number>> {
  const rows = await db
    .selectFrom('email_pattern_stats')
    .where('domain', '=', domain)
    .select(['pattern', 'confidence'])
    .execute()

  const map = new Map<string, number>()
  for (const row of rows) {
    map.set(row.pattern, Number(row.confidence))
  }

  return map
}

export async function rankEmailCandidates(input: {
  domain: string
  candidates: string[]
  firstName?: string | null
  lastName?: string | null
  forceRefreshDomainProfile?: boolean
}): Promise<RankedEmailCandidate[]> {
  const domain = normalizeDomain(input.domain)
  if (!domain) {
    return []
  }

  const dedupedCandidates = [...new Set(input.candidates)]
    .map((candidate) => candidate.trim().toLowerCase())
    .filter((candidate) => candidate.endsWith(`@${domain}`))
    .slice(0, MAX_RANKED_CANDIDATES)

  if (dedupedCandidates.length === 0) {
    return []
  }

  const profile = await profileDomain(domain, {
    forceRefresh: input.forceRefreshDomainProfile,
  })
  const patternConfidenceByDomain = await fetchPatternConfidenceByDomain(domain)
  const latestAttemptStatusByEmail =
    await fetchLatestAttemptStatuses(dedupedCandidates)

  const domainScore = domainHealthScore(profile)
  const penalty = riskPenalty(profile)

  const ranked = dedupedCandidates.map((email) => {
    const pattern =
      input.firstName && input.lastName
        ? detectEmailPattern(email, input.firstName, input.lastName)
        : null

    const patternConfidence =
      pattern && patternConfidenceByDomain.has(pattern)
        ? patternConfidenceByDomain.get(pattern)!
        : defaultPatternConfidence(pattern)

    const patternScore = Math.round(patternConfidence * 35)
    const historicalOutcomeScore = historicalScoreFromStatus(
      latestAttemptStatusByEmail.get(email) ?? null,
    )

    const baseScore = clampScore(
      patternScore + domainScore + historicalOutcomeScore + penalty,
    )

    return {
      email,
      pattern,
      baseScore,
      patternScore,
      domainHealthScore: domainScore,
      historicalOutcomeScore,
      riskPenalty: penalty,
    }
  })

  ranked.sort((a, b) => b.baseScore - a.baseScore)
  return ranked
}

async function recordVerificationAttempt(input: {
  organizationId: string
  leadId?: string | null
  email: string
  domain: string
  attemptType: 'domain_probe' | 'candidate_verify'
  smtpHost: string | null
  smtpPort: number | null
  responseCode: string | null
  responseClass: SmtpResponseClass | null
  latencyMs: number | null
  resultStatus: EmailVerificationStatus
}) {
  await db
    .insertInto('email_verification_attempt')
    .values({
      id: uuidv4(),
      organizationId: input.organizationId,
      leadId: input.leadId ?? null,
      email: input.email,
      domain: input.domain,
      attemptType: input.attemptType,
      smtpHost: input.smtpHost,
      smtpPort: input.smtpPort,
      responseCode: input.responseCode,
      responseClass: input.responseClass,
      latencyMs: input.latencyMs,
      resultStatus: input.resultStatus,
      costUnits: 1,
      createdAt: new Date(),
    })
    .execute()
}

async function updatePatternStats(input: {
  domain: string
  pattern: string | null
  status: EmailVerificationStatus
}) {
  if (!input.pattern) return

  const success =
    input.status === 'deliverable_high_confidence' ||
    input.status === 'deliverable_medium_confidence'
  const failure = input.status === 'undeliverable'

  if (!success && !failure) {
    return
  }

  const now = new Date()
  const existing = await db
    .selectFrom('email_pattern_stats')
    .where('domain', '=', input.domain)
    .where('pattern', '=', input.pattern)
    .selectAll()
    .executeTakeFirst()

  const successCount = (existing?.successCount ?? 0) + (success ? 1 : 0)
  const failureCount = (existing?.failureCount ?? 0) + (failure ? 1 : 0)
  const confidenceNumeric =
    (successCount + 1) / (successCount + failureCount + 2)
  const confidence = confidenceNumeric.toFixed(4)

  await db
    .insertInto('email_pattern_stats')
    .values({
      id: uuidv4(),
      domain: input.domain,
      pattern: input.pattern,
      successCount,
      failureCount,
      lastSuccessAt: success ? now : (existing?.lastSuccessAt ?? null),
      lastFailureAt: failure ? now : (existing?.lastFailureAt ?? null),
      confidence,
      createdAt: now,
      updatedAt: now,
    })
    .onConflict((oc) =>
      oc.columns(['domain', 'pattern']).doUpdateSet({
        successCount,
        failureCount,
        lastSuccessAt: success ? now : (existing?.lastSuccessAt ?? null),
        lastFailureAt: failure ? now : (existing?.lastFailureAt ?? null),
        confidence,
        updatedAt: now,
      }),
    )
    .execute()
}

async function upsertLeadContactVerification(input: {
  leadId: string
  email: string
  status: EmailVerificationStatus
  score: number
  reason: string
  method: 'smtp' | 'inference'
}) {
  const now = new Date()

  const existing = await db
    .selectFrom('lead_contact_info')
    .where('leadId', '=', input.leadId)
    .where('type', '=', 'work_email')
    .where('value', '=', input.email)
    .selectAll()
    .executeTakeFirst()

  const isVerified =
    input.status === 'deliverable_high_confidence' ||
    input.status === 'deliverable_medium_confidence'

  if (existing) {
    await db
      .updateTable('lead_contact_info')
      .set({
        isVerified,
        verificationStatus: input.status,
        verificationScore: input.score.toFixed(2),
        verificationReason: input.reason,
        verificationLastCheckedAt: now,
        verificationMethod: input.method,
        updatedAt: now,
      })
      .where('id', '=', existing.id)
      .execute()
    return
  }

  await db
    .insertInto('lead_contact_info')
    .values({
      id: uuidv4(),
      leadId: input.leadId,
      type: 'work_email',
      value: input.email,
      isPrimary: true,
      isVerified,
      source: 'smtp_probe',
      confidence: (input.score / 100).toFixed(4),
      verificationStatus: input.status,
      verificationScore: input.score.toFixed(2),
      verificationReason: input.reason,
      verificationLastCheckedAt: now,
      verificationMethod: input.method,
      createdAt: now,
      updatedAt: now,
    })
    .execute()
}

export async function verifyLeadEmailCandidates(
  input: VerifyLeadEmailCandidatesInput,
): Promise<EmailVerificationDecision> {
  const domain = normalizeDomain(input.domain)
  if (!domain) {
    throw new Error(`Invalid domain: ${input.domain}`)
  }

  const ranked = await rankEmailCandidates({
    domain,
    candidates: input.candidates,
    firstName: input.firstName,
    lastName: input.lastName,
  })

  if (ranked.length === 0) {
    throw new Error('No valid candidate emails to verify')
  }

  const topCandidate = ranked[0]
  const profile = await profileDomain(domain)

  let responseClass: SmtpResponseClass | null = null
  let responseCode: string | null = null
  let smtpHost: string | null = null
  let latencyMs: number | null = null
  let score = topCandidate.baseScore
  let verificationMethod: 'smtp' | 'inference' = 'inference'

  if (!profile.mxPresent) {
    score = clampScore(Math.min(score, 20))
  } else if (
    profile.catchAllState === 'yes' ||
    profile.catchAllState === 'suspected'
  ) {
    score = clampScore(Math.min(score, 64))
  } else {
    const mxHost = profile.mxHosts[0]
    if (mxHost) {
      verificationMethod = 'smtp'
      const probe = await probeMailbox(mxHost, topCandidate.email)
      responseClass = probe.responseClass
      responseCode = probe.responseCode ? String(probe.responseCode) : null
      smtpHost = probe.smtpHost
      latencyMs = probe.latencyMs
      score = clampScore(
        topCandidate.baseScore + scoreDeltaFromSmtpClass(probe.responseClass),
      )
    }
  }

  const status = toVerificationStatus(
    score,
    responseClass,
    profile.catchAllState,
  )
  const reason = statusReason(status, profile.catchAllState, responseClass)

  await recordVerificationAttempt({
    organizationId: input.organizationId,
    leadId: input.leadId,
    email: topCandidate.email,
    domain,
    attemptType: 'candidate_verify',
    smtpHost,
    smtpPort: smtpHost ? SMTP_PROBE_PORT : null,
    responseCode,
    responseClass,
    latencyMs,
    resultStatus: status,
  })

  await updatePatternStats({
    domain,
    pattern: topCandidate.pattern,
    status,
  })

  if (input.leadId) {
    await upsertLeadContactVerification({
      leadId: input.leadId,
      email: topCandidate.email,
      status,
      score,
      reason,
      method: verificationMethod,
    })
  }

  if (
    input.leadId &&
    (status === 'deliverable_high_confidence' ||
      status === 'deliverable_medium_confidence')
  ) {
    await db
      .updateTable('lead')
      .set({
        email: topCandidate.email,
        updatedAt: new Date(),
      })
      .where('id', '=', input.leadId)
      .where('organizationId', '=', input.organizationId)
      .execute()
  }

  logger.info(
    {
      eventType: 'email.verification.completed',
      organizationId: input.organizationId,
      leadId: input.leadId,
      email: topCandidate.email,
      status,
      score,
      responseClass,
      responseCode,
    },
    'Email verification decision completed',
  )

  return {
    email: topCandidate.email,
    domain,
    status,
    score,
    reason,
    smtpHost,
    smtpPort: smtpHost ? SMTP_PROBE_PORT : null,
    responseCode,
    responseClass,
    latencyMs,
    verificationMethod,
  }
}

export async function profileDomainsInBulk(domains: string[]): Promise<void> {
  const uniqueDomains = [
    ...new Set(domains.map((d) => normalizeDomain(d)).filter(Boolean)),
  ] as string[]

  for (const domain of uniqueDomains) {
    try {
      await profileDomain(domain)
    } catch (error) {
      logger.warn(
        {
          eventType: 'email.domain_profile.failed',
          domain,
          error: error instanceof Error ? error.message : String(error),
        },
        'Domain profile refresh failed',
      )
    }
  }
}
