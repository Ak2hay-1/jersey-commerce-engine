import type { Metadata } from 'next';
import Link from 'next/link';
import { ContactLine, LegalPage, LegalSection, loadLegalContact } from '../../components/legal/legal-page';

export const metadata: Metadata = {
  title: 'Terms of service',
  description: 'The terms that apply when you shop with us.',
  alternates: { canonical: '/terms' },
};

export default async function TermsPage(): Promise<React.JSX.Element> {
  const contact = await loadLegalContact();
  return (
    <LegalPage
      title="Terms of service"
      intro={
        <p>
          These terms apply when you use the {contact.storeName} website, create an account, or place an order. By
          placing an order you agree to them and to our{' '}
          <Link href="/privacy" className="text-foreground underline underline-offset-4">
            privacy policy
          </Link>
          .
        </p>
      }
    >
      <LegalSection title="Accounts">
        <p>
          You must be 18 or older to create an account or place an order. Keep your sign-in details private; you are
          responsible for activity on your account. Tell us promptly if you suspect unauthorised use.
        </p>
      </LegalSection>

      <LegalSection title="Products and pricing">
        <p>
          We sell football jerseys, including club, national, kids, and custom kits. Product photos are
          representative; colours may vary slightly by screen. Prices are in Indian Rupees and include applicable
          GST unless stated otherwise. Shipping charges are shown at checkout.
        </p>
        <p>
          If a product is listed at an obviously incorrect price or becomes unavailable, we may cancel the order and
          refund any amount paid in full.
        </p>
      </LegalSection>

      <LegalSection title="Orders and payment">
        <p>
          An order is confirmed once payment succeeds (or, for cash on delivery, once we accept it). Online payments
          are processed by Razorpay. We may cancel orders that appear fraudulent or that we cannot fulfil, with a
          full refund.
        </p>
      </LegalSection>

      <LegalSection title="Custom orders">
        <p>
          For personalised kits, you are responsible for the names, numbers, and artwork you provide and confirm that
          you have the right to use them. We may decline designs that infringe trademarks or copyrights or that are
          offensive. Custom items are made to order and are covered by our{' '}
          <Link href="/refund-policy" className="text-foreground underline underline-offset-4">
            returns policy
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="Shipping, returns, and refunds">
        <p>
          See our{' '}
          <Link href="/shipping-policy" className="text-foreground underline underline-offset-4">
            shipping policy
          </Link>{' '}
          and{' '}
          <Link href="/refund-policy" className="text-foreground underline underline-offset-4">
            returns &amp; refunds policy
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>
          Do not misuse the site: no attempts to break security, scrape at scale, overload our systems, or place
          orders using someone else&apos;s payment details.
        </p>
      </LegalSection>

      <LegalSection title="Liability">
        <p>
          To the extent permitted by law, our liability for any order is limited to the amount you paid for it.
          Nothing in these terms limits your rights under the Consumer Protection Act, 2019.
        </p>
      </LegalSection>

      <LegalSection title="Governing law">
        <p>
          These terms are governed by the laws of India. Complaints can be raised with our{' '}
          <Link href="/grievance" className="text-foreground underline underline-offset-4">
            Grievance Officer
          </Link>
          ; disputes are subject to the jurisdiction of the competent courts in India.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <ContactLine contact={contact} />
      </LegalSection>
    </LegalPage>
  );
}
