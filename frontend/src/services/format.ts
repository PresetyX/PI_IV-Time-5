/*
 * Autor: Pedro Henrique Medeiros dos Reis
 * RA: 24801656
 */
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatCents(cents: number): string {
  return currency.format(cents / 100);
}
