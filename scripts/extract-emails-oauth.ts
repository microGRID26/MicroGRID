#!/usr/bin/env npx tsx
/**
 * extract-emails-oauth.ts — Extract emails using OAuth2 (browser login) instead of service account
 *
 * This approach uses an OAuth client ID (not service account) and opens a browser
 * for you to authorize. As a Workspace admin, you can then access any user's mailbox
 * via the Gmail API with the "me" scope by using admin delegation.
 *
 * Actually — simpler approach: use Google Admin SDK to get a user's email via
 * your admin OAuth token, or just use the service account with correct setup.
 *
 * SIMPLEST APPROACH: Use Google's built-in `generateTransferToken` or just
 * use the fact that Greg has access to her account — we can use app password or
 * OAuth with her consent.
 *
 * Usage:
 *   npx tsx scripts/extract-emails-oauth.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import * as http from 'http'
import * as crypto from 'crypto'

// ── Config ──────────────────────────────────────────────────────────────────

const TARGET_EMAIL = 'ayarborough@trismartsolar.com'
const MONTHS_BACK = 4
const OUTPUT_DIR = path.join(__dirname, '..', 'email-export', 'ayarborough')

function loadOAuthClient(): { client_id: string; client_secret: string; redirect_uris: string[] } {
  const filePath = process.env.OAUTH_CLIENT_FILE || path.join(process.env.HOME || '', 'Downloads', 'client_secret_689993438028-m2ejrtp3riiavk07aelgjkv4nrb70osh.apps.googleusercontent.com.json')
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  const creds = data.installed || data.web
  if (!creds?.client_id || !creds?.client_secret) throw new Error('Invalid OAuth client file')
  console.log(`OAuth client: ${creds.client_id}`)
  return creds
}

// ── OAuth2 Flow ─────────────────────────────────────────────────────────────

async function getOAuthToken(clientId: string, clientSecret: string): Promise<string> {
  const PORT = 8089
  const redirectUri = `http://localhost:${PORT}`
  const scope = 'https://www.googleapis.com/auth/gmail.readonly'

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scope)}` +
    `&access_type=offline` +
    `&login_hint=${encodeURIComponent(TARGET_EMAIL)}` +
    `&prompt=consent`

  console.log('\nOpening browser for authorization...')
  console.log(`IMPORTANT: Log in as ${TARGET_EMAIL} when prompted.\n`)
  console.log(`If the browser doesn't open, go to:\n${authUrl}\n`)

  // Open browser
  const { exec } = require('child_process')
  exec(`open "${authUrl}"`)

  // Wait for the redirect
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url || '', `http://localhost:${PORT}`)
      const code = url.searchParams.get('code')
      const error = url.searchParams.get('error')

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end('<h1>Authorization Failed</h1><p>You can close this window.</p>')
        server.close()
        reject(new Error(`OAuth error: ${error}`))
        return
      }

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end('<h1>Authorization Successful!</h1><p>You can close this window. Email extraction is running...</p>')
        server.close()

        // Exchange code for token
        const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `code=${encodeURIComponent(code)}&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&redirect_uri=${encodeURIComponent(redirectUri)}&grant_type=authorization_code`,
        })

        if (!tokenResp.ok) {
          const err = await tokenResp.text()
          reject(new Error(`Token exchange failed: ${err}`))
          return
        }

        const tokenData = await tokenResp.json() as { access_token: string }
        resolve(tokenData.access_token)
      }
    })

    server.listen(PORT, () => {
      console.log(`Waiting for authorization callback on http://localhost:${PORT} ...`)
    })

    // Timeout after 3 minutes
    setTimeout(() => {
      server.close()
      reject(new Error('Authorization timed out after 3 minutes'))
    }, 180_000)
  })
}

// ── Gmail API (same as extract-emails.ts) ───────────────────────────────────

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
}

async function gmailFetch<T>(token: string, endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${GMAIL_BASE}${endpoint}`)
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const resp = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } })
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Gmail API error (${resp.status}) ${endpoint}: ${err}`)
  }
  return resp.json() as T
}

async function listMessageIds(token: string, query: string): Promise<string[]> {
  const ids: string[] = []
  let pageToken: string | undefined
  console.log(`  Searching: ${query || '(all mail)'}`)
  while (true) {
    const params: Record<string, string> = { maxResults: '500' }
    if (query) params.q = query
    if (pageToken) params.pageToken = pageToken
    const resp = await gmailFetch<MessageListResponse>(token, '/messages', params)
    if (resp.messages) ids.push(...resp.messages.map(m => m.id))
    console.log(`  Found ${ids.length} messages so far...`)
    if (!resp.nextPageToken) break
    pageToken = resp.nextPageToken
  }
  return ids
}

async function getMessageDetail(token: string, messageId: string): Promise<GmailMessage> {
  return gmailFetch<GmailMessage>(token, `/messages/${messageId}`, { format: 'full' })
}

// ── Parsing & Categorization (same as extract-emails.ts) ────────────────────

interface ParsedEmail {
  id: string; threadId: string; date: string; from: string; fromEmail: string
  to: string[]; cc: string[]; subject: string; snippet: string; labels: string[]
  bodyPreview: string; hasAttachments: boolean
  attachments: { filename: string; mimeType: string; size: number }[]
  category: string
}

function getHeader(msg: GmailMessage, name: string): string {
  return msg.payload?.headers?.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || ''
}

function extractAddresses(header: string): string[] {
  if (!header) return []
  return header.split(',').map(s => s.trim()).filter(Boolean)
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
}

function extractBody(parts: GmailPart[] | undefined, mimeType: string = 'text/plain'): string {
  if (!parts) return ''
  for (const part of parts) {
    if (part.mimeType === mimeType && part.body?.data) return decodeBase64Url(part.body.data)
    if (part.parts) { const nested = extractBody(part.parts, mimeType); if (nested) return nested }
  }
  return ''
}

function extractAttachments(parts: GmailPart[] | undefined): { filename: string; mimeType: string; size: number }[] {
  if (!parts) return []
  const attachments: { filename: string; mimeType: string; size: number }[] = []
  for (const part of parts) {
    if (part.filename && part.body?.attachmentId) attachments.push({ filename: part.filename, mimeType: part.mimeType, size: part.body.size || 0 })
    if (part.parts) attachments.push(...extractAttachments(part.parts))
  }
  return attachments
}

const CATEGORY_RULES: { category: string; keywords: RegExp; priority: number }[] = [
  { category: 'URGENT - Time Sensitive', keywords: /\b(urgent|asap|deadline|overdue|past due|final notice|last notice|immediate|time.?sensitive|action required)\b/i, priority: 0 },
  { category: 'Invoices & Payments (AP/AR)', keywords: /\b(invoice|payment|remittance|pay(able|ment)|receivable|billing|bill\s|billed|check\s|ach\b|wire transfer|net\s?\d+|due date|amount due|balance due|outstanding balance|collections?)\b/i, priority: 1 },
  { category: 'Payroll & Compensation', keywords: /\b(payroll|salary|wage|w-?2|1099|compensation|bonus|commission payout|direct deposit|paystub|pay period|garnishment|withholding)\b/i, priority: 2 },
  { category: 'Tax & Compliance', keywords: /\b(tax|irs|sales tax|property tax|franchise tax|filing|compliance|audit|1099|w-?9|form 941|quarterly return|annual report|comptroller)\b/i, priority: 3 },
  { category: 'Banking & Treasury', keywords: /\b(bank|chase|wells fargo|boa|account\s(number|balance|statement)|transfer|wire|deposit|loan|credit line|line of credit|treasury|cash flow|reconcil)\b/i, priority: 4 },
  { category: 'Insurance', keywords: /\b(insurance|policy|premium|coverage|claim|workers.?comp|liability|bonding|certificate of insurance|coi|renewal)\b/i, priority: 5 },
  { category: 'Vendor & Supplier', keywords: /\b(vendor|supplier|purchase order|po\s?#|quote|pricing|contract|agreement|terms|renewal|procurement)\b/i, priority: 6 },
  { category: 'Month-End / Reporting', keywords: /\b(month.?end|close|closing|reconciliation|journal entry|accrual|financials|financial statement|p&l|balance sheet|gl\b|general ledger|trial balance|report)\b/i, priority: 7 },
  { category: 'Funding & Milestones', keywords: /\b(funding|milestone|m[123]\b|funded|incentive|rebate|srec|trec|interconnection|pto\b|notice to proceed|ntp)\b/i, priority: 8 },
  { category: 'Internal Team', keywords: /\b(@gomicrogridenergy\.com|@energydevelopmentgroup\.com|@trismartsolar\.com)\b/i, priority: 9 },
]

function categorize(email: ParsedEmail): string {
  const text = `${email.subject} ${email.bodyPreview} ${email.from}`
  for (const rule of CATEGORY_RULES) { if (rule.keywords.test(text)) return rule.category }
  return 'Other'
}

function parseMessage(msg: GmailMessage): ParsedEmail {
  const from = getHeader(msg, 'From')
  const fromEmailMatch = from.match(/<([^>]+)>/)
  const attachments = extractAttachments(msg.payload?.parts)
  let body = ''
  if (msg.payload?.parts) {
    body = extractBody(msg.payload.parts, 'text/plain')
    if (!body) { body = extractBody(msg.payload.parts, 'text/html'); body = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() }
  } else if (msg.payload?.body?.data) { body = decodeBase64Url(msg.payload.body.data) }

  const parsed: ParsedEmail = {
    id: msg.id, threadId: msg.threadId,
    date: msg.internalDate ? new Date(parseInt(msg.internalDate)).toISOString() : '',
    from, fromEmail: fromEmailMatch ? fromEmailMatch[1] : from,
    to: extractAddresses(getHeader(msg, 'To')), cc: extractAddresses(getHeader(msg, 'Cc')),
    subject: getHeader(msg, 'Subject'), snippet: msg.snippet || '',
    labels: msg.labelIds || [], bodyPreview: body.substring(0, 2000),
    hasAttachments: attachments.length > 0, attachments, category: 'uncategorized',
  }
  parsed.category = categorize(parsed)
  return parsed
}

// ── Report Generation ───────────────────────────────────────────────────────

function generateReport(emails: ParsedEmail[]): string {
  const byCategory = new Map<string, ParsedEmail[]>()
  for (const email of emails) {
    const list = byCategory.get(email.category) || []
    list.push(email)
    byCategory.set(email.category, list)
  }

  const lines: string[] = []
  lines.push(`# Email Handoff Report: ${TARGET_EMAIL}`)
  lines.push(``)
  lines.push(`**Generated:** ${new Date().toISOString().substring(0, 10)}`)
  lines.push(`**Total Emails Analyzed:** ${emails.length.toLocaleString()}`)
  lines.push(`**Purpose:** Business continuity handoff for Mark (CEO) and Paul (CFO)`)
  lines.push(`**Employee:** April Yarborough — Senior Accountant, Dept: Accounting, Manager: mstephens@trismartsolar.com`)
  lines.push(``)
  lines.push(`---`)
  lines.push(``)

  lines.push(`## Executive Summary`)
  lines.push(``)
  lines.push(`| Category | Count | % of Total |`)
  lines.push(`|----------|------:|:----------:|`)

  const summaries = [...byCategory.entries()]
    .map(([category, categoryEmails]) => ({ category, emails: categoryEmails }))
    .sort((a, b) => {
      const aP = CATEGORY_RULES.findIndex(r => r.category === a.category)
      const bP = CATEGORY_RULES.findIndex(r => r.category === b.category)
      return (aP === -1 ? 99 : aP) - (bP === -1 ? 99 : bP)
    })

  for (const s of summaries) {
    const pct = ((s.emails.length / emails.length) * 100).toFixed(1)
    lines.push(`| ${s.category} | ${s.emails.length} | ${pct}% |`)
  }
  lines.push(``)

  // Urgent section
  const urgent = summaries.find(s => s.category === 'URGENT - Time Sensitive')
  if (urgent && urgent.emails.length > 0) {
    lines.push(`## !! URGENT - Needs Immediate Attention (${urgent.emails.length} emails)`)
    lines.push(``)
    const sorted = [...urgent.emails].sort((a, b) => b.date.localeCompare(a.date))
    for (const e of sorted.slice(0, 20)) {
      const att = e.hasAttachments ? ' [ATTACHMENT]' : ''
      lines.push(`- **${e.date.substring(0, 10)}** | ${e.from} | ${e.subject}${att}`)
    }
    lines.push(``)
  }

  // Each category detail
  for (const s of summaries) {
    if (s.category === 'URGENT - Time Sensitive') continue
    const sorted = [...s.emails].sort((a, b) => b.date.localeCompare(a.date))
    const senderCounts = new Map<string, number>()
    for (const e of s.emails) senderCounts.set(e.fromEmail, (senderCounts.get(e.fromEmail) || 0) + 1)
    const topSenders = [...senderCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

    lines.push(`## ${s.category} (${s.emails.length} emails)`)
    lines.push(``)
    lines.push(`**Top contacts:**`)
    for (const [email, count] of topSenders) lines.push(`- ${email} (${count} emails)`)
    lines.push(``)
    lines.push(`**Recent subjects:**`)
    for (const e of sorted.slice(0, 10)) lines.push(`- ${e.date.substring(0, 10)} | ${e.subject}`)
    lines.push(``)
  }

  // Recurring contacts
  const senderFreq = new Map<string, { count: number; subjects: Set<string> }>()
  for (const e of emails) {
    const existing = senderFreq.get(e.fromEmail) || { count: 0, subjects: new Set() }
    existing.count++
    existing.subjects.add(e.subject.replace(/\d+/g, '#').replace(/re:\s*/gi, '').trim())
    senderFreq.set(e.fromEmail, existing)
  }

  lines.push(`## Key Recurring Contacts`)
  lines.push(``)
  lines.push(`| Contact | Emails | Typical Subjects |`)
  lines.push(`|---------|-------:|------------------|`)
  for (const [email, info] of [...senderFreq.entries()].filter(([,v]) => v.count >= 3).sort((a, b) => b[1].count - a[1].count).slice(0, 30)) {
    lines.push(`| ${email} | ${info.count} | ${[...info.subjects].slice(0, 3).join('; ')} |`)
  }
  lines.push(``)

  // Recent threads
  lines.push(`## Most Recent Active Threads (Last 30 Days)`)
  lines.push(``)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
  const recentByThread = new Map<string, ParsedEmail>()
  for (const e of emails) {
    if (e.date >= thirtyDaysAgo) {
      const existing = recentByThread.get(e.threadId)
      if (!existing || e.date > existing.date) recentByThread.set(e.threadId, e)
    }
  }
  for (const e of [...recentByThread.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 50)) {
    const att = e.hasAttachments ? ' [ATTACHMENT]' : ''
    lines.push(`- **${e.date.substring(0, 10)}** | ${e.from} | ${e.subject}${att}`)
  }
  lines.push(``)

  return lines.join('\n')
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nEmail Extraction Tool (OAuth Browser Login)`)
  console.log(`=============================================`)
  console.log(`Target: ${TARGET_EMAIL}`)
  console.log(`Period: Last ${MONTHS_BACK} months\n`)

  const oauthClient = loadOAuthClient()

  // Get token via browser login
  const token = await getOAuthToken(oauthClient.client_id, oauthClient.client_secret)
  console.log('Authorization successful!\n')

  // Build date query
  const since = new Date()
  since.setMonth(since.getMonth() - MONTHS_BACK)
  const afterStr = `${since.getFullYear()}/${since.getMonth() + 1}/${since.getDate()}`
  const query = `after:${afterStr}`

  // List messages
  console.log('2. Listing messages...')
  const messageIds = await listMessageIds(token, query)
  console.log(`   Total: ${messageIds.length}\n`)

  if (messageIds.length === 0) {
    console.log('No messages found.')
    return
  }

  // Fetch details
  console.log('3. Fetching message details...')
  const emails: ParsedEmail[] = []
  const errors: string[] = []
  const BATCH = 10

  for (let i = 0; i < messageIds.length; i += BATCH) {
    const batch = messageIds.slice(i, i + BATCH)
    const results = await Promise.allSettled(batch.map(id => getMessageDetail(token, id)))
    for (let j = 0; j < results.length; j++) {
      const r = results[j]
      if (r.status === 'fulfilled') {
        try { emails.push(parseMessage(r.value)) } catch (err) { errors.push(batch[j]) }
      } else { errors.push(batch[j]) }
    }
    process.stdout.write(`\r   Processed ${Math.min(i + BATCH, messageIds.length)}/${messageIds.length}`)
  }
  console.log('\n')

  emails.sort((a, b) => b.date.localeCompare(a.date))
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  // Save all
  fs.writeFileSync(path.join(OUTPUT_DIR, 'all-emails.json'), JSON.stringify(emails, null, 2))
  console.log(`4. Saved all-emails.json (${emails.length} emails)`)

  // Save by category
  const catDir = path.join(OUTPUT_DIR, 'by-category')
  fs.mkdirSync(catDir, { recursive: true })
  const byCategory = new Map<string, ParsedEmail[]>()
  for (const email of emails) {
    const list = byCategory.get(email.category) || []
    list.push(email)
    byCategory.set(email.category, list)
  }
  for (const [cat, catEmails] of byCategory) {
    const fn = cat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '') + '.json'
    fs.writeFileSync(path.join(catDir, fn), JSON.stringify(catEmails, null, 2))
    console.log(`   by-category/${fn} (${catEmails.length})`)
  }

  // Generate report
  console.log('\n5. Generating handoff report...')
  const report = generateReport(emails)
  fs.writeFileSync(path.join(OUTPUT_DIR, 'HANDOFF-REPORT.md'), report)
  console.log(`   HANDOFF-REPORT.md`)

  // Console summary
  console.log('\n' + '='.repeat(60))
  console.log('COMPLETE')
  console.log('='.repeat(60))
  console.log(`Emails: ${emails.length} | Errors: ${errors.length}`)
  for (const [cat, catEmails] of [...byCategory.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${catEmails.length.toString().padStart(5)}  ${cat}`)
  }
  console.log(`\nOutput: ${OUTPUT_DIR}/`)
  console.log(`Report: ${OUTPUT_DIR}/HANDOFF-REPORT.md`)
}

main().catch(err => {
  console.error('\nFATAL ERROR:', err.message)
  process.exit(1)
})
