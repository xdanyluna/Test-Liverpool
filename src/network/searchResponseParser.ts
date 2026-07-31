import { ApiProduct } from '../types/product';

export function parseSearchResponse(body: unknown): ApiProduct[] {
  const rawProducts = (body as { products?: unknown[] })?.products;

  if (!Array.isArray(rawProducts)) {
    return [];
  }

  return rawProducts
    .map((raw) => toApiProduct(raw))
    .filter((p): p is ApiProduct => p !== null);
}

function toApiProduct(raw: unknown): ApiProduct | null {
  const p = raw as Record<string, any>;

  const id = p?.id ?? p?.productId;
  const name = p?.recordTitle ?? p?.title;
  const price = extractPrice(p);

  if (id == null || !name || Number.isNaN(price)) {
    return null;
  }

  return { id: String(id), name: String(name).trim(), price };
}

function extractPrice(p: Record<string, any>): number {
  if (typeof p?.minimumPromoPrice === 'number') {
    return p.minimumPromoPrice;
  }

  const variantPrices = p?.variants?.[0]?.prices;
  const raw = variantPrices?.salePrice ?? variantPrices?.sortPrice ?? variantPrices?.listPrice;

  return raw != null ? Number(raw) : NaN;
}
