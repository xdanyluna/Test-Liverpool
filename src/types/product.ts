export interface Product {
  name: string;
  price: string;
  /** Product id scraped from the UI card, when available (used for ID-based matching). */
  id?: string;
}

/** Product shape after parsing the web-bff/product/search network response. */
export interface ApiProduct {
  id: string;
  name: string;
  /** Numeric price in MXN, e.g. 314.29 */
  price: number;
}