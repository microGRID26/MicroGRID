#!/usr/bin/env npx tsx
/**
 * generate-action-plan.ts — Convert email analysis into actionable work items
 *
 * Reads the categorized emails and generates:
 * 1. Prioritized task list (TODAY / THIS WEEK / THIS MONTH / ONGOING)
 * 2. System access transfer checklist
 * 3. Recurring responsibilities calendar
 * 4. Vendor/contact notification list
 * 5. Open thread tracker (emails awaiting response)
 */

import * as fs from 'fs'
import * as path from 'path'

const EXPORT_DIR = path.join(__dirname, '..', 'email-export', 'ayarborough')

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

// Load all emails
const allEmails: EmailRecord[] = JSON.parse(fs.readFileSync(path.join(EXPORT_DIR, 'all-emails.json'), 'utf-8'))

// ── Helper: find threads (emails with same subject root) ────────────────────

function normalizeSubject(s: string): string {
  return s.replace(/^(re|fw[d]?|fwd):\s*/gi, '').trim().toLowerCase()
}

function findThreads(): Map<string, EmailRecord[]> {
  const threads = new Map<string, EmailRecord[]>()
  for (const e of allEmails) {
    const key = normalizeSubject(e.subject)
    if (!key) continue
    const list = threads.get(key) || []
    list.push(e)
    threads.set(key, list)
  }
  return threads
}

// ── Detect open items (sent TO external parties awaiting response, or received needing action) ──

