#!/usr/bin/env npx tsx
/**
 * parse-vault-export.ts — Parse Google Vault MBOX export and generate handoff report
 *
 * Reads the metadata CSV for fast indexing, then parses the MBOX for body content
 * on categorized emails. Generates a structured report for leadership handoff.
 *
 * Usage:
 *   npx tsx scripts/parse-vault-export.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'

const EXPORT_DIR = path.join(__dirname, '..', 'email-export', 'ayarborough')
const METADATA_FILE = path.join(EXPORT_DIR, 'April_Yarborough-metadata.csv')
const MBOX_FILE = fs.readdirSync(EXPORT_DIR).find(f => f.endsWith('.mbox'))
const MBOX_PATH = MBOX_FILE ? path.join(EXPORT_DIR, MBOX_FILE) : ''

// Date filter: Dec 15, 2025 to March 31, 2026
const DATE_START = new Date('2025-12-15T00:00:00Z')
const DATE_END = new Date('2026-04-01T00:00:00Z')

// ── Types ───────────────────────────────────────────────────────────────────

interface EmailRecord {
  messageId: string
  gmailId: string
  from: string
  fromEmail: string
  to: string
  cc: string
  subject: string
  dateSent: string
  dateReceived: string
  labels: string
  category: string
  bodyPreview: string
  hasBody: boolean
}

// ── CSV Parser ──────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        fields.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  fields.push(current)
  return fields
}

async function loadMetadata(): Promise<EmailRecord[]> {
  const content = fs.readFileSync(METADATA_FILE, 'utf-8')
  const lines = content.split('\n')
  const header = parseCSVLine(lines[0])

  const colIdx = (name: string) => header.indexOf(name)
  const iFrom = colIdx('From')
  const iSubject = colIdx('Subject')
  const iTo = colIdx('To')
  const iCC = colIdx('CC')
  const iDateSent = colIdx('DateSent')
  const iDateReceived = colIdx('DateReceived')
  const iLabels = colIdx('Labels')
  const iMsgId = colIdx('Rfc822MessageId')
  const iGmailId = colIdx('GmailMessageId')

  const records: EmailRecord[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const fields = parseCSVLine(line)
    const dateSent = fields[iDateSent] || ''
    const dateReceived = fields[iDateReceived] || ''
    const dateStr = dateSent || dateReceived
    if (!dateStr) continue

    const date = new Date(dateStr)
    if (date < DATE_START || date >= DATE_END) continue

    const from = fields[iFrom] || ''
    const fromEmailMatch = from.match(/<([^>]+)>/)

    const record: EmailRecord = {
      messageId: fields[iMsgId] || '',
      gmailId: fields[iGmailId] || '',
      from,
      fromEmail: fromEmailMatch ? fromEmailMatch[1] : from,
      to: fields[iTo] || '',
      cc: fields[iCC] || '',
      subject: fields[iSubject] || '',
      dateSent,
      dateReceived,
      labels: fields[iLabels] || '',
      category: '',
      bodyPreview: '',
      hasBody: false,
    }

    // Skip spam and promotions unless they match finance keywords
    const labels = record.labels.toLowerCase()
    if (labels.includes('spam') && !isFinanceRelated(record)) continue

    record.category = categorize(record)
    records.push(record)
  }

  return records
}

// ── Categorization ──────────────────────────────────────────────────────────

const CATEGORY_RULES: { category: string; keywords: RegExp; priority: number }[] = [
  {
    category: 'URGENT - Time Sensitive',
    keywords: /\b(urgent|asap|deadline|overdue|past due|final notice|last notice|immediate|time.?sensitive|action required|delinquent|suspend|terminate|expir(e|ing|ation)|last day|cut.?off)\b/i,
    priority: 0,
  },
  {
    category: 'Invoices & Payments (AP/AR)',
    keywords: /\b(invoice|payment|remittance|payable|receivable|billing|billed|ach\b|wire transfer|net\s?\d+|due date|amount due|balance due|outstanding|collections?|statement of account|credit memo|debit memo|refund)\b/i,
    priority: 1,
  },
  {
    category: 'Payroll & Compensation',
    keywords: /\b(payroll|salary|wage|w-?2|1099|compensation|bonus|commission payout|direct deposit|paystub|pay period|garnishment|withholding|bamboo.?hr|gusto|adp|paychex|pay stub|time.?sheet|overtime)\b/i,
    priority: 2,
  },
  {
    category: 'Tax & Compliance',
    keywords: /\b(tax\b|irs|sales tax|property tax|franchise tax|filing|compliance|audit(?!trail)|1099|w-?9|form 941|quarterly return|annual report|comptroller|tax return|estimated tax|excise|withholding tax)\b/i,
    priority: 3,
  },
  {
    category: 'Banking & Treasury',
    keywords: /\b(bank|stellar\.bank|chase|wells fargo|boa|bank of america|account\s?(number|balance|statement)|transfer|wire|deposit|loan|credit line|line of credit|treasury|cash flow|reconcil|positive pay|zelle|ach|routing)\b/i,
    priority: 4,
  },
  {
    category: 'Insurance',
    keywords: /\b(insurance|policy|premium|coverage|claim|workers.?comp|liability|bonding|certificate of insurance|coi\b|renewal|indemnity|surety|umbrella|general liability)\b/i,
    priority: 5,
  },
  {
    category: 'Vendor & Supplier',
    keywords: /\b(vendor|supplier|purchase order|po\s?#|po\s?\d|quote|pricing|contract|agreement|terms|procurement|bid|proposal|rfp|rfq|net\s?\d+\s?days)\b/i,
    priority: 6,
  },
  {
    category: 'Month-End / Reporting',
    keywords: /\b(month.?end|close|closing|reconciliation|journal entry|accrual|financials|financial statement|p&l|profit.?loss|balance sheet|gl\b|general ledger|trial balance|eom|year.?end|inventory count)\b/i,
    priority: 7,
  },
  {
    category: 'Funding & Solar Operations',
    keywords: /\b(funding|milestone|m[123]\b|funded|incentive|rebate|srec|trec|interconnection|pto\b|notice to proceed|ntp|install|solar|panel|inverter|permit|inspection|utility|ahj)\b/i,
    priority: 8,
  },
  {
    category: 'Legal & Contracts',
    keywords: /\b(legal|attorney|lawyer|lawsuit|lien|judgment|contract|lease|nda|non.?disclosure|subpoena|settlement|arbitration|mediation)\b/i,
    priority: 9,
  },
  {
    category: 'HR & Personnel',
    keywords: /\b(hr\b|human resources|employee|termination|onboarding|benefits|401k|health plan|pto\b|vacation|sick leave|cobra|fmla|performance review)\b/i,
    priority: 10,
  },
  {
    category: 'Internal Team',
    keywords: /@(gomicrogridenergy|energydevelopmentgroup|trismartsolar)\.com/i,
    priority: 11,
  },
]

function isFinanceRelated(record: EmailRecord): boolean {
  const text = `${record.subject} ${record.from}`
  return /\b(invoice|payment|bank|tax|payroll|funding|milestone|statement|reconcil|audit)\b/i.test(text)
}

function categorize(record: EmailRecord): string {
  const text = `${record.subject} ${record.from} ${record.to}`
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.test(text)) return rule.category
  }
  return 'Other'
}

// ── MBOX Body Extraction (for high-priority emails) ─────────────────────────

async function extractBodiesFromMbox(records: EmailRecord[], targetGmailIds: Set<string>): Promise<Map<string, string>> {
  if (!MBOX_PATH || !fs.existsSync(MBOX_PATH)) return new Map()

  console.log(`   Scanning MBOX for ${targetGmailIds.size} priority email bodies...`)
  const bodies = new Map<string, string>()
  const fileStream = fs.createReadStream(MBOX_PATH, { encoding: 'utf-8', highWaterMark: 1024 * 1024 })
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity })

  let currentId = ''
  let inBody = false
  let headersDone = false
  let bodyLines: string[] = []
  let lineCount = 0
  let found = 0

  for await (const line of rl) {
    lineCount++
    if (lineCount % 500000 === 0) process.stdout.write(`\r   Scanned ${(lineCount / 1000000).toFixed(1)}M lines, found ${found}/${targetGmailIds.size} bodies...`)

    // New message boundary
    if (line.startsWith('From ')) {
      // Save previous message body if it was a target
      if (currentId && targetGmailIds.has(currentId) && bodyLines.length > 0) {
        let body = bodyLines.join('\n')
        // Strip HTML
        body = body.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        body = body.replace(/<[^>]*>/g, ' ')
        body = body.replace(/&nbsp;/gi, ' ')
        body = body.replace(/&amp;/gi, '&')
        body = body.replace(/&lt;/gi, '<')
        body = body.replace(/&gt;/gi, '>')
        body = body.replace(/\s+/g, ' ')
        bodies.set(currentId, body.trim().substring(0, 3000))
        found++
        if (found >= targetGmailIds.size) break
      }
      currentId = ''
      inBody = false
      headersDone = false
      bodyLines = []
      continue
    }

    // Look for X-GM-MSGID or Message-ID in headers
    if (!headersDone) {
      if (line === '' || line === '\r') {
        headersDone = true
        inBody = true
        continue
      }
      // Match Gmail message ID from vault metadata filename pattern
      if (line.startsWith('X-GM-THRID:') || line.startsWith('Message-ID:')) {
        // Try to extract gmail ID from headers
      }
      // Use Subject + Date as fallback matching
      continue
    }

    // Collect body lines for target messages
    if (inBody && bodyLines.length < 200) {
      bodyLines.push(line)
    }
  }

  // Don't forget the last message
  if (currentId && targetGmailIds.has(currentId) && bodyLines.length > 0) {
    let body = bodyLines.join('\n').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
    bodies.set(currentId, body.trim().substring(0, 3000))
  }

  console.log(`\r   Found ${bodies.size} email bodies from MBOX                              `)
  return bodies
}

// ── Report Generation ───────────────────────────────────────────────────────

function generateReport(records: EmailRecord[]): string {
  const byCategory = new Map<string, EmailRecord[]>()
  for (const r of records) {
    const list = byCategory.get(r.category) || []
    list.push(r)
    byCategory.set(r.category, list)
  }

  const summaries = [...byCategory.entries()]
    .map(([category, emails]) => ({ category, emails }))
    .sort((a, b) => {
      const aP = CATEGORY_RULES.findIndex(r => r.category === a.category)
      const bP = CATEGORY_RULES.findIndex(r => r.category === b.category)
      return (aP === -1 ? 99 : aP) - (bP === -1 ? 99 : bP)
    })

  const lines: string[] = []
  lines.push(`# Email Handoff Report: April Yarborough`)
  lines.push(`## ayarborough@trismartsolar.com`)
  lines.push(``)
  lines.push(`**Generated:** ${new Date().toISOString().substring(0, 10)}`)
  lines.push(`**Total Emails Analyzed:** ${records.length.toLocaleString()}`)
  lines.push(`**Date Range:** Dec 15, 2025 — Mar 31, 2026`)
  lines.push(`**Purpose:** Business continuity handoff for Mark (CEO) and Paul (CFO)`)
  lines.push(`**Employee:** April Yarborough — Senior Accountant, Dept: Accounting, Role: Billing Admin`)
  lines.push(`**Note:** Both April and her manager (mstephens) are no longer with the company.`)
  lines.push(``)
  lines.push(`---`)
  lines.push(``)

  // Executive summary table
  lines.push(`## Executive Summary`)
  lines.push(``)
  lines.push(`| Category | Count | % of Total |`)
  lines.push(`|----------|------:|:----------:|`)
  for (const s of summaries) {
    const pct = ((s.emails.length / records.length) * 100).toFixed(1)
    lines.push(`| ${s.category} | ${s.emails.length} | ${pct}% |`)
  }
  lines.push(``)

  // URGENT section first
  const urgent = summaries.find(s => s.category === 'URGENT - Time Sensitive')
  if (urgent && urgent.emails.length > 0) {
    lines.push(`## ⚠️ URGENT - Needs Immediate Attention (${urgent.emails.length} emails)`)
    lines.push(``)
    lines.push(`These emails contain time-sensitive language. Review immediately.`)
    lines.push(``)
    const sorted = [...urgent.emails].sort((a, b) => (b.dateSent || b.dateReceived).localeCompare(a.dateSent || a.dateReceived))
    for (const e of sorted.slice(0, 30)) {
      const date = (e.dateSent || e.dateReceived).substring(0, 10)
      lines.push(`- **${date}** | ${e.fromEmail} | ${e.subject}`)
    }
    lines.push(``)
  }

  // Each category
  for (const s of summaries) {
    if (s.category === 'URGENT - Time Sensitive') continue

    const sorted = [...s.emails].sort((a, b) => (b.dateSent || b.dateReceived).localeCompare(a.dateSent || a.dateReceived))

    // Top senders
    const senderCounts = new Map<string, number>()
    for (const e of s.emails) {
      const email = e.fromEmail.toLowerCase()
      senderCounts.set(email, (senderCounts.get(email) || 0) + 1)
    }
    const topSenders = [...senderCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)

    lines.push(`## ${s.category} (${s.emails.length} emails)`)
    lines.push(``)

    if (topSenders.length > 0) {
      lines.push(`**Key contacts:**`)
      for (const [email, count] of topSenders) {
        lines.push(`- ${email} (${count})`)
      }
      lines.push(``)
    }

    lines.push(`**Most recent:**`)
    for (const e of sorted.slice(0, 15)) {
      const date = (e.dateSent || e.dateReceived).substring(0, 10)
      lines.push(`- ${date} | ${e.fromEmail} | ${e.subject}`)
    }
    lines.push(``)
  }

  // Global recurring contacts
  lines.push(`## All Key Contacts (5+ emails in period)`)
  lines.push(``)
  const globalSenders = new Map<string, { count: number; subjects: Set<string>; categories: Set<string> }>()
  for (const r of records) {
    const email = r.fromEmail.toLowerCase()
    if (email === 'ayarborough@trismartsolar.com') continue // skip self
    const existing = globalSenders.get(email) || { count: 0, subjects: new Set(), categories: new Set() }
    existing.count++
    existing.subjects.add(r.subject.replace(/\d+/g, '#').replace(/re:\s*/gi, '').replace(/fw[d]?:\s*/gi, '').trim().substring(0, 60))
    existing.categories.add(r.category)
    globalSenders.set(email, existing)
  }

  const topGlobal = [...globalSenders.entries()]
    .filter(([, v]) => v.count >= 5)
    .sort((a, b) => b[1].count - a[1].count)

  lines.push(`| Contact | Emails | Categories | Typical Subjects |`)
  lines.push(`|---------|-------:|------------|------------------|`)
  for (const [email, info] of topGlobal.slice(0, 40)) {
    const cats = [...info.categories].filter(c => c !== 'Other' && c !== 'Internal Team').slice(0, 2).join(', ') || 'General'
    const subjects = [...info.subjects].slice(0, 3).join('; ')
    lines.push(`| ${email} | ${info.count} | ${cats} | ${subjects} |`)
  }
  lines.push(``)

  // Recent 30-day threads
  lines.push(`## Most Recent Threads (Last 30 Days)`)
  lines.push(``)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
  const recent = records
    .filter(r => (r.dateSent || r.dateReceived) >= thirtyDaysAgo)
    .filter(r => r.category !== 'Other' && !r.labels.includes('SPAM'))
    .sort((a, b) => (b.dateSent || b.dateReceived).localeCompare(a.dateSent || a.dateReceived))
    .slice(0, 60)

  for (const e of recent) {
    const date = (e.dateSent || e.dateReceived).substring(0, 10)
    const cat = e.category.replace(/ *\(.*/, '').substring(0, 20)
    lines.push(`- **${date}** [${cat}] ${e.fromEmail} — ${e.subject}`)
  }
  lines.push(``)

  // Weekly volume chart
  lines.push(`## Weekly Email Volume`)
  lines.push(``)
  const weekCounts = new Map<string, number>()
  for (const r of records) {
    const d = new Date(r.dateSent || r.dateReceived)
    const weekStart = new Date(d)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const key = weekStart.toISOString().substring(0, 10)
    weekCounts.set(key, (weekCounts.get(key) || 0) + 1)
  }
  const sortedWeeks = [...weekCounts.entries()].sort()
  lines.push(`| Week Starting | Count |`)
  lines.push(`|---------------|------:|`)
  for (const [week, count] of sortedWeeks) {
    lines.push(`| ${week} | ${count} |`)
  }
  lines.push(``)

  // Action items summary
  lines.push(`## Recommended Next Steps`)
  lines.push(``)
  lines.push(`1. **Review URGENT emails immediately** — these may have deadlines or require responses`)
  lines.push(`2. **Contact top recurring senders** — they may be expecting continued communication from this role`)
  lines.push(`3. **Review Banking & Treasury** — ensure all banking relationships and access are transferred`)
  lines.push(`4. **Check Payroll & Tax** — verify recurring payroll runs and upcoming tax deadlines`)
  lines.push(`5. **Audit Invoices/AP/AR** — identify outstanding invoices that need payment or follow-up`)
  lines.push(`6. **Review Month-End/Reporting** — determine what recurring reports April was responsible for`)
  lines.push(`7. **Check Insurance** — verify all policies, renewals, and COI requests are handled`)
  lines.push(``)

  return lines.join('\n')
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nVault Export Parser`)
  console.log(`===================`)
  console.log(`Metadata: ${METADATA_FILE}`)
  console.log(`MBOX: ${MBOX_FILE || 'not found'}`)
  console.log(`Date range: Dec 15, 2025 — Mar 31, 2026\n`)

  // Load and filter metadata
  console.log('1. Loading metadata...')
  const records = await loadMetadata()
  console.log(`   ${records.length} emails in date range (after spam filter)\n`)

  // Sort by date
  records.sort((a, b) => (b.dateSent || b.dateReceived).localeCompare(a.dateSent || a.dateReceived))

  // Save all records
  console.log('2. Saving categorized data...')
  const outputDir = EXPORT_DIR
  fs.writeFileSync(path.join(outputDir, 'all-emails.json'), JSON.stringify(records, null, 2))
  console.log(`   all-emails.json (${records.length} records)`)

  // Save by category
  const catDir = path.join(outputDir, 'by-category')
  fs.mkdirSync(catDir, { recursive: true })
  const byCategory = new Map<string, EmailRecord[]>()
  for (const r of records) {
    const list = byCategory.get(r.category) || []
    list.push(r)
    byCategory.set(r.category, list)
  }
  for (const [cat, emails] of byCategory) {
    const fn = cat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '') + '.json'
    fs.writeFileSync(path.join(catDir, fn), JSON.stringify(emails, null, 2))
    console.log(`   by-category/${fn} (${emails.length})`)
  }

  // Generate report
  console.log('\n3. Generating handoff report...')
  const report = generateReport(records)
  fs.writeFileSync(path.join(outputDir, 'HANDOFF-REPORT.md'), report)
  console.log(`   HANDOFF-REPORT.md`)

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('COMPLETE')
  console.log('='.repeat(60))
  console.log(`Total emails: ${records.length}`)
  const dates = records.map(r => r.dateSent || r.dateReceived).filter(Boolean).sort()
  console.log(`Date range: ${dates[dates.length - 1]?.substring(0, 10)} to ${dates[0]?.substring(0, 10)}`)
  console.log()
  console.log('By category:')
  for (const [cat, emails] of [...byCategory.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${emails.length.toString().padStart(5)}  ${cat}`)
  }
  console.log()
  console.log(`Output: ${outputDir}/`)
  console.log(`Report: ${outputDir}/HANDOFF-REPORT.md`)
  console.log()
  console.log('Share HANDOFF-REPORT.md with Mark and Paul.')
}

main().catch(err => {
  console.error('\nFATAL ERROR:', err.message)
  process.exit(1)
})
