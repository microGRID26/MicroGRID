#!/usr/bin/env npx tsx
/**
 * extract-emails.ts — Extract and categorize emails from a Google Workspace user's mailbox
 *
 * Uses a service account with domain-wide delegation to impersonate the target user
 * and pull their email for analysis. Generates a structured JSON archive and a
 * categorized summary report for leadership handoff.
 *
 * Usage:
 *   GOOGLE_SA_CREDENTIALS='{"type":"service_account",...}' \
 *   npx tsx scripts/extract-emails.ts <email@domain.com> [--months=6] [--query="label:inbox"]
 *
 * Or set credentials path:
 *   GOOGLE_SA_KEY_FILE=/path/to/service-account.json \
 *   npx tsx scripts/extract-emails.ts <email@domain.com>
 */

import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

// ── Config ──────────────────────────────────────────────────────────────────

interface Config {
  targetEmail: string
  monthsBack: number
  query: string
  outputDir: string
  maxResults: number       // per page
  batchSize: number        // concurrent detail fetches
}

function parseArgs(): Config {
  const args = process.argv.slice(2)
  const email = args.find(a => !a.startsWith('--'))
  if (!email) {
    console.error('Usage: npx tsx scripts/extract-emails.ts <email@domain.com> [--months=6] [--query=""]')
    process.exit(1)
  }

  let months = 6
  let query = ''
  for (const arg of args) {
    if (arg.startsWith('--months=')) months = parseInt(arg.split('=')[1]) || 6
    if (arg.startsWith('--query=')) query = arg.split('=').slice(1).join('=')
  }

  const outputDir = path.join(__dirname, '..', 'email-export', email.split('@')[0])
  return {
    targetEmail: email,
    monthsBack: months,
    query,
    outputDir,
    maxResults: 500,
    batchSize: 10,
  }
}

// ── Service Account Auth (JWT with impersonation) ───────────────────────────

interface ServiceAccountCredentials {
  type: string
  project_id: string
  private_key_id: string
  private_key: string
  client_email: string
  client_id: string
  token_uri: string
}

function loadCredentials(): ServiceAccountCredentials {
  // Option 1: JSON string in env var
  const raw = process.env.GOOGLE_SA_CREDENTIALS || process.env.GOOGLE_CALENDAR_CREDENTIALS
  if (raw) {
    try { return JSON.parse(raw) } catch { /* fall through */ }
  }

  // Option 2: File path
  const keyFile = process.env.GOOGLE_SA_KEY_FILE
  if (keyFile && fs.existsSync(keyFile)) {
    return JSON.parse(fs.readFileSync(keyFile, 'utf-8'))
  }

  console.error('No credentials found. Set GOOGLE_SA_CREDENTIALS, GOOGLE_CALENDAR_CREDENTIALS, or GOOGLE_SA_KEY_FILE')
  process.exit(1)
}

function base64url(data: string | Buffer): string {
  const b64 = Buffer.from(data).toString('base64')
  return b64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function getAccessToken(creds: ServiceAccountCredentials, impersonateEmail: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)

  const header = { alg: 'RS256', typ: 'JWT' }
  const claimSet = {
    iss: creds.client_email,
    sub: impersonateEmail,  // <-- This is the impersonation (delegated user)
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    aud: creds.token_uri,
    iat: now,
    exp: now + 3600,
  }

  const unsignedToken = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claimSet))}`

  // Sign with RSA-SHA256
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(unsignedToken)
  const signature = signer.sign(creds.private_key)
  const jwt = `${unsignedToken}.${base64url(signature)}`

  // Exchange JWT for access token
  const resp = await fetch(creds.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Token exchange failed (${resp.status}): ${err}`)
  }

  const data = await resp.json() as { access_token: string }
  return data.access_token
}

// ── Gmail API Helpers ───────────────────────────────────────────────────────

const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'

