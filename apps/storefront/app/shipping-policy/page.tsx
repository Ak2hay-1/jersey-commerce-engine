import type { Metadata } from 'next';
import { ContactLine, LegalPage, LegalSection, loadLegalContact } from '../../components/legal/legal-page';

export const metadata: Metadata = {
  title: 'Shipping policy',
  description: 'Delivery areas, timelines, charges, and tracking.',
  alternates: { canonical: '/shipping-policy' },
};

export default async function ShippingPolicyPage(): Promise<React.JSX.Element> {
  const contact = await loadLegalContact();
  return (
    <LegalPage kicker="Policies" title="Shipping policy">
      <LegalSection title="Where we ship">
        <p>We currently ship to serviceable pin codes across India. Store pickup is available where offered at checkout.</p>
      </LegalSection>

      <LegalSection title="Dispatch and delivery times">
        <p>
          In-stock jerseys are usually dispatched within 1–3 business days. Delivery typically takes 3–7 business
          days after dispatch depending on your location. Custom and personalised orders ship after production is
          complete; the expected timeline is shown on your quote.
        </p>
      </LegalSection>

      <LegalSection title="Charges">
        <p>Shipping charges, if any, are calculated and shown at checkout before you pay.</p>
      </LegalSection>

      <LegalSection title="Tracking">
        <p>
          Orders are shipped with Delhivery. Once your order ships you will receive a tracking number, and you can
          follow its status from your account&apos;s order page.
        </p>
      </LegalSection>

      <LegalSection title="Delays and failed delivery">
        <p>
          Courier delays can happen during peak periods or due to events outside our control. If a delivery fails
          after repeated attempts and the parcel returns to us, we will contact you to reship or refund.
        </p>
      </LegalSection>

      <LegalSection title="Questions">
        <ContactLine contact={contact} />
      </LegalSection>
    </LegalPage>
  );
}
