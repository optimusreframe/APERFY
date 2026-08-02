import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Section, Img } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'APERFY'
const LOGO_URL = 'https://fyqcbkfzyjgddmqupdfr.supabase.co/storage/v1/object/public/email-assets/logo.png'

interface Props { customerName?: string; orderId?: string; total?: string }

const Email = ({ customerName, orderId, total }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Payment received for order #{orderId?.slice(0, 8).toUpperCase()}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}><Img src={LOGO_URL} alt={SITE_NAME} width="160" height="auto" style={{ margin: '0 auto' }} /></Section>
        <Section style={card}>
          <Heading style={h1}>Payment Received 💰</Heading>
          <Text style={text}>{customerName ? `Hi ${customerName},` : 'Hi,'} we've successfully received your payment for order <strong style={{ color: '#fff' }}>#{orderId?.slice(0, 8).toUpperCase()}</strong>.</Text>
          {total && <Text style={text}>Amount: <strong style={{ color: '#D4A017' }}>${total}</strong></Text>}
          <Text style={text}>Your order will now move forward in our production queue. Thank you for your purchase!</Text>
          <Text style={footer}>— The {SITE_NAME} Team</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => `Payment Received — Order #${(data.orderId || '').slice(0, 8).toUpperCase()}`,
  displayName: 'Payment Received',
  previewData: { customerName: 'John', orderId: 'abc12345-xxxx', total: '49.99' },
} satisfies TemplateEntry

const gold = '#D4A017'
const main = { backgroundColor: '#0A0A0F', fontFamily: "'Arial', sans-serif", padding: '40px 0' }
const container = { maxWidth: '600px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '24px' }
const card = { backgroundColor: '#13131A', border: `1px solid ${gold}33`, borderRadius: '16px', padding: '40px 32px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }
const h1 = { color: '#ffffff', fontSize: '24px', fontWeight: 'bold', margin: '0 0 16px', textAlign: 'center' as const }
const text = { color: '#A0A0AB', fontSize: '15px', lineHeight: '24px', margin: '0 0 16px' }
const footer = { color: '#666670', fontSize: '13px', margin: '24px 0 0' }
