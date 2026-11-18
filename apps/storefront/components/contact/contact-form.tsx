'use client';

import { FormEvent, useState } from 'react';
import { storeApi } from '../../lib/api';
import { publicErrorMessage } from '../../lib/errors';
import { Alert } from '../ui/alert';
import { Input } from '../ui/input';

export function ContactForm(): React.JSX.Element {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await storeApi.submitContactMessage({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        message: message.trim(),
      });
      setSent(true);
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
    } catch (caught) {
      setError(publicErrorMessage(caught, 'Could not send your message. Please try again.'));
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <Alert tone="success">
        Message sent. We will get back to you by email{phone.trim() ? ' or phone' : ''} soon.
      </Alert>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={(event) => void onSubmit(event)}>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <label className="grid gap-1.5 text-sm text-muted-foreground">
        Name
        <Input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
      </label>
      <label className="grid gap-1.5 text-sm text-muted-foreground">
        Email
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </label>
      <label className="grid gap-1.5 text-sm text-muted-foreground">
        Phone <span className="font-normal text-muted-foreground/70">(optional)</span>
        <Input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          autoComplete="tel"
          inputMode="tel"
        />
      </label>
      <label className="grid gap-1.5 text-sm text-muted-foreground">
        Message
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          required
          minLength={10}
          rows={5}
          className="min-h-[8rem] w-full rounded-[var(--radius)] border border-white/15 bg-transparent px-3 py-2 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-accent"
        />
      </label>
      <button type="submit" className="btn btn-primary cursor-pointer justify-self-start" disabled={pending}>
        {pending ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