function detectActionItems(): { today: string[]; thisWeek: string[]; thisMonth: string[]; ongoing: string[] } {
  const today: string[] = []
  const thisWeek: string[] = []
  const thisMonth: string[] = []
  const ongoing: string[] = []

  // 1. IRS / Tax deadlines
  const taxEmails = allEmails.filter(e => e.category === 'Tax & Compliance' || /1099|tax|irs|filing/i.test(e.subject))
  if (taxEmails.some(e => /deadline|march 31|last day|last chance/i.test(e.subject))) {
    today.push('**IRS 1099 FILING** — March 31 deadline is TODAY. Check Tax1099 platform (chris@tax1099.com) for status. Were all 1099-NECs filed? Log into tax1099.com immediately.')
  }
  if (taxEmails.some(e => /business tax extension|business return/i.test(e.subject))) {
    today.push('**BUSINESS TAX EXTENSION** — March 16 was the extension deadline. Verify with CPA (scott.lawrence@btcpa.net at BT CPA) that the extension was filed.')
  }
  if (taxEmails.some(e => /irs.*information request/i.test(e.subject))) {
    thisWeek.push('**IRS INFORMATION REQUEST** — January email thread with cpalou@bullocklaw.com (Bullock Law) about urgent IRS request. Verify this was resolved. If not, contact attorney immediately.')
  }

  // 2. Past due accounts
  const pastDue = allEmails.filter(e => /past due|overdue|delinquent/i.test(e.subject))
  for (const e of pastDue) {
    const date = (e.dateSent || e.dateReceived).substring(0, 10)
    if (/corporate.?traveler|USFC/i.test(e.subject)) {
      today.push(`**CORPORATE TRAVELER $81,245.13 OVERDUE** — Contact megan.schaedel@corporatetraveler.us immediately. This is a large outstanding balance from Jan statement.`)
    } else if (/trismart solar llc.*past due/i.test(e.subject) && e.fromEmail !== 'ayarborough@trismartsolar.com') {
      thisWeek.push(`**PAST DUE NOTICE** (${date}) — "${e.subject}" from ${e.fromEmail}. Determine amount and status.`)
    }
  }

  // 3. Failed payments
  const failedPayments = allEmails.filter(e => /failed|unsuccessful|declined/i.test(e.subject))
  const uniqueFailures = new Map<string, EmailRecord>()
  for (const e of failedPayments) {
    const key = normalizeSubject(e.subject).substring(0, 40)
    if (!uniqueFailures.has(key)) uniqueFailures.set(key, e)
  }
  for (const [, e] of uniqueFailures) {
    if (/saasant/i.test(e.subject)) {
      thisWeek.push('**SAASANT PAYMENT FAILING** — $300/mo subscription payment to SaasAnt Inc failing repeatedly since March 24. Update payment method or cancel if no longer needed.')
    } else if (/divvy|bill\.com/i.test(e.subject)) {
      thisWeek.push('**BILL.COM DIVVY CARD DECLINED** — Corporate card payments failing. Check card status and funding in BILL.com.')
    } else if (/perplexity/i.test(e.subject)) {
      thisMonth.push(`**Perplexity AI payment failing** — Check if this subscription is still needed.`)
    }
  }

  // 4. Unpaid invoices TO TriSMART
  if (allEmails.some(e => /cherry bekaert.*unpaid/i.test(e.subject))) {
    thisWeek.push('**CHERRY BEKAERT (CPA firm) UNPAID INVOICES** — invoicing@cbh.com sent unpaid invoice notice on 3/23. Pay or dispute immediately — this is your CPA/audit firm.')
  }

  // 5. Cease services threat
  if (allEmails.some(e => /cease services|solutioncx/i.test(e.subject))) {
    today.push('**SOLUTIONCX THREATENING SERVICE CUTOFF** — Mark forwarded email about deadline payment dates and cease notice on 1/8. Verify current status — are they still providing service?')
  }

  // 6. BILL.com approvals piling up
  const billcomApprovals = allEmails.filter(e => /needs your approval/i.test(e.subject) && /bill\.com|hq\.bill/i.test(e.fromEmail))
  if (billcomApprovals.length > 20) {
    today.push(`**${billcomApprovals.length} BILL.COM INVOICES PENDING APPROVAL** — Vendor bills have been piling up without approval. Log into BILL.com and review all pending. Key vendors: Sunbelt Rentals, Platinum Copier, Parks Coffee, Kingbee Rentals, Lease Direct, TX Circle 182.`)
  }

  // 7. Solrite contract issues
  if (allEmails.some(e => /cancellation notice/i.test(e.subject) && /solrite/i.test(e.fromEmail))) {
    thisWeek.push('**SOLRITE ENERGY CONTRACT CANCELLATION** — Installation partner contract cancellation notice (3/26). Review FD_17529 - Jun Balita case and determine if action needed.')
  }

  // 8. Bank / ACH items
  if (allEmails.some(e => /reinstate ach/i.test(e.subject))) {
    thisWeek.push('**ACH ORIGINATION SERVICE** — Thread from Dec about reinstating ACH for TriSMART Solar at Stellar Bank. jwilson1@trismartsolar.com marked it complete. Verify ACH is working.')
  }

  // 9. Positive Pay monitoring
  ongoing.push('**STELLAR BANK POSITIVE PAY** — Daily notifications from Notifications@stellar.bank. Someone must monitor these daily for check fraud exceptions. Currently going to April\'s inbox unread.')

  // 10. BILL.com to-do lists
  ongoing.push('**BILL.COM DAILY TO-DO LISTS** — TriSMART receives daily to-do lists and payment notifications from BILL.com. These need to be redirected to the new finance contact.')

  // 11. Cash flow meetings
  if (allEmails.some(e => /cash flow/i.test(e.subject) && /calendar|invitation/i.test(e.subject))) {
    thisWeek.push('**CASH FLOW MEETINGS** — dsanchez@trismartsolar.com was running Cash Flow meetings with April (weekly Fridays 12:30 PM). Notify Diana Sanchez about the change and who will attend going forward.')
  }

  // 12. EverBright milestone digest
  ongoing.push('**EVERBRIGHT MILESTONE DEADLINES** — Weekly digest from no-reply@goeverbright.com tracking funding milestone deadlines. Redirect to appropriate person.')

  // 13. NetSuite OOPS alerts
  ongoing.push('**NETSUITE BACKDATED TRANSACTION ALERTS** — Automated "OOPS Transactions Entered After EOM" searches still running. These monitor for backdated entries after month-end close. Determine if still relevant or if NetSuite is no longer used.')

  // 14. HDM Capital
  if (allEmails.filter(e => /hdmcap/i.test(e.fromEmail)).length > 0) {
    thisMonth.push('**HDM CAPITAL RELATIONSHIP** — admin@hdmcap.com and hdmcap.com contacts (16 emails). This appears to be a capital/funding partner. Ensure Mark or Paul take over this relationship.')
  }

  // 15. Financial statements
  if (allEmails.some(e => /financials.*submit/i.test(e.subject))) {
    thisMonth.push('**FINANCIAL STATEMENT SUBMISSIONS** — pchristodoulou@trismartsolar.com was requesting financials through 11.2025. Verify who is preparing monthly financial packages now.')
  }

  // 16. Frontline Smart Security past due
  if (allEmails.some(e => /frontline smart security.*past due/i.test(e.subject))) {
    thisWeek.push('**FRONTLINE SMART SECURITY PAST DUE** — Outstanding balance flagged in late December by tpratt@trismartsolar.com. Verify if resolved.')
  }

  // 17. Enterprise vehicle damage claims
  const enterpriseClaims = allEmails.filter(e => /enterprise.*claim|damage.*claim/i.test(e.subject))
  if (enterpriseClaims.length > 3) {
    thisMonth.push(`**ENTERPRISE RENTAL CAR DAMAGE CLAIMS** — ${enterpriseClaims.length} open damage claims with Enterprise. Claims: #23585604, #23540329, #23512454, #23664937, #23309919, #23300231. These need resolution.`)
  }

  // 18. CoachHub overdue
  if (allEmails.some(e => /coachub.*overdue/i.test(e.subject))) {
    thisWeek.push('**COACHUB INC OVERDUE INVOICE** — Forwarded by info@pcolle.com on 3/12 referencing Mark Bench. Review and pay or dispute.')
  }

  // 19. Regge Meyer funding dates
  const reggeEmails = allEmails.filter(e => /reggemeyer/i.test(e.fromEmail))
  if (reggeEmails.length > 20) {
    ongoing.push(`**FUNDING DATE TRACKING** — reggemeyer@trismartsolar.com sent ${reggeEmails.length} emails about RIC, EIC, PTO date modifications. This is active funding milestone work that needs to continue.`)
  }

  // 20. Insurance premium financing
  if (allEmails.some(e => /afco insurance premium/i.test(e.subject))) {
    thisMonth.push('**AFCO INSURANCE PREMIUM FINANCING** — Bill pending approval in BILL.com for insurance premium financing. Review and approve/reject.')
  }

  // 21. Prologis lease
  if (allEmails.some(e => /prologis.*operating expense/i.test(e.subject))) {
    thisMonth.push('**PROLOGIS LEASE RECONCILIATION** — Operating expense reconciliation from cmyer@prologis.com for Lease ID t0020425. This is likely an office/warehouse lease. Review and respond.')
  }

  // 22. 1099 for 2025 thread with Greg Gariety
  if (allEmails.some(e => /1099 for 2025/i.test(e.subject) && /gariety/i.test(e.fromEmail))) {
    thisWeek.push('**1099 FOR GREG GARIETY** — Active thread with greg.gariety@gmail.com and dsanchez about 2025 1099. Ensure this was issued correctly.')
  }

  return { today, thisWeek, thisMonth, ongoing }
}

