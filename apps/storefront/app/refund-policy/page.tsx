import type { Metadata } from 'next';
import { ContactLine, LegalPage, LegalSection, loadLegalContact } from '../../components/legal/legal-page';

export const metadata: Metadata = {
  title: 'Returns & refunds',
  description: 'How returns, exchanges, cancellations, and refunds work.',
  alternates: { canonical: '/refund-policy' },
};

export default async function RefundPolicyPage(): Promise<React.JSX.Element> {
  const contact = await loadLegalContact();
  return (
    <LegalPage kicker="Policies" title="Returns & refunds">
      <LegalSection title="Returns and exchanges">
        <p>
          You can request a return or size exchange within 7 days of delivery for standard (non-personalised)
          jerseys that are unworn, unwashed, and have their original tags and packaging.
        </p>
      </LegalSection>

      <LegalSection title="Custom and personalised items">
        <p>
          Jerseys printed with names, numbers, or custom artwork are made to order and cannot be returned or
          exchanged, unless they arrive damaged, defective, or different from the design you approved.
        </p>
      </LegalSection>

      <LegalSection title="Damaged or wrong items">
        <p>
          If your order arrives damaged, defective, or incorrect, contact us within 48 hours of delivery with your
          order number and photos. We will arrange a replacement or a full refund at no extra cost.
        </p>
      </LegalSection>

      <LegalSection title="Cancellations">
        <p>
          You can cancel an order before it ships. Custom orders can be cancelled before production starts. Once an
          order has shipped, please request a return instead.
        </p>
      </LegalSection>

      <LegalSection title="Refunds">
        <p>
          Approved refunds are issued to the original payment method within 5–7 business days after we receive and
          inspect the returned item (or approve the cancellation). Your bank may take additional time to credit the
          amount. Cash-on-delivery orders are refunded by bank transfer or UPI.
        </p>
      </LegalSection>

      <LegalSection title="How to start a return">
        <ContactLine contact={contact} />
        <p>Please include your order number.</p>
      </LegalSection>
    </LegalPage>
  );
}
