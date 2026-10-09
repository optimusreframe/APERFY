import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

// This public asset was verified at https://aperfy.kpwr.dev/logo.png.
const LOGO_URL = 'https://aperfy.kpwr.dev/logo.png'

interface Props {
  customerName?: string
  orderId?: string
  total?: string
  paymentMethod?: string
  itemsSummary?: string
  shippingAddress?: string
  language?: 'es' | 'en'
}

const OrderConfirmationEmail = ({
  customerName, orderId, total, paymentMethod, itemsSummary, shippingAddress, language = 'en',
}: Props) => {
  const spanish = language === 'es'
  const orderCode = orderId?.slice(0, 8).toUpperCase() || '—'

  return (
    <Html lang={language} dir="ltr">
      <Head />
      <Preview>{spanish ? `Recibimos tu pedido #${orderCode}` : `We received your order #${orderCode}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Img
              src={LOGO_URL}
              alt="APERFY brand logo"
              width="160"
              height="auto"
              style={{ display: 'block', width: '160px', maxWidth: '100%', height: 'auto', margin: '0 auto' }}
            />
          </Section>
          <Section style={card}>
            <Text style={eyebrow}>{spanish ? 'APERFY · CONFIRMACIÓN DE PEDIDO' : 'APERFY · ORDER CONFIRMATION'}</Text>
            <Heading style={h1}>{spanish ? '¡Pedido recibido!' : 'Order received!'}</Heading>
            <Text style={text}>
              {spanish
                ? `Hola ${customerName || 'cliente'}, recibimos tu pedido y comenzaremos a procesarlo pronto.`
                : `Hi ${customerName || 'there'}, we received your order and will begin processing it shortly.`}
            </Text>

            <Section style={detailBox}>
              <Text style={detailLabel}>{spanish ? 'Número de pedido' : 'Order number'}</Text>
              <Text style={detailValue}>#{orderCode}</Text>
              <Hr style={divider} />
              <Text style={detailLabel}>Total</Text>
              <Text style={totalValue}>${total || '0.00'}</Text>
              {paymentMethod && (
                <>
                  <Hr style={divider} />
                  <Text style={detailLabel}>{spanish ? 'Método de pago' : 'Payment method'}</Text>
                  <Text style={detailValue}>{paymentMethod}</Text>
                </>
              )}
            </Section>

            {itemsSummary && (
              <>
                <Text style={sectionTitle}>{spanish ? 'Productos' : 'Items'}</Text>
                <Text style={text}>{itemsSummary}</Text>
              </>
            )}
            {shippingAddress && (
              <>
                <Text style={sectionTitle}>{spanish ? 'Dirección de envío' : 'Shipping address'}</Text>
                <Text style={text}>{shippingAddress}</Text>
              </>
            )}

            <Text style={text}>
              {spanish
                ? 'Te enviaremos actualizaciones cuando tu pedido avance.'
                : 'We will send you updates as your order progresses.'}
            </Text>
            <Text style={footer}>— {spanish ? 'El equipo APERFY' : 'The APERFY team'}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: OrderConfirmationEmail,
  subject: (data: Record<string, unknown>) => {
    const orderCode = String(data.orderId || '').slice(0, 8).toUpperCase()
    return data.language === 'es' ? `Pedido recibido · #${orderCode}` : `Order received · #${orderCode}`
  },
  displayName: 'Order Confirmation',
  previewData: {
    customerName: 'John', orderId: 'abc12345-xxxx', total: '49.99', paymentMethod: 'Zelle',
    itemsSummary: 'Dragon Figurine x1, Phone Stand x2', shippingAddress: '123 Main St, Miami, FL 33101', language: 'en',
  },
} satisfies TemplateEntry

const green = '#31df70'
const gold = '#D4A017'
const main = { backgroundColor: '#09090f', fontFamily: "Arial, Helvetica, sans-serif", padding: '24px 12px' }
const container = { width: '100%', maxWidth: '600px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '20px', padding: '8px 0' }
const card = {
  boxSizing: 'border-box' as const,
  width: '100%',
  backgroundColor: '#11151d',
  border: `1px solid ${green}55`,
  borderRadius: '18px',
  padding: '32px 24px',
}
const eyebrow = { color: green, fontSize: '11px', fontWeight: 'bold', letterSpacing: '2px', margin: '0 0 10px', textAlign: 'center' as const }
const h1 = { color: '#ffffff', fontSize: '25px', lineHeight: '32px', fontWeight: 'bold', margin: '0 0 16px', textAlign: 'center' as const }
const text = { color: '#c8ced8', fontSize: '15px', lineHeight: '24px', margin: '0 0 16px' }
const detailBox = { backgroundColor: '#0b0e14', border: `1px solid ${gold}44`, borderRadius: '12px', padding: '18px', margin: '20px 0' }
const detailLabel = { color: '#8791a2', fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '1px', margin: '0 0 5px' }
const detailValue = { color: '#ffffff', fontSize: '16px', fontWeight: 'bold', margin: '0 0 8px', wordBreak: 'break-word' as const }
const totalValue = { color: green, fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px' }
const divider = { borderColor: '#ffffff1c', margin: '12px 0' }
const sectionTitle = { color: green, fontSize: '13px', fontWeight: 'bold', margin: '24px 0 8px' }
const footer = { color: '#8791a2', fontSize: '13px', margin: '24px 0 0' }
