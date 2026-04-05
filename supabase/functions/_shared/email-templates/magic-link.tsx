/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

const LOGO_URL = 'https://fyqcbkfzyjgddmqupdfr.supabase.co/storage/v1/object/public/email-assets/logo.png'
const SITE_URL = 'https://3dtoprint.online'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your login link for 3DtoPrint</Preview>
    <Body style={main}>
      <Container style={card}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="56" height="56" alt="3DtoPrint" style={logoImg} />
          <Heading style={brandName}>
            3Dto<span style={brandGold}>Print</span>
          </Heading>
        </Section>

        <Heading style={h1}>Your login link</Heading>
        <Text style={text}>
          Click the button below to access your account at 3DtoPrint. This link will expire shortly.
        </Text>

        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            Access my account
          </Button>
        </Section>

        <Text style={footerText}>
          If you didn't request this link, you can safely ignore this email.
        </Text>

        <Section style={footerSection}>
          <Text style={footerBrand}>
            © 2026{' '}
            <Link href={SITE_URL} style={footerLink}>3DtoPrint</Link>
            {' '}— Premium 3D Printing
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const gold = '#D4A017'

const main = { backgroundColor: '#0A0A0F', fontFamily: "'Outfit', 'Inter', Arial, sans-serif" }
const card = { maxWidth: '520px', margin: '40px auto', padding: '0', backgroundColor: '#13131A', border: `1px solid ${gold}33`, borderRadius: '16px', boxShadow: `0 20px 40px rgba(0,0,0,0.4)`, overflow: 'hidden' as const }
const logoSection = { textAlign: 'center' as const, padding: '32px 24px 0' }
const logoImg = { margin: '0 auto', borderRadius: '12px' }
const brandName = { fontSize: '20px', fontWeight: 'bold' as const, color: '#ffffff', margin: '12px 0 0', letterSpacing: '-0.02em' }
const brandGold = { color: gold }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#ffffff', margin: '28px 32px 16px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#A0A0AB', lineHeight: '1.6', margin: '0 32px 16px' }
const buttonSection = { textAlign: 'center' as const, padding: '8px 32px 24px' }
const button = { background: `linear-gradient(135deg, ${gold}, #E8B930)`, backgroundColor: gold, color: '#0A0A0F', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '12px', padding: '14px 32px', textDecoration: 'none', boxShadow: `0 8px 24px -6px ${gold}66, 0 4px 8px -4px rgba(0,0,0,0.2)`, display: 'inline-block' as const }
const footerText = { fontSize: '13px', color: '#666670', margin: '0 32px 24px', lineHeight: '1.5' }
const footerSection = { borderTop: `1px solid ${gold}1A`, padding: '20px 32px', textAlign: 'center' as const }
const footerBrand = { fontSize: '12px', color: '#666670', margin: '0' }
const footerLink = { color: gold, textDecoration: 'none' }
