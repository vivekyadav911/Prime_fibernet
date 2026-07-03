import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { PaymentMethod } from '@/types/payments';

export const PAYMENT_METHOD_ICONS: Record<
  PaymentMethod,
  keyof typeof MaterialCommunityIcons.glyphMap
> = {
  upi: 'qrcode-scan',
  card: 'credit-card-outline',
  netbanking: 'bank-outline',
  wallet: 'wallet-outline',
  cash: 'cash',
  cheque: 'checkbook',
  bank_transfer: 'bank-transfer',
  other: 'dots-horizontal',
};
