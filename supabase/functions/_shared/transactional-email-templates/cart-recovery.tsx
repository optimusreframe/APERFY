import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  customerName?: string
  cartUrl?: string
  itemsSummary?: string
  subtotal?: string
  language?: 'es' | 'en'
}

const CartRecoveryEmail = ({ customerName, cartUrl, itemsSummary, subtotal, language = 'es' }: Props) => {
  const spanish = language === 'es'
  return (
    <Html lang={language} dir="ltr">
      <Head />
      <Preview>{spanish ? 'Tu selección sigue esperándote' : 'Your selection is still waiting'}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}><Img src="https://aperfy.kpwr.dev/logo.png" alt="APERFY" width="160" style={logo} /></Section>
          <Section style={card}>
            <Text style={eyebrow}>APERFY · {spanish ? 'TU CARRITO' : 'YOUR CART'}</Text>
            <Heading style={heading}>{spanish ? 'Tu selección sigue esperándote' : 'Your selection is still waiting'}</Heading>
            <Text style={text}>{spanish ? `Hola ${customerName || 'cliente'}, guardamos tu selección para que puedas continuar cuando quieras.` : `Hi ${customerName || 'there'}, we saved your selection so you can continue whenever you are ready.`}</Text>
            {itemsSummary && <Text style={items}>{itemsSummary}</Text>}
            {subtotal && <Text style={total}>{spanish ? 'Subtotal' : 'Subtotal'}: {subtotal}</Text>}
            {cartUrl && <Button href={cartUrl} style={button}>{spanish ? 'Volver al carrito' : 'Return to cart'} →</Button>}
            <Text style={footer}>— {spanish ? 'El equipo APERFY' : 'The APERFY team'}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CartRecoveryEmail,
  subject: (data: Record<string, unknown>) => data.language === 'en' ? 'Your APERFY cart is waiting' : 'Tu carrito de APERFY te espera',
  displayName: 'Cart Recovery',
  previewData: { customerName: 'Andres', cartUrl: 'https://aperfy.kpwr.dev/cart', itemsSummary: 'Anker Nano Charger ×1', subtotal: '$30.00', language: 'es' },
} satisfies TemplateEntry

const green = '#31df70'
const main = { backgroundColor: '#09090f', fontFamily: 'Arial, Helvetica, sans-serif', padding: '24px 12px' }
const container = { width: '100%', maxWidth: '600px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '20px' }
const logo = { display: 'block', width: '160px', height: 'auto', margin: '0 auto' }
const card = { backgroundColor: '#11151d', border: `1px solid ${green}55`, borderRadius: '18px', padding: '32px 24px' }
const eyebrow = { color: green, fontSize: '11px', fontWeight: 'bold', letterSpacing: '2px', textAlign: 'center' as const }
const heading = { color: '#ffffff', fontSize: '26px', lineHeight: '34px', textAlign: 'center' as const }
const text = { color: '#c8ced8', fontSize: '15px', lineHeight: '24px' }
const items = { color: '#c8ced8', fontSize: '14px', lineHeight: '22px', whiteSpace: 'pre-line' as const, borderTop: '1px solid #ffffff1c', borderBottom: '1px solid #ffffff1c', padding: '16px 0' }
const total = { color: green, fontSize: '20px', fontWeight: 'bold' }
const button = { display: 'block', backgroundColor: green, color: '#07110b', borderRadius: '999px', padding: '14px 20px', fontWeight: 'bold', textAlign: 'center' as const, textDecoration: 'none', margin: '24px auto' }
const footer = { color: '#8791a2', fontSize: '13px' }