// ── Detect systems/accounts that need access transfer ───────────────────────

function detectSystems(): string[] {
  const systems: string[] = []
  const senderDomains = new Map<string, number>()
  for (const e of allEmails) {
    const domain = e.fromEmail.split('@')[1]?.toLowerCase()
    if (domain) senderDomains.set(domain, (senderDomains.get(domain) || 0) + 1)
  }

  systems.push('**Stellar Bank** — Primary business bank. Daily Positive Pay, ACH reporting, statements. Contact bank to transfer authorized users. (47 emails from notifications@stellar.bank)')
  systems.push('**BILL.com** — AP/AR platform. Vendor bill approvals, payments, Divvy corporate card. Transfer admin access. (155+ emails from hq.bill.com)')
  systems.push('**Capital One** — Corporate credit cards and transfers. Update authorized users. (36+ emails)')
  systems.push('**Tax1099** — 1099/W-2 e-filing platform. Transfer account ownership. (chris@tax1099.com)')
  systems.push('**NetSuite** — ERP system (may be deprecated). Still sending automated month-end alerts. (14 emails from system@sent-via.netsuite.com)')
  systems.push('**QuickBooks (Intuit)** — Bookkeeping. Transfer access. (10 emails from quickbooks@notification.intuit.com)')
  systems.push('**PayPal** — Business payments. Transfer authorized user. (9+ emails from service@paypal.com)')
  systems.push('**EverBright** — Solar financing platform. Weekly milestone digest. Transfer notifications. (no-reply@goeverbright.com)')
  systems.push('**Solrite Energy** — Installation partner portal. Transfer contact. (148 emails from no-reply@solriteenergy.com)')
  systems.push('**BambooHR** — HR/payroll platform. Transfer admin access if applicable. (email@news.bamboohr.com)')
  systems.push('**Gusto** — Payroll platform. Transfer admin access. (advisor@gusto.com)')
  systems.push('**SaasAnt** — NetSuite/accounting tool. $300/mo subscription — cancel or transfer. (Stripe billing)')
  systems.push('**Cherry Bekaert** — External CPA/audit firm. Notify of contact change. (invoicing@cbh.com)')
  systems.push('**BT CPA (scott.lawrence@btcpa.net)** — Tax advisor. Notify of contact change.')
  systems.push('**Bullock Law (cpalou@bullocklaw.com)** — Legal counsel (IRS matters). Notify of contact change.')
  systems.push('**Otter.ai** — Meeting transcription (used for Cash Flow meetings). Cancel or transfer.')
  systems.push('**Adobe** — Likely used for document signing/PDF. Check subscription.')
  systems.push('**Stripe** — Payment processing (billing SaasAnt through April\'s account). Update billing contact.')

  return systems
}

