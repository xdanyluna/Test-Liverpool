import { ApiProduct, Product } from '../types/product';

export type MatchedBy = 'id' | 'name+price' | 'none';

export interface MatchResult {
  uiProduct: Product;
  apiProduct: ApiProduct | null;
  matchedBy: MatchedBy;
  discrepancies: string[];
}

const PRICE_TOLERANCE_MXN = 0.01;

/**
 * Cross-validates the products scraped from the UI against the products
 * parsed from the intercepted network response.
 *
 * Matching strategy:
 *   1. By product id, when the UI scrape was able to extract one.
 *   2. Fallback: by normalized name + price (handles cases where the DOM
 *      doesn't expose an id, e.g. markup changes).
 *
 * Even when a match is found, name/price are still diffed and reported as
 * discrepancies (e.g. an id match with a stale UI price would otherwise be
 * silently accepted).
 */
export function crossValidate(uiProducts: Product[], apiProducts: ApiProduct[]): MatchResult[] {
  return uiProducts.map((uiProduct) => buildMatchResult(uiProduct, apiProducts));
}

function buildMatchResult(uiProduct: Product, apiProducts: ApiProduct[]): MatchResult {
  const byId = uiProduct.id ? apiProducts.find((p) => p.id === uiProduct.id) : undefined;

  const uiNameNorm = normalizeName(uiProduct.name);
  const uiPriceNum = parsePriceToNumber(uiProduct.price);

  const byNameAndPrice = apiProducts.find(
    (p) => normalizeName(p.name) === uiNameNorm && pricesMatch(p.price, uiPriceNum),
  );

  const apiProduct = byId ?? byNameAndPrice ?? null;
  const matchedBy: MatchedBy = byId ? 'id' : byNameAndPrice ? 'name+price' : 'none';

  const discrepancies: string[] = [];

  if (!apiProduct) {
    discrepancies.push(
      `Sin coincidencia en el response para "${uiProduct.name}" (UI price: ${uiProduct.price})`,
    );
    return { uiProduct, apiProduct: null, matchedBy, discrepancies };
  }

  if (normalizeName(apiProduct.name) !== uiNameNorm) {
    discrepancies.push(`Nombre distinto -> UI: "${uiProduct.name}" | API: "${apiProduct.name}"`);
  }

  if (!pricesMatch(apiProduct.price, uiPriceNum)) {
    discrepancies.push(`Precio distinto -> UI: "${uiProduct.price}" | API: "${apiProduct.price}"`);
  }

  return { uiProduct, apiProduct, matchedBy, discrepancies };
}

function pricesMatch(a: number, b: number): boolean {
  return Math.abs(a - b) <= PRICE_TOLERANCE_MXN;
}

function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function parsePriceToNumber(price: string): number {
  return Number(price.replace(/[^0-9.]/g, ''));
}
