import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Section, Img } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = '3DtoPrint'
const LOGO_URL = 'https://fyqcbkfzyjgddmqupdfr.supabase.co/storage/v1/object/public/email-assets/logo.png'

interface Props { customerName?: string; orderId?: string }

const Email = ({ customerName, orderId }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your order has been shipped!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}><Img src={LOGO_URL} alt={SITE_NAME} width="160" height="auto" style={{ margin: '0 auto' }} /></Section>
        <Section style={card}>
          <Heading style={h1}>Order Shipped 📦</Heading>
          <Text style={text}>{customerName ? `Hi ${customerName},` : 'Hi,'} your order <strong style={{ color: '#fff' }}>#{orderId?.slice(0, 8).toUpperCase()}</strong> is on its way!</Text>
          <Text style={text}>Your package has been handed off to the shipping carrier. You should receive it within the estimated delivery window. Keep an eye out!</Text>
          <Text style={footer}>— The {SITE_NAME} Team</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => `Order #${(data.orderId || '').slice(0, 8).toUpperCase()} — Shipped!`,
  displayName: 'Order Shipped',
  previewData: { customerName: 'John', orderId: 'abc12345-xxxx' },
} satisfies TemplateEntry

const gold = '#D4A017'
const main = { backgroundColor: '#0A0A0F', fontFamily: "'Arial', sans-serif", padding: '40px 0' }
const container = { maxWidth: '600px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '24px' }
const card = { backgroundColor: '#13131A', border: `1px solid ${gold}33`, borderRadius: '16px', padding: '40px 32px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }
const h1 = { color: '#ffffff', fontSize: '24px', fontWeight: 'bold', margin: '0 0 16px', textAlign: 'center' as const }
const text = { color: '#A0A0AB', fontSize: '15px', lineHeight: '24px', margin: '0 0 16px' }
const footer = { color: '#666670', fontSize: '13px', margin: '24px 0 0' }
