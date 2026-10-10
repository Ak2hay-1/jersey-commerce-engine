import type { Metadata } from 'next';
import { LegalPage, LegalSection, loadLegalContact } from '../../components/legal/legal-page';

export const metadata: Metadata = {
  title: 'Grievance officer',
  description: 'How to raise a complaint about an order, our service, or your personal data.',
  alternates: { canonical: '/grievance' },
};

export default async function GrievancePage(): Promise<React.JSX.Element> {
  const contact = await loadLegalContact();
  return (
    <LegalPage
      kicker="Policies"
      title="Grievance officer"
      intro={
        <p>
          In line with the Consumer Protection (E-Commerce) Rules, 2020, the Information Technology Rules, 2021, and
          the Digital Personal Data Protection Act, 2023, you can raise any complaint about an order, our service, or
          the handling of your personal data with our Grievance Officer.
        </p>
      }
    >
      <LegalSection title="Contact">
        <dl className="grid gap-3 sm:grid-cols-[10rem_1fr]">
          <dt className="font-semibold text-foreground">Name</dt>
          <dd>{contact.grievanceOfficerName}</dd>
          <dt className="font-semibold text-foreground">Business</dt>
          <dd>{contact.storeName}</dd>
          {contact.grievanceEmail ? (
            <>
              <dt className="font-semibold text-foreground">Email</dt>
              <dd>
                <a href={`mailto:${contact.grievanceEmail}`} className="text-foreground underline underline-offset-4">
                  {contact.grievanceEmail}
                </a>
              </dd>
            </>
          ) : null}
          {contact.phone ? (
            <>
              <dt className="font-semibold text-foreground">Phone</dt>
              <dd>
                <a href={`tel:${contact.phone}`} className="text-foreground underline underline-offset-4">
                  {contact.phone}
                </a>
              </dd>
            </>
          ) : null}
        </dl>
      </LegalSection>

      <LegalSection title="What to include">
        <p>Your name, contact details, order number (if any), and a short description of the issue.</p>
      </LegalSection>

      <LegalSection title="Response times">
        <p>
          We acknowledge every complaint within 48 hours and aim to resolve it within one month of receipt. If you
          are not satisfied with the outcome of a data-protection complaint, you may approach the Data Protection
          Board of India.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
