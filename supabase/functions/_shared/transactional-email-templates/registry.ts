/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as orderConfirmation } from './order-confirmation.tsx'
import { template as orderConfirmed } from './order-confirmed.tsx'
import { template as orderPrinting } from './order-printing.tsx'
import { template as orderShipped } from './order-shipped.tsx'
import { template as orderDelivered } from './order-delivered.tsx'
import { template as orderCancelled } from './order-cancelled.tsx'
import { template as paymentReceived } from './payment-received.tsx'
import { template as modelRequestReceived } from './model-request-received.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'order-confirmation': orderConfirmation,
  'order-confirmed': orderConfirmed,
  'order-printing': orderPrinting,
  'order-shipped': orderShipped,
  'order-delivered': orderDelivered,
  'order-cancelled': orderCancelled,
  'payment-received': paymentReceived,
  'model-request-received': modelRequestReceived,
}