interface GmailMessage {
  id: string
  threadId: string
  labelIds?: string[]
  snippet?: string
  payload?: {
    headers?: { name: string; value: string }[]
    mimeType?: string
    body?: { data?: string; size?: number }
    parts?: GmailPart[]
  }
  internalDate?: string
}

interface GmailPart {
  mimeType: string
  filename?: string
  body?: { data?: string; size?: number; attachmentId?: string }
  parts?: GmailPart[]
  headers?: { name: string; value: string }[]
}

interface MessageListResponse {
  messages?: { id: string; threadId: string }[]
  nextPageToken?: string
  resultSizeEstimate?: number
}

async function gmailFetch<T>(token: string, endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${GMAIL_BASE}${endpoint}`)
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  }

  const resp = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Gmail API error (${resp.status}) ${endpoint}: ${err}`)
  }

  return resp.json() as T
}

async function listMessageIds(token: string, query: string, maxResults: number): Promise<string[]> {
  const ids: string[] = []
  let pageToken: string | undefined

  console.log(`  Searching: ${query || '(all mail)'}`)

  while (true) {
    const params: Record<string, string> = { maxResults: String(maxResults) }
    if (query) params.q = query
    if (pageToken) params.pageToken = pageToken

    const resp = await gmailFetch<MessageListResponse>(token, '/messages', params)

    if (resp.messages) {
      ids.push(...resp.messages.map(m => m.id))
    }

    console.log(`  Found ${ids.length} messages so far...`)

    if (!resp.nextPageToken) break
    pageToken = resp.nextPageToken
  }

  return ids
}

async function getMessageDetail(token: string, messageId: string): Promise<GmailMessage> {
  return gmailFetch<GmailMessage>(token, `/messages/${messageId}`, { format: 'full' })
}

// ── Email Parsing ───────────────────────────────────────────────────────────

interface ParsedEmail {
  id: string
  threadId: string
  date: string
  from: string
  fromEmail: string
  to: string[]
  cc: string[]
  subject: string
  snippet: string
  labels: string[]
  bodyPreview: string   // first 2000 chars of body text
  hasAttachments: boolean
  attachments: { filename: string; mimeType: string; size: number }[]
  category: string      // auto-assigned category
}

function getHeader(msg: GmailMessage, name: string): string {
  return msg.payload?.headers?.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || ''
}

function extractAddresses(header: string): string[] {
  if (!header) return []
  // Split on comma, extract email addresses
  return header.split(',').map(s => s.trim()).filter(Boolean)
}

function decodeBase64Url(data: string): string {
  const padded = data.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(padded, 'base64').toString('utf-8')
}

function extractBody(parts: GmailPart[] | undefined, mimeType: string = 'text/plain'): string {
  if (!parts) return ''

  for (const part of parts) {
    if (part.mimeType === mimeType && part.body?.data) {
      return decodeBase64Url(part.body.data)
    }
    if (part.parts) {
      const nested = extractBody(part.parts, mimeType)
      if (nested) return nested
    }
  }
  return ''
}

function extractAttachments(parts: GmailPart[] | undefined): { filename: string; mimeType: string; size: number }[] {
  if (!parts) return []
  const attachments: { filename: string; mimeType: string; size: number }[] = []

  for (const part of parts) {
    if (part.filename && part.body?.attachmentId) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size || 0,
      })
    }
    if (part.parts) {
      attachments.push(...extractAttachments(part.parts))
    }
  }
  return attachments
}

