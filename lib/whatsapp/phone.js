export function normalizeWhatsAppNumber(value) {
  const raw = String(value || '').trim().replace(/^whatsapp:/i, '').trim();
  const digits = raw.replace(/\D/g, '');
  return digits ? `+${digits}` : '';
}

export function candidateMatchesWhatsAppNumber(candidate, phoneNumber) {
  const normalized = normalizeWhatsAppNumber(phoneNumber);
  if (!normalized) return false;
  return [candidate?.whatsappNumber, candidate?.phone]
    .map(normalizeWhatsAppNumber)
    .some((value) => value === normalized);
}
