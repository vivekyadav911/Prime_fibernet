export type GstInvoiceRequestStatus = 'pending' | 'processing' | 'issued' | 'rejected';

export function gstInvoiceStatusMessage(status: GstInvoiceRequestStatus | string): string {
  switch (status) {
    case 'pending':
      return 'You have already submitted a GST invoice request for this payment. Our team will process it within 2 business days.';
    case 'processing':
      return 'Your GST invoice request is being processed. We will email it shortly.';
    case 'issued':
      return 'Your GST invoice has been generated. Please check your email.';
    case 'rejected':
      return 'Your previous GST invoice request was rejected. Please contact support for assistance.';
    default:
      return 'A GST invoice request already exists for this payment.';
  }
}