// ── Detect recurring responsibilities ───────────────────────────────────────

function detectRecurring(): string[] {
  const recurring: string[] = []

  recurring.push('**DAILY** — Monitor Stellar Bank Positive Pay exceptions (notifications@stellar.bank)')
  recurring.push('**DAILY** — Review BILL.com to-do list and approve/reject vendor bills')
  recurring.push('**DAILY** — Process ACH reports from Stellar Bank')
  recurring.push('**WEEKLY** — Attend Cash Flow meeting (Fridays 12:30 PM CDT, organized by dsanchez)')
  recurring.push('**WEEKLY** — Review EverBright Milestone Deadline Digest')
  recurring.push('**WEEKLY** — Review RIC/EIC/PTO date modifications from reggemeyer')
  recurring.push('**WEEKLY** — Review NetSuite "OOPS Backdated Transactions" alerts (if still applicable)')
  recurring.push('**MONTHLY** — Month-end close process and financial statement preparation')
  recurring.push('**MONTHLY** — Capital One credit card payment scheduling')
  recurring.push('**MONTHLY** — Insurance premium payments (via AFCO/BILL.com)')
  recurring.push('**QUARTERLY** — Estimated tax payments / quarterly tax filings')
  recurring.push('**QUARTERLY** — Financial statement submissions (requested by pchristodoulou)')
  recurring.push('**ANNUALLY** — 1099-NEC filing (Jan 31 deadline) via Tax1099')
  recurring.push('**ANNUALLY** — Business tax return filing / extension (March 15/16)')
  recurring.push('**ANNUALLY** — W-2 filing')
  recurring.push('**AS NEEDED** — Enterprise rental car damage claim processing')
  recurring.push('**AS NEEDED** — Certificate of Insurance (COI) requests')
  recurring.push('**AS NEEDED** — Vendor bill coding and approval in BILL.com')

  return recurring
}

// ── Key contacts to notify ──────────────────────────────────────────────────

function getContactNotifications(): string[] {
  const contacts: string[] = []

  contacts.push('**dsanchez@trismartsolar.com (Diana Sanchez)** — Works closely with April on Cash Flow, banking, 1099s. Highest priority — she likely knows what\'s in flight.')
  contacts.push('**reggemeyer@trismartsolar.com (Regge Meyer)** — Sends daily funding milestone updates. Needs to know new finance contact.')
  contacts.push('**mark@trismartsolar.com / mark@benchlegacy.com (Mark Bench)** — CEO, was CC\'d on urgent items. Already aware of situation.')
  contacts.push('**pchristodoulou@trismartsolar.com** — Requested financial statements. Needs to know new contact for monthly packages.')
  contacts.push('**dlrivera@trismartsolar.com** — Involved in month-end reporting. Loop in on transition.')
  contacts.push('**scott.lawrence@btcpa.net (BT CPA)** — External tax advisor. Notify of new point of contact for tax matters.')
  contacts.push('**cpalou@bullocklaw.com (Bullock Law)** — Handled IRS information request. Verify resolution and notify of contact change.')
  contacts.push('**admin@hdmcap.com (HDM Capital)** — Capital/funding partner. Transfer relationship to Mark or Paul.')
  contacts.push('**chris@tax1099.com (Tax1099)** — 1099 filing platform support. May need help accessing account.')
  contacts.push('**megan.schaedel@corporatetraveler.us** — $81K overdue balance. Needs immediate response.')
  contacts.push('**accounting@trismartsolar.com** — Shared accounting inbox April was managing. Verify who else has access.')
  contacts.push('**payroll@trismartsolar.com** — Shared payroll inbox. Verify who else has access.')
  contacts.push('**invoicing@cbh.com (Cherry Bekaert)** — CPA firm with unpaid invoices. Pay and notify of contact change.')
  contacts.push('**cmyer@prologis.com** — Lease reconciliation for warehouse/office. Respond to operating expense review.')
  contacts.push('**no-reply@solriteenergy.com (Solrite Energy)** — 148 emails, installation partner contracts. Verify who manages this relationship now.')

  return contacts
}

