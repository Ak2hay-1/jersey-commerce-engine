'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@jersey-commerce/ui';
import type { CustomOrderPublicConfig } from '@jersey-commerce/types';
import { storeApi } from '../../lib/api';
import { StoreApiError } from '../../lib/errors';
import { Alert } from '../ui/alert';
import { Input } from '../ui/input';
import {
  EMPTY_ENQUIRY,
  ENQUIRY_STEPS,
  enquiryToFormData,
  validateEnquiryDraft,
  type EnquiryDraft,
} from '../../lib/enquiry';

const TYPES: Array<{ value: string; label: string }> = [
  { value: 'TEAM_ORDER', label: 'Team jerseys' },
  { value: 'CUSTOM_JERSEY', label: 'Custom jersey' },
  { value: 'COLLEGE_ORDER', label: 'College' },
  { value: 'CORPORATE_ORDER', label: 'Corporate' },
  { value: 'TOURNAMENT_ORDER', label: 'Tournament' },
  { value: 'BULK_ORDER', label: 'Bulk order' },
];

export function CustomOrderEnquiryForm({ config }: { config: CustomOrderPublicConfig }): React.JSX.Element {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<EnquiryDraft>(EMPTY_ENQUIRY);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setField = (key: keyof EnquiryDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const stepLabel = ENQUIRY_STEPS[step] ?? ENQUIRY_STEPS[0];
  const progress = useMemo(() => ((step + 1) / ENQUIRY_STEPS.length) * 100, [step]);

  async function submit() {
    const message = validateEnquiryDraft(draft);
    if (message) {
      setError(message);
      setStep(0);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await storeApi.submitCustomOrderInquiry(enquiryToFormData(draft, files));
      router.push(`/custom-orders/${created.publicId}`);
    } catch (err) {
      setError(err instanceof StoreApiError ? err.message : 'Could not submit the enquiry.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border border-border bg-card p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
        Step {step + 1} of {ENQUIRY_STEPS.length}
      </p>
      <h2 className="mt-2 font-heading text-3xl uppercase tracking-wide">{stepLabel}</h2>
      <div className="mt-4 h-1 bg-muted">
        <div className="h-1 bg-accent transition-all" style={{ width: `${progress}%` }} />
      </div>
      {error ? (
        <div className="mt-4">
          <Alert tone="danger">{error}</Alert>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4">
        {step === 0 ? (
          <>
            <Field label="Your name" required>
              <Input value={draft.name} onChange={(event) => setField('name', event.target.value)} autoComplete="name" />
            </Field>
            <Field label="Phone">
              <Input value={draft.phone} onChange={(event) => setField('phone', event.target.value)} autoComplete="tel" />
            </Field>
            <Field label="Email">
              <Input type="email" value={draft.email} onChange={(event) => setField('email', event.target.value)} autoComplete="email" />
            </Field>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Field label="Team or organization">
              <Input value={draft.teamName} onChange={(event) => setField('teamName', event.target.value)} />
            </Field>
            <Field label="Estimated quantity">
              <Input value={draft.quantity} onChange={(event) => setField('quantity', event.target.value)} inputMode="numeric" />
            </Field>
            <Field label="Jersey type">
              <select
                className="flex h-11 w-full border border-input bg-background px-3 text-sm"
                value={draft.type}
                onChange={(event) => setField('type', event.target.value)}
              >
                {TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Description">
              <textarea
                className="min-h-24 w-full border border-input bg-background px-3 py-2 text-sm"
                value={draft.description}
                onChange={(event) => setField('description', event.target.value)}
              />
            </Field>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Field label="Preferred jersey style">
              <Input value={draft.preferredJerseyType} onChange={(event) => setField('preferredJerseyType', event.target.value)} />
            </Field>
            <Field label="Preferred colours">
              <Input value={draft.preferredColours} onChange={(event) => setField('preferredColours', event.target.value)} />
            </Field>
            <Field label="Customization requirements">
              <textarea
                className="min-h-24 w-full border border-input bg-background px-3 py-2 text-sm"
                value={draft.customizationRequirements}
                onChange={(event) => setField('customizationRequirements', event.target.value)}
                placeholder="Name printing, numbers, logos, sleeve patches…"
              />
            </Field>
            {config.customizationOptions.length ? (
              <ul className="grid gap-2 text-sm text-muted-foreground">
                {config.customizationOptions.map((option) => (
                  <li key={option.id}>
                    <span className="font-medium text-foreground">{option.name}</span>
                    {option.description ? ` — ${option.description}` : ''}
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}

        {step === 3 ? (
          <Field label="Reference images or designs (PNG, JPG, WEBP, PDF)">
            <Input
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf"
              multiple
              onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 5))}
            />
            {files.length ? <p className="mt-2 text-xs text-muted-foreground">{files.length} file(s) selected</p> : null}
          </Field>
        ) : null}

        {step === 4 ? (
          <>
            <Field label="Required date">
              <Input type="date" value={draft.requiredDate} onChange={(event) => setField('requiredDate', event.target.value)} />
            </Field>
            <Field label="Notes for the store">
              <textarea
                className="min-h-24 w-full border border-input bg-background px-3 py-2 text-sm"
                value={draft.notes}
                onChange={(event) => setField('notes', event.target.value)}
              />
            </Field>
          </>
        ) : null}

        {step === 5 ? (
          <dl className="grid gap-2 text-sm">
            <Row label="Name" value={draft.name} />
            <Row label="Contact" value={[draft.phone, draft.email].filter(Boolean).join(' · ')} />
            <Row label="Team" value={draft.teamName} />
            <Row label="Quantity" value={draft.quantity} />
            <Row label="Type" value={TYPES.find((item) => item.value === draft.type)?.label} />
            <Row label="Colours" value={draft.preferredColours} />
            <Row label="Files" value={files.length ? `${files.length} attached` : 'None'} />
          </dl>
        ) : null}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {step > 0 ? (
          <Button type="button" variant="outline" onClick={() => setStep((value) => value - 1)}>
            Back
          </Button>
        ) : null}
        {step < ENQUIRY_STEPS.length - 1 ? (
          <Button type="button" onClick={() => setStep((value) => value + 1)}>
            Continue
          </Button>
        ) : (
          <Button type="button" onClick={() => void submit()} disabled={submitting}>
            {submitting ? 'Sending…' : 'Submit enquiry'}
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">
        {label}
        {required ? <span className="text-destructive"> *</span> : <span className="text-muted-foreground"> (optional)</span>}
      </span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/70 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value || '—'}</dd>
    </div>
  );
}
