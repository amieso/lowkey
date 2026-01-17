import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { WelcomeEmail } from '@/emails/welcome'

const emailSchema = z.string().email()

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY
  const audienceId = process.env.RESEND_AUDIENCE_ID

  if (!apiKey || !audienceId) {
    console.error('Missing RESEND_API_KEY or RESEND_AUDIENCE_ID')
    return NextResponse.json({ error: 'Newsletter not configured' }, { status: 500 })
  }

  const { email } = await request.json()

  const result = emailSchema.safeParse(email)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const resend = new Resend(apiKey)

  const { error } = await resend.contacts.create({
    audienceId,
    email,
  })

  if (error) {
    if (error.message?.includes('already exists')) {
      return NextResponse.json({ success: true })
    }
    console.error('Resend error:', error)
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
  }

  const { error: sendError } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'lowkey <onboarding@resend.dev>',
    to: email,
    subject: 'welcome to lowkey',
    react: WelcomeEmail({ email }),
  })

  if (sendError) {
    console.error('Resend send error:', sendError)
    // Still return success - contact was added, just email failed
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ success: true })
}