function parseMessage(msg: GmailMessage): ParsedEmail {
  const from = getHeader(msg, 'From')
  const fromEmailMatch = from.match(/<([^>]+)>/)
  const attachments = extractAttachments(msg.payload?.parts)

  // Try plain text first, fall back to HTML
  let body = ''
  if (msg.payload?.parts) {
    body = extractBody(msg.payload.parts, 'text/plain')
    if (!body) {
      body = extractBody(msg.payload.parts, 'text/html')
      // Strip HTML tags for preview
      body = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    }
  } else if (msg.payload?.body?.data) {
    body = decodeBase64Url(msg.payload.body.data)
  }

  const parsed: ParsedEmail = {
    id: msg.id,
    threadId: msg.threadId,
    date: msg.internalDate ? new Date(parseInt(msg.internalDate)).toISOString() : '',
    from,
    fromEmail: fromEmailMatch ? fromEmailMatch[1] : from,
    to: extractAddresses(getHeader(msg, 'To')),
    cc: extractAddresses(getHeader(msg, 'Cc')),
    subject: getHeader(msg, 'Subject'),
    snippet: msg.snippet || '',
    labels: msg.labelIds || [],
    bodyPreview: body.substring(0, 2000),
    hasAttachments: attachments.length > 0,
    attachments,
    category: 'uncategorized',
  }

  parsed.category = categorize(parsed)
  return parsed
}

// ── Categorization ──────────────────────────────────────────────────────────

const CATEGORY_RULES: { category: string; keywords: RegExp; priority: number }[] = [
  {
    category: 'URGENT - Time Sensitive',
    keywords: /\b(urgent|asap|deadline|overdue|past due|final notice|last notice|immediate|time.?sensitive|action required)\b/i,
    priority: 0,
  },
  {
    category: 'Invoices & Payments (AP/AR)',
    keywords: /\b(invoice|payment|remittance|pay(able|ment)|receivable|billing|bill\s|billed|check\s|ach\b|wire transfer|net\s?\d+|due date|amount due|balance due|outstanding balance|collections?)\b/i,
    priority: 1,
  },
  {
    category: 'Payroll & Compensation',
    keywords: /\b(payroll|salary|wage|w-?2|1099|compensation|bonus|commission payout|direct deposit|paystub|pay period|garnishment|withholding)\b/i,
    priority: 2,
  },
  {
    category: 'Tax & Compliance',
    keywords: /\b(tax|irs|sales tax|property tax|franchise tax|filing|compliance|audit|1099|w-?9|form 941|quarterly return|annual report|comptroller)\b/i,
    priority: 3,
  },
  {
    category: 'Banking & Treasury',
    keywords: /\b(bank|chase|wells fargo|boa|account\s(number|balance|statement)|transfer|wire|deposit|loan|credit line|line of credit|treasury|cash flow|reconcil)\b/i,
    priority: 4,
  },
  {
    category: 'Insurance',
    keywords: /\b(insurance|policy|premium|coverage|claim|workers.?comp|liability|bonding|certificate of insurance|coi|renewal)\b/i,
    priority: 5,
  },
  {
    category: 'Vendor & Supplier',
    keywords: /\b(vendor|supplier|purchase order|po\s?#|quote|pricing|contract|agreement|terms|renewal|procurement)\b/i,
    priority: 6,
  },
  {
    category: 'Month-End / Reporting',
    keywords: /\b(month.?end|close|closing|reconciliation|journal entry|accrual|financials|financial statement|p&l|balance sheet|gl\b|general ledger|trial balance|report)\b/i,
    priority: 7,
  },
  {
    category: 'Funding & Milestones',
    keywords: /\b(funding|milestone|m[123]\b|funded|incentive|rebate|srec|trec|interconnection|pto\b|notice to proceed|ntp)\b/i,
    priority: 8,
  },
  {
    category: 'Internal Team',
    keywords: /\b(@gomicrogridenergy\.com|@energydevelopmentgroup\.com|@trismartsolar\.com)\b/i,
    priority: 9,
  },
]

function categorize(email: ParsedEmail): string {
  const text = `${email.subject} ${email.bodyPreview} ${email.from}`

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.test(text)) {
      return rule.category
    }
  }
  return 'Other'
}

// ── Report Generation ───────────────────────────────────────────────────────

