/** Build a WhatsApp chat URL from a full https link or a phone number. */
export function whatsappHref(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) {
    return null;
  }
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }
  const digits = raw.replace(/[^\d+]/g, '');
  const normalized = digits.startsWith('+') ? digits.slice(1) : digits.replace(/^0+/, '');
  if (!normalized) {
    return null;
  }
  return `https://wa.me/${normalized}`;
}
