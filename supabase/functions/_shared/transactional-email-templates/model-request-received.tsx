import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Section, Img } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'APERFY'
const LOGO_URL = 'https://fyqcbkfzyjgddmqupdfr.supabase.co/storage/v1/object/public/email-assets/logo.png'

interface Props { customerName?: string; productName?: string }

const Email = ({ customerName, productName }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We received your custom product request!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}><Img src={LOGO_URL} alt={SITE_NAME} width="160" height="auto" style={{ margin: '0 auto' }} /></Section>
        <Section style={card}>
          <Heading style={h1}>Request Received! 🎨</Heading>
          <Text style={text}>{customerName ? `Hi ${customerName},` : 'Hi,'} thank you for submitting your custom product request{productName ? ` for "${productName}"` : ''}!</Text>
          <Text style={text}>Our team will review your request and get back to you as soon as possible. We may reach out for additional details or clarification.</Text>
          <Text style={text}>We're excited to bring your idea to life with premium curated shopping!</Text>
          <Text style={footer}>— The {SITE_NAME} Team</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'We received your custom product request!',
  displayName: 'Product Request Received',
  previewData: { customerName: 'Jane', productName: 'Custom Dragon Figurine' },
} satisfies TemplateEntry

const gold = '#D4A017'
const main = { backgroundColor: '#0A0A0F', fontFamily: "'Arial', sans-serif", padding: '40px 0' }
const container = { maxWidth: '600px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '24px' }
const card = { backgroundColor: '#13131A', border: `1px solid ${gold}33`, borderRadius: '16px', padding: '40px 32px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }
const h1 = { color: '#ffffff', fontSize: '24px', fontWeight: 'bold', margin: '0 0 16px', textAlign: 'center' as const }
const text = { color: '#A0A0AB', fontSize: '15px', lineHeight: '24px', margin: '0 0 16px' }
const footer = { color: '#666670', fontSize: '13px', margin: '24px 0 0' }
