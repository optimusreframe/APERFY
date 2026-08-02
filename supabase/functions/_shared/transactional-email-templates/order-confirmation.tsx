import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'APERFY'
const LOGO_URL = 'https://fyqcbkfzyjgddmqupdfr.supabase.co/storage/v1/object/public/email-assets/logo.png'

interface Props {
  customerName?: string
  orderId?: string
  total?: string
  paymentMethod?: string
  itemsSummary?: string
  shippingAddress?: string
}

const OrderConfirmationEmail = ({
  customerName, orderId, total, paymentMethod, itemsSummary, shippingAddress,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your order #{orderId?.slice(0, 8).toUpperCase() || '...'} has been received!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} alt={SITE_NAME} width="160" height="auto" style={{ margin: '0 auto' }} />
        </Section>
        <Section style={card}>
          <Heading style={h1}>Order Received! 🎉</Heading>
          <Text style={text}>
            {customerName ? `Hi ${customerName},` : 'Hi,'} thank you for your order! We've received it and will begin processing shortly.
          </Text>
          <Section style={detailBox}>
            <Text style={detailLabel}>Order ID</Text>
            <Text style={detailValue}>#{orderId?.slice(0, 8).toUpperCase() || '—'}</Text>
            <Hr style={divider} />
            <Text style={detailLabel}>Total</Text>
            <Text style={detailValue}>${total || '0.00'}</Text>
            <Hr style={divider} />
            <Text style={detailLabel}>Payment Method</Text>
            <Text style={detailValue}>{paymentMethod || '—'}</Text>
          </Section>
          {itemsSummary && (
            <>
              <Text style={sectionTitle}>Items</Text>
              <Text style={text}>{itemsSummary}</Text>
            </>
          )}
          {shippingAddress && (
            <>
              <Text style={sectionTitle}>Shipping To</Text>
              <Text style={text}>{shippingAddress}</Text>
            </>
          )}
          <Text style={text}>
            We'll send you updates as your order progresses through production and shipping.
          </Text>
          <Text style={footer}>— The {SITE_NAME} Team</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: OrderConfirmationEmail,
  subject: (data: Record<string, any>) => `Order Confirmed — #${(data.orderId || '').slice(0, 8).toUpperCase()}`,
  displayName: 'Order Confirmation',
  previewData: { customerName: 'John', orderId: 'abc12345-xxxx', total: '49.99', paymentMethod: 'Zelle', itemsSummary: 'Dragon Figurine x1, Phone Stand x2', shippingAddress: '123 Main St, Miami, FL 33101' },
} satisfies TemplateEntry

const gold = '#D4A017'
const main = { backgroundColor: '#0A0A0F', fontFamily: "'Arial', 'Helvetica', sans-serif", padding: '40px 0' }
const container = { maxWidth: '600px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '24px' }
const card = { backgroundColor: '#13131A', border: `1px solid ${gold}33`, borderRadius: '16px', padding: '40px 32px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }
const h1 = { color: '#ffffff', fontSize: '24px', fontWeight: 'bold', margin: '0 0 16px', textAlign: 'center' as const }
const text = { color: '#A0A0AB', fontSize: '15px', lineHeight: '24px', margin: '0 0 16px' }
const detailBox = { backgroundColor: '#1a1a24', borderRadius: '12px', padding: '20px', margin: '20px 0' }
const detailLabel = { color: '#666670', fontSize: '12px', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 4px' }
const detailValue = { color: '#ffffff', fontSize: '16px', fontWeight: 'bold', margin: '0 0 8px' }
const divider = { borderColor: '#2a2a35', margin: '12px 0' }
const sectionTitle = { color: gold, fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '20px 0 8px' }
const footer = { color: '#666670', fontSize: '13px', margin: '24px 0 0' }