interface CategorySummary {
  category: string
  count: number
  emails: ParsedEmail[]
  topSenders: { email: string; count: number }[]
  recentSubjects: string[]
  dateRange: { earliest: string; latest: string }
}

function generateReport(emails: ParsedEmail[], targetEmail: string): string {
  // Group by category
  const byCategory = new Map<string, ParsedEmail[]>()
  for (const email of emails) {
    const list = byCategory.get(email.category) || []
    list.push(email)
    byCategory.set(email.category, list)
  }

  // Build category summaries
  const summaries: CategorySummary[] = []
  for (const [category, categoryEmails] of byCategory) {
    const senderCounts = new Map<string, number>()
    for (const e of categoryEmails) {
      senderCounts.set(e.fromEmail, (senderCounts.get(e.fromEmail) || 0) + 1)
    }
    const topSenders = [...senderCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([email, count]) => ({ email, count }))

    const sorted = [...categoryEmails].sort((a, b) => b.date.localeCompare(a.date))
    const dates = categoryEmails.map(e => e.date).filter(Boolean).sort()

    summaries.push({
      category,
      count: categoryEmails.length,
      emails: categoryEmails,
      topSenders,
      recentSubjects: sorted.slice(0, 15).map(e => `${e.date.substring(0, 10)} | ${e.subject}`),
      dateRange: { earliest: dates[0] || '', latest: dates[dates.length - 1] || '' },
    })
  }

  summaries.sort((a, b) => {
    const aPriority = CATEGORY_RULES.findIndex(r => r.category === a.category)
    const bPriority = CATEGORY_RULES.findIndex(r => r.category === b.category)
    return (aPriority === -1 ? 99 : aPriority) - (bPriority === -1 ? 99 : bPriority)
  })

  // Identify recurring patterns (weekly/monthly senders)
  const senderFrequency = new Map<string, { count: number; subjects: Set<string> }>()
  for (const e of emails) {
    const existing = senderFrequency.get(e.fromEmail) || { count: 0, subjects: new Set() }
    existing.count++
    existing.subjects.add(e.subject.replace(/\d+/g, '#').replace(/re:\s*/gi, '').trim())
    senderFrequency.set(e.fromEmail, existing)
  }

  const recurringContacts = [...senderFrequency.entries()]
    .filter(([, v]) => v.count >= 5)
    .sort((a, b) => b[1].count - a[1].count)

  // Build markdown report
  const lines: string[] = []
  lines.push(`# Email Handoff Report: ${targetEmail}`)
  lines.push(``)
  lines.push(`**Generated:** ${new Date().toISOString().substring(0, 10)}`)
  lines.push(`**Total Emails Analyzed:** ${emails.length.toLocaleString()}`)
  lines.push(`**Purpose:** Business continuity handoff for Mark (CEO) and Paul (CFO)`)
  lines.push(``)
  lines.push(`---`)
  lines.push(``)

  // Executive summary
  lines.push(`## Executive Summary`)
  lines.push(``)
  lines.push(`| Category | Count | % of Total |`)
  lines.push(`|----------|------:|:----------:|`)
  for (const s of summaries) {
    const pct = ((s.count / emails.length) * 100).toFixed(1)
    lines.push(`| ${s.category} | ${s.count} | ${pct}% |`)
  }
  lines.push(``)

  // Urgent / time-sensitive section first
  const urgent = summaries.find(s => s.category === 'URGENT - Time Sensitive')
  if (urgent && urgent.count > 0) {
    lines.push(`## !! URGENT - Needs Immediate Attention (${urgent.count} emails)`)
    lines.push(``)
    for (const subj of urgent.recentSubjects.slice(0, 20)) {
      lines.push(`- ${subj}`)
    }
    lines.push(``)
  }

  // Each category
  for (const s of summaries) {
    if (s.category === 'URGENT - Time Sensitive') continue // already shown above
    lines.push(`## ${s.category} (${s.count} emails)`)
    lines.push(``)
    if (s.dateRange.earliest) {
      lines.push(`**Date range:** ${s.dateRange.earliest.substring(0, 10)} to ${s.dateRange.latest.substring(0, 10)}`)
      lines.push(``)
    }
    lines.push(`**Top contacts:**`)
    for (const sender of s.topSenders.slice(0, 5)) {
      lines.push(`- ${sender.email} (${sender.count} emails)`)
    }
    lines.push(``)
    lines.push(`**Recent subjects:**`)
    for (const subj of s.recentSubjects.slice(0, 10)) {
      lines.push(`- ${subj}`)
    }
    lines.push(``)
  }

  // Recurring contacts / responsibilities
  lines.push(`## Key Recurring Contacts`)
  lines.push(``)
  lines.push(`These people communicated with ${targetEmail.split('@')[0]} regularly — they may be expecting continued responses:`)
  lines.push(``)
  lines.push(`| Contact | Emails | Typical Subjects |`)
  lines.push(`|---------|-------:|------------------|`)
  for (const [email, info] of recurringContacts.slice(0, 30)) {
    const subjects = [...info.subjects].slice(0, 3).join('; ')
    lines.push(`| ${email} | ${info.count} | ${subjects} |`)
  }
  lines.push(``)

  // Open threads (most recent per thread)
  lines.push(`## Most Recent Active Threads (Last 30 Days)`)
  lines.push(``)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
  const recentByThread = new Map<string, ParsedEmail>()
  for (const e of emails) {
    if (e.date >= thirtyDaysAgo) {
      const existing = recentByThread.get(e.threadId)
      if (!existing || e.date > existing.date) {
        recentByThread.set(e.threadId, e)
      }
    }
  }
  const recentThreads = [...recentByThread.values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 50)

  for (const e of recentThreads) {
    const att = e.hasAttachments ? ' [ATTACHMENT]' : ''
    lines.push(`- **${e.date.substring(0, 10)}** | ${e.from} | ${e.subject}${att}`)
  }
  lines.push(``)

  return lines.join('\n')
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const config = parseArgs()
  console.log(`\nEmail Extraction Tool`)
  console.log(`=====================`)
  console.log(`Target: ${config.targetEmail}`)
  console.log(`Period: Last ${config.monthsBack} months`)
  console.log(`Output: ${config.outputDir}`)
  console.log()

  // Load credentials and authenticate
  console.log('1. Authenticating with service account...')
  const creds = loadCredentials()
  console.log(`   Service account: ${creds.client_email}`)
  console.log(`   Client ID: ${creds.client_id}`)

  const token = await getAccessToken(creds, config.targetEmail)
  console.log('   Authentication successful!\n')

  // Build date query
  const since = new Date()
  since.setMonth(since.getMonth() - config.monthsBack)
  const afterStr = `${since.getFullYear()}/${since.getMonth() + 1}/${since.getDate()}`
  const dateQuery = `after:${afterStr}`
  const fullQuery = config.query ? `${config.query} ${dateQuery}` : dateQuery

  // List all message IDs
  console.log('2. Listing messages...')
  const messageIds = await listMessageIds(token, fullQuery, config.maxResults)
  console.log(`   Total messages found: ${messageIds.length}\n`)

  if (messageIds.length === 0) {
    console.log('No messages found. Check the email address and date range.')
    return
  }

  // Fetch message details in batches
  console.log('3. Fetching message details...')
  const emails: ParsedEmail[] = []
  const errors: { id: string; error: string }[] = []

  for (let i = 0; i < messageIds.length; i += config.batchSize) {
    const batch = messageIds.slice(i, i + config.batchSize)
    const results = await Promise.allSettled(
      batch.map(id => getMessageDetail(token, id))
    )

    for (let j = 0; j < results.length; j++) {
      const result = results[j]
      if (result.status === 'fulfilled') {
        try {
          emails.push(parseMessage(result.value))
        } catch (err) {
          errors.push({ id: batch[j], error: String(err) })
        }
      } else {
        errors.push({ id: batch[j], error: result.reason?.message || 'Unknown error' })
      }
    }

    const progress = Math.min(i + config.batchSize, messageIds.length)
    process.stdout.write(`\r   Processed ${progress}/${messageIds.length} (${((progress / messageIds.length) * 100).toFixed(0)}%)`)
  }
  console.log('\n')

  if (errors.length > 0) {
    console.log(`   ${errors.length} messages had errors (logged to errors.json)`)
  }

  // Sort by date descending
  emails.sort((a, b) => b.date.localeCompare(a.date))

  // Create output directory
  fs.mkdirSync(config.outputDir, { recursive: true })

  // Save raw data
  console.log('4. Saving data...')
  fs.writeFileSync(
    path.join(config.outputDir, 'all-emails.json'),
    JSON.stringify(emails, null, 2)
  )
  console.log(`   all-emails.json (${emails.length} emails)`)

  // Save per-category JSONs
  const byCategory = new Map<string, ParsedEmail[]>()
  for (const email of emails) {
    const list = byCategory.get(email.category) || []
    list.push(email)
    byCategory.set(email.category, list)
  }

  const categoryDir = path.join(config.outputDir, 'by-category')
  fs.mkdirSync(categoryDir, { recursive: true })
  for (const [category, categoryEmails] of byCategory) {
    const filename = category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '') + '.json'
    fs.writeFileSync(
      path.join(categoryDir, filename),
      JSON.stringify(categoryEmails, null, 2)
    )
    console.log(`   by-category/${filename} (${categoryEmails.length})`)
  }

  // Save errors if any
  if (errors.length > 0) {
    fs.writeFileSync(
      path.join(config.outputDir, 'errors.json'),
      JSON.stringify(errors, null, 2)
    )
  }

  // Generate and save report
  console.log('\n5. Generating handoff report...')
  const report = generateReport(emails, config.targetEmail)
  fs.writeFileSync(path.join(config.outputDir, 'HANDOFF-REPORT.md'), report)
  console.log(`   HANDOFF-REPORT.md saved`)

  // Print summary to console
  console.log('\n' + '='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total emails: ${emails.length}`)
  console.log(`Date range: ${emails[emails.length - 1]?.date?.substring(0, 10)} to ${emails[0]?.date?.substring(0, 10)}`)
  console.log(`Parse errors: ${errors.length}`)
  console.log()
  console.log('By category:')
  for (const [category, categoryEmails] of [...byCategory.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${categoryEmails.length.toString().padStart(5)}  ${category}`)
  }
  console.log()
  console.log(`Output: ${config.outputDir}/`)
  console.log(`Report: ${config.outputDir}/HANDOFF-REPORT.md`)
  console.log()
  console.log('Next steps:')
  console.log('  1. Review HANDOFF-REPORT.md with Mark and Paul')
  console.log('  2. Check the URGENT section first for time-sensitive items')
  console.log('  3. Review by-category/ files for detail on each area')
  console.log('  4. Contact key recurring contacts to establish new points of contact')
}

main().catch(err => {
  console.error('\nFATAL ERROR:', err.message)
  if (err.message.includes('403') || err.message.includes('Forbidden')) {
    console.error('\nLikely cause: Domain-wide delegation not configured for this service account.')
    console.error('Go to admin.google.com > Security > API Controls > Domain-wide Delegation')
    console.error('Add the service account Client ID with scope: https://www.googleapis.com/auth/gmail.readonly')
  }
  if (err.message.includes('404') || err.message.includes('Not Found')) {
    console.error('\nLikely cause: Gmail API not enabled in Google Cloud Console.')
    console.error('Go to console.cloud.google.com > APIs & Services > Library > Gmail API > Enable')
  }
  process.exit(1)
})
