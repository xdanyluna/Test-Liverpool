import { Page, Locator } from '@playwright/test';
import { Product } from '../types/product';

export class SearchResultsPage {
  readonly page: Page;
  readonly searchBox: Locator;
  readonly sortButton: Locator;
  readonly resultCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchBox = page.getByRole('textbox', { name: /Buscar por producto/ });
    this.sortButton = page.locator('[data-testid="dropdown-sorting-button"]');
    this.resultCards = page.locator('[data-testid$="-card-card-link"]');
  }

  async goto(): Promise<void> {
    const response = await this.page.goto('https://www.liverpool.com.mx/');
    if (response && response.status() === 403) {
      throw new Error('Liverpool bloqueó la petición (403). Usa channel: "chrome" en playwright.config.ts.');
    }
    await this.page.waitForLoadState('domcontentloaded');
    await this.dismissPopups();
  }

  async dismissPopups(): Promise<void> {
    const closeSelectors = [
      'button[aria-label="Cerrar"]',
      'button[aria-label="cerrar"]',
      '[data-testid="modal-close"]',
      'button:has-text("Aceptar")',
      'button:has-text("Cerrar")',
      'button:has-text("close")',
    ];

    for (const selector of closeSelectors) {
      const btn = this.page.locator(selector).first();
      if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await btn.click().catch(() => {});
      }
    }
  }

  async search(term: string): Promise<void> {
    await this.searchBox.click();
    await this.searchBox.fill(term);
    
    await Promise.all([
      this.page.waitForURL(/\/tienda\?s=/, { timeout: 30_000 }),
      this.page.keyboard.press('Enter'),
    ]);
    await this.resultCards.first().waitFor({ state: 'visible', timeout: 30_000 });
  }

  async filterByColor(color: string): Promise<void> {
    const colorDropdownBtn = this.page
      .locator('[data-testid="button-dropdown-filter"]')
      .filter({ hasText: /^Color/i });

    await colorDropdownBtn.scrollIntoViewIfNeeded();

    const colorCheckbox = this.page.getByRole('checkbox', {
      name: new RegExp(`^${color}`, 'i'),
    });

    const alreadyVisible = await colorCheckbox.isVisible({ timeout: 2000 }).catch(() => false);
    if (!alreadyVisible) {
      await colorDropdownBtn.click();
      await colorCheckbox.waitFor({ state: 'visible', timeout: 8000 });
    }

    await Promise.all([
      this.page.waitForResponse(
        r => r.url().includes('web-bff/product/search') && r.status() === 200,
      ),
      colorCheckbox.click(),
    ]);
    await this.resultCards.first().waitFor({ state: 'visible' });
  }

  async sortByPrice(option: 'Menor precio' | 'Mayor precio'): Promise<unknown> {
    await this.sortButton.click();
    const [response] = await Promise.all([
      this.page.waitForResponse(
        r => r.url().includes('web-bff/product/search') && r.status() === 200,
      ),
      this.page.getByRole('option', { name: option }).click(),
    ]);
    await this.resultCards.first().waitFor({ state: 'visible' });

    return response.json();
  }

  async getFirstNProducts(n: number): Promise<Product[]> {
    await this.resultCards.first().waitFor({ state: 'visible' });

    const count = Math.min(await this.resultCards.count(), n);
    const products: Product[] = [];

    for (let i = 0; i < count; i++) {
      const card = this.resultCards.nth(i);
      const name = (await card.locator('h3').textContent())?.trim() ?? '';

      const priceContainer = card.locator('[data-testid$="-price"]');
      const priceText = (await priceContainer.first().textContent()) ?? '';
      const price = priceText.match(/\$[\d,]+(?:\.\d{2})?/)?.[0] ?? '';

      products.push({ name, price, id: await extractProductId(card) });
    }

    return products;
  }

  async getResultCount(): Promise<number> {
    return this.resultCards.count();
  }
}

async function extractProductId(card: Locator): Promise<string | undefined> {
  const testId = await card.getAttribute('data-testid').catch(() => null);
  const match = testId?.match(/(\d+)-card-card-link/);
  return match?.[1];
}
