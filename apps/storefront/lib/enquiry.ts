export const ENQUIRY_STEPS = [
  'Basic information',
  'Order requirements',
  'Customization',
  'Design reference',
  'Delivery',
  'Review',
] as const;

export type EnquiryDraft = {
  name: string;
  phone: string;
  email: string;
  teamName: string;
  quantity: string;
  type: string;
  preferredJerseyType: string;
  preferredColours: string;
  customizationRequirements: string;
  description: string;
  requiredDate: string;
  notes: string;
};

export const EMPTY_ENQUIRY: EnquiryDraft = {
  name: '',
  phone: '',
  email: '',
  teamName: '',
  quantity: '',
  type: 'TEAM_ORDER',
  preferredJerseyType: '',
  preferredColours: '',
  customizationRequirements: '',
  description: '',
  requiredDate: '',
  notes: '',
};

export function validateEnquiryDraft(draft: EnquiryDraft): string | null {
  if (!draft.name.trim()) {
    return 'Name is required.';
  }
  if (!draft.phone.trim() && !draft.email.trim()) {
    return 'Provide a phone number or email.';
  }
  if (draft.quantity && (!/^[1-9]\d*$/.test(draft.quantity) || Number(draft.quantity) > 10_000)) {
    return 'Quantity must be a positive whole number.';
  }
  return null;
}

export function enquiryToFormData(draft: EnquiryDraft, files: File[]): FormData {
  const form = new FormData();
  const entries: Array<[keyof EnquiryDraft, string]> = [
    ['name', draft.name],
    ['phone', draft.phone],
    ['email', draft.email],
    ['teamName', draft.teamName],
    ['quantity', draft.quantity],
    ['type', draft.type],
    ['preferredJerseyType', draft.preferredJerseyType],
    ['preferredColours', draft.preferredColours],
    ['customizationRequirements', draft.customizationRequirements],
    ['description', draft.description],
    ['requiredDate', draft.requiredDate],
    ['notes', draft.notes],
  ];
  for (const [key, value] of entries) {
    if (value.trim()) {
      form.append(key, value.trim());
    }
  }
  for (const file of files) {
    form.append('files', file);
  }
  return form;
}