// ── Generate Action Plan Document ───────────────────────────────────────────

function generateActionPlan(): string {
  const items = detectActionItems()
  const systems = detectSystems()
  const recurring = detectRecurring()
  const contacts = getContactNotifications()

  const lines: string[] = []

  lines.push(`# ACTION PLAN: Finance Department Transition`)
  lines.push(`## April Yarborough — Senior Accountant Departure`)
  lines.push(``)
  lines.push(`**Date:** ${new Date().toISOString().substring(0, 10)}`)
  lines.push(`**Prepared for:** Mark (CEO), Paul (CFO)`)
  lines.push(`**Source:** 2,553 emails analyzed from Dec 15, 2025 — Mar 31, 2026`)
  lines.push(`**Critical note:** Both April and her manager (mstephens) are no longer with the company.`)
  lines.push(``)
  lines.push(`---`)
  lines.push(``)

  // TODAY
  lines.push(`## 🔴 DO TODAY (${items.today.length} items)`)
  lines.push(``)
  for (let i = 0; i < items.today.length; i++) {
    lines.push(`${i + 1}. ${items.today[i]}`)
    lines.push(``)
  }

  // THIS WEEK
  lines.push(`## 🟡 DO THIS WEEK (${items.thisWeek.length} items)`)
  lines.push(``)
  for (let i = 0; i < items.thisWeek.length; i++) {
    lines.push(`${i + 1}. ${items.thisWeek[i]}`)
    lines.push(``)
  }

  // THIS MONTH
  lines.push(`## 🔵 DO THIS MONTH (${items.thisMonth.length} items)`)
  lines.push(``)
  for (let i = 0; i < items.thisMonth.length; i++) {
    lines.push(`${i + 1}. ${items.thisMonth[i]}`)
    lines.push(``)
  }

  // ONGOING
  lines.push(`## ♻️ ONGOING RESPONSIBILITIES (${items.ongoing.length} items)`)
  lines.push(``)
  lines.push(`These are recurring tasks that April was handling. Each needs to be assigned to someone:`)
  lines.push(``)
  for (let i = 0; i < items.ongoing.length; i++) {
    lines.push(`${i + 1}. ${items.ongoing[i]}`)
    lines.push(``)
  }

  // RECURRING CALENDAR
  lines.push(`---`)
  lines.push(``)
  lines.push(`## 📅 Recurring Responsibilities Calendar`)
  lines.push(``)
  lines.push(`These are the regular tasks April performed. Assign each to the appropriate person:`)
  lines.push(``)
  for (const r of recurring) {
    lines.push(`- ${r}`)
  }
  lines.push(``)

  // SYSTEMS
  lines.push(`---`)
  lines.push(``)
  lines.push(`## 🔐 Systems & Account Access to Transfer`)
  lines.push(``)
  lines.push(`April had active accounts on all of these platforms. For each:`)
  lines.push(`1. Log in (reset password via admin if needed)`)
  lines.push(`2. Add new authorized user`)
  lines.push(`3. Transfer ownership/admin rights`)
  lines.push(`4. Update billing contact if applicable`)
  lines.push(``)
  for (let i = 0; i < systems.length; i++) {
    lines.push(`${i + 1}. ${systems[i]}`)
  }
  lines.push(``)

  // CONTACTS
  lines.push(`---`)
  lines.push(``)
  lines.push(`## 📞 People to Notify`)
  lines.push(``)
  lines.push(`These contacts communicated regularly with April and need to know who to contact going forward:`)
  lines.push(``)
  for (let i = 0; i < contacts.length; i++) {
    lines.push(`${i + 1}. ${contacts[i]}`)
  }
  lines.push(``)

  // FIRST 48 HOURS CHECKLIST
  lines.push(`---`)
  lines.push(``)
  lines.push(`## ✅ First 48 Hours Checklist`)
  lines.push(``)
  lines.push(`### Paul (CFO) — Finance Operations`)
  lines.push(`- [ ] Log into BILL.com and approve/reject all pending vendor bills (${allEmails.filter(e => /needs your approval/i.test(e.subject)).length}+ pending)`)
  lines.push(`- [ ] Log into Stellar Bank — review Positive Pay exceptions and ACH reports`)
  lines.push(`- [ ] Check Tax1099 — were all 2025 1099-NECs filed before today's deadline?`)
  lines.push(`- [ ] Call Corporate Traveler (megan.schaedel) about $81,245.13 balance`)
  lines.push(`- [ ] Call Cherry Bekaert (invoicing@cbh.com) — pay outstanding invoices`)
  lines.push(`- [ ] Verify SolutionCX status — were they paid? Are services still active?`)
  lines.push(`- [ ] Review all failed payments (SaasAnt, BILL Divvy Card, Perplexity)`)
  lines.push(`- [ ] Contact Diana Sanchez (dsanchez) — she knows what's in flight`)
  lines.push(`- [ ] Set up email forwarding from ayarborough@trismartsolar.com to Paul or new finance hire`)
  lines.push(``)
  lines.push(`### Mark (CEO) — Strategic & External`)
  lines.push(`- [ ] Notify HDM Capital (admin@hdmcap.com) of new finance contact`)
  lines.push(`- [ ] Verify IRS Information Request from January was resolved (contact Bullock Law)`)
  lines.push(`- [ ] Notify BT CPA (scott.lawrence@btcpa.net) of contact change`)
  lines.push(`- [ ] Review Prologis lease reconciliation`)
  lines.push(`- [ ] Determine which subscriptions to cancel vs transfer (SaasAnt, Otter.ai, etc.)`)
  lines.push(`- [ ] Review Enterprise damage claims — assign to operations`)
  lines.push(`- [ ] Decide on Solrite Energy contract cancellation (FD_17529)`)
  lines.push(``)

  // EMAIL FORWARDING
  lines.push(`---`)
  lines.push(``)
  lines.push(`## 📧 Email Forwarding Setup`)
  lines.push(``)
  lines.push(`**Immediately set up email forwarding** so nothing falls through the cracks:`)
  lines.push(``)
  lines.push(`1. Go to admin.google.com → Users → April Yarborough → EMAIL`)
  lines.push(`2. Set up email routing/forwarding to Paul's email`)
  lines.push(`3. Also check/forward: accounting@trismartsolar.com, payroll@trismartsolar.com`)
  lines.push(``)
  lines.push(`**Shared mailboxes April likely had access to:**`)
  lines.push(`- accounting@trismartsolar.com`)
  lines.push(`- payroll@trismartsolar.com`)
  lines.push(``)
  lines.push(`---`)
  lines.push(``)
  lines.push(`*Generated from 2,553 emails spanning Dec 15, 2025 — Mar 31, 2026.*`)
  lines.push(`*Per-category email JSON files available in email-export/ayarborough/by-category/ for deep dive.*`)
  lines.push(`*Full email archive (MBOX) available for search if specific emails need to be located.*`)

  return lines.join('\n')
}

// ── Main ────────────────────────────────────────────────────────────────────

const plan = generateActionPlan()
fs.writeFileSync(path.join(EXPORT_DIR, 'ACTION-PLAN.md'), plan)
console.log(`Action plan generated: ${path.join(EXPORT_DIR, 'ACTION-PLAN.md')}`)
console.log(`\nSummary:`)

const items = detectActionItems()
console.log(`  🔴 DO TODAY:      ${items.today.length} items`)
console.log(`  🟡 THIS WEEK:     ${items.thisWeek.length} items`)
console.log(`  🔵 THIS MONTH:    ${items.thisMonth.length} items`)
console.log(`  ♻️  ONGOING:       ${items.ongoing.length} items`)
console.log(`  🔐 Systems:       ${detectSystems().length} platforms to transfer`)
console.log(`  📞 Contacts:      ${getContactNotifications().length} people to notify`)
