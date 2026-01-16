import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components'

const LOGO_URL = 'https://lowkxy.vercel.app/logo.png'

export function WelcomeEmail() {
  return (
    <Html>
      <Head />
      <Preview>welcome to lowkey</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Img src={LOGO_URL} width="100" height="28" alt="lowkey" />
          </Section>

          <Text style={heading}>you're in</Text>

          <Text style={paragraph}>
            thanks for subscribing. we'll send you an email when we add new videos to the collection.
          </Text>

          <Text style={paragraph}>
            in the meantime, check out the latest launch videos from top companies.
          </Text>

          <Text style={signature}>— the lowkey team</Text>

          <Section style={footer}>
            <Text style={footerText}>
              you're receiving this because you signed up at lowkey.so
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const container = { margin: '0 auto', padding: '40px 20px', maxWidth: '480px' }
const logoSection = { marginBottom: '32px' }
const heading = { fontSize: '24px', fontWeight: '500', color: '#0a0a0a', margin: '0 0 24px 0' }
const paragraph = { fontSize: '15px', lineHeight: '1.6', color: '#525252', margin: '0 0 16px 0' }
const signature = { fontSize: '15px', color: '#525252', margin: '32px 0 0 0' }
const footer = { marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #e5e5e5' }
const footerText = { fontSize: '12px', color: '#a1a1a1', margin: '0' }

export default WelcomeEmail
