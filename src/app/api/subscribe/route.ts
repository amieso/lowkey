import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { WelcomeEmail } from '@/emails/welcome'

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY
  const audienceId = process.env.RESEND_AUDIENCE_ID

  if (!apiKey || !audienceId) {
    console.error('Missing RESEND_API_KEY or RESEND_AUDIENCE_ID')
    return NextResponse.json({ error: 'Newsletter not configured' }, { status: 500 })
  }

  const { email } = await request.json()

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const resend = new Resend(apiKey)

  console.log('Creating contact for:', email)
  const { data: contactData, error } = await resend.contacts.create({
    audienceId,
    email,
  })
  console.log('Contact result:', { contactData, error })

  if (error) {
    if (error.message?.includes('already exists')) {
      console.log('Contact already exists, returning success')
      return NextResponse.json({ success: true })
    }
    console.error('Resend error:', error)
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
  }

  console.log('Sending welcome email to:', email)
  const { data: emailData, error: emailError } = await resend.emails.send({
    from: 'lowkey <onboarding@resend.dev>',
    to: email,
    subject: 'welcome to lowkey',
    react: WelcomeEmail({ email }),
  })
  console.log('Email result:', { emailData, emailError })

  return NextResponse.json({ success: true })
}
