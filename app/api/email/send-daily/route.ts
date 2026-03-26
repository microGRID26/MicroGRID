import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'
import { getTemplate, getMaxDay } from '@/lib/email-templates'

// Supabase admin client for server-side cron (no user auth)
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key)
}

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getAdminClient()
    const today = new Date().toISOString().slice(0, 10)

    // Load all active (non-paused, non-completed) enrollments
    const { data: enrollments, error } = await supabase
      .from('email_onboarding')
      .select('*')
      .eq('paused', false)
      .eq('completed', false)

    if (error) {
      console.error('[send-daily] query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No active enrollments' })
    }

    let sent = 0
    let skipped = 0
    let completed = 0
    const errors: string[] = []

    for (const enrollment of enrollments) {
      // Don't double-send: skip if last_sent_at is already today
      if (enrollment.last_sent_at) {
        const lastDate = new Date(enrollment.last_sent_at).toISOString().slice(0, 10)
        if (lastDate === today) {
          skipped++
          continue
        }
      }

      const nextDay = (enrollment.current_day || 0) + 1

      // If past max day, mark completed
      if (nextDay > getMaxDay()) {
        await supabase
          .from('email_onboarding')
          .update({ completed: true })
          .eq('id', enrollment.id)
        completed++
        continue
      }

      const template = getTemplate(nextDay, enrollment.user_name || 'there')
      if (!template) {
        errors.push(`No template for day ${nextDay}`)
        continue
      }

      const ok = await sendEmail(enrollment.user_email, template.subject, template.html)

      if (ok) {
        await supabase
          .from('email_onboarding')
          .update({
            current_day: nextDay,
            last_sent_at: new Date().toISOString(),
            completed: nextDay >= getMaxDay(),
          })
          .eq('id', enrollment.id)
        sent++
        if (nextDay >= getMaxDay()) completed++
      } else {
        errors.push(`Failed to send to ${enrollment.user_email}`)
      }
    }

    return NextResponse.json({
      sent,
      skipped,
      completed,
      errors: errors.length > 0 ? errors : undefined,
      total: enrollments.length,
    })
  } catch (err) {
    console.error('[send-daily] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
