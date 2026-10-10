import type { Metadata } from 'next';
import Link from 'next/link';
import { ContactLine, LegalPage, LegalSection, loadLegalContact } from '../../components/legal/legal-page';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: 'How we collect, use, share, and protect your personal data.',
  alternates: { canonical: '/privacy' },
};

export default async function PrivacyPage(): Promise<React.JSX.Element> {
  const contact = await loadLegalContact();
  return (
    <LegalPage
      title="Privacy policy"
      intro={
        <p>
          {contact.storeName} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) sells football jerseys online and in store. This
          notice explains what personal data we process when you browse, shop, or place a custom order, why we
          process it, and the rights you have under the Digital Personal Data Protection Act, 2023 and other
          applicable Indian law.
        </p>
      }
    >
      <LegalSection title="Data we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>Account details: name, email address, phone number, and a password hash if you set one.</li>
          <li>Order details: shipping and billing address, items purchased, order history, and invoices.</li>
          <li>
            Payment details: payment status and reference IDs from our payment gateway. We never see or store your
            full card, UPI PIN, or net-banking credentials.
          </li>
          <li>Custom-order details: names, numbers, artwork, and files you upload for personalised kits.</li>
          <li>Technical data: IP address, browser user agent, and security logs used to prevent fraud and abuse.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Why we use it">
        <ul className="list-disc space-y-2 pl-5">
          <li>To create and secure your account, including one-time passcodes sent by email or SMS.</li>
          <li>To process payments, fulfil and ship orders, issue GST invoices, and handle returns.</li>
          <li>To send order, shipping, and invoice updates by email, SMS, or WhatsApp.</li>
          <li>To prevent fraud, enforce our terms, and meet legal, tax, and accounting obligations.</li>
        </ul>
        <p>We process this data on the basis of your consent and to perform the contract you enter into with us.</p>
      </LegalSection>

      <LegalSection title="Who we share it with">
        <p>We share only what each provider needs to do its job:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Razorpay — payment processing.</li>
          <li>Delhivery — shipping and delivery tracking.</li>
          <li>MSG91 and our email provider — OTP, order, and invoice messages (SMS, WhatsApp, email).</li>
          <li>Google — only if you choose &ldquo;Sign in with Google&rdquo;.</li>
          <li>Hosting and infrastructure providers that run this website and our servers.</li>
        </ul>
        <p>We do not sell your personal data and we do not use third-party advertising trackers.</p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          We use only essential cookies: your shopping cart, your sign-in session, the store you are browsing, and
          access to an order you just placed. They are required for the site to work and are not used for
          advertising or cross-site tracking.
        </p>
      </LegalSection>

      <LegalSection title="How long we keep it">
        <p>
          Account data is kept while your account is active. Orders, invoices, and payment records are kept for the
          period required by tax and accounting law (generally eight years), even if you delete your account.
          Security logs are kept for a limited period for fraud prevention.
        </p>
      </LegalSection>

      <LegalSection title="Your rights">
        <p>You can:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Access and download a copy of your data from your account page.</li>
          <li>Correct your details from your profile page.</li>
          <li>
            Erase your account from your account page. We anonymise your profile and keep only the order records the
            law requires.
          </li>
          <li>Withdraw consent, or nominate someone to exercise these rights on your behalf.</li>
          <li>
            Raise a complaint with our{' '}
            <Link href="/grievance" className="text-foreground underline underline-offset-4">
              Grievance Officer
            </Link>
            , and if unresolved, with the Data Protection Board of India.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          Our store is not directed at children. Accounts must be created and orders placed by an adult (18 or over).
          Parents or guardians may buy kids&apos; jerseys on behalf of a child.
        </p>
      </LegalSection>

      <LegalSection title="Security">
        <p>
          We use HTTPS, hashed passwords, encrypted storage for provider credentials, access controls for staff, and
          audit logs. If a breach affects your data, we will notify you and the authorities as required by law.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <ContactLine contact={contact} />
      </LegalSection>
    </LegalPage>
  );
}
