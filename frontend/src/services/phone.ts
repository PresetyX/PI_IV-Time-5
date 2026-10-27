const MAX_DIGITS = 11;

export function phoneDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, MAX_DIGITS);
}

export function formatPhone(value: string): string {
  const digits = phoneDigits(value);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  const area = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (rest.length <= 4) return `(${area}) ${rest}`;
  const split = rest.length === 9 ? 5 : 4;
  return `(${area}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}

export function isValidPhone(value: string): boolean {
  const length = phoneDigits(value).length;
  return length === 10 || length === 11;
}
