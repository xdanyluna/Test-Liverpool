import { test, expect } from '@playwright/test';
import { SearchResultsPage } from '../src/pages/SearchResultsPage';
import { parseSearchResponse } from '../src/network/searchResponseParser';
import { crossValidate, MatchResult } from '../src/validation/crossValidator';
import { Product } from '../src/types/product';
import { searchTerms, SearchTermCase } from './fixtures/searchTerms';

export const PERFORMANCE_THRESHOLD_MS = 20000;

async function runSearchAndValidate(
  searchResultsPage: SearchResultsPage,
  testCase: SearchTermCase,
): Promise<{ products: Product[]; matches: MatchResult[] }> {
  await searchResultsPage.goto();
  await searchResultsPage.search(testCase.term);

  if (testCase.color) {
    await searchResultsPage.filterByColor(testCase.color);
  }

  const startTime = Date.now();
  const searchResponseBody = await searchResultsPage.sortByPrice('Menor precio');
  const products = await searchResultsPage.getFirstNProducts(5);
  const elapsedMs = Date.now() - startTime;

  console.log(`⏱ [${testCase.term}] Ordenar por precio + extraer productos: ${elapsedMs}ms`);
  test.info().annotations.push({
    type: 'performance',
    description: `Ordenar por precio + extraer productos: ${elapsedMs}ms (umbral: ${PERFORMANCE_THRESHOLD_MS}ms)`,
  });

  expect(
    elapsedMs,
    `La operación de ordenar y extraer productos tomó ${elapsedMs}ms, se esperaban menos de ${PERFORMANCE_THRESHOLD_MS}ms`,
  ).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

  console.log(`\n--- Resultados para "${testCase.term}" ---`);
  console.table(products);

  expect(products.length).toBeGreaterThanOrEqual(1);
  expect(products.length).toBeLessThanOrEqual(5);

  products.forEach((product) => {
    expect(product.name).not.toBe('');
    expect(product.price).toMatch(/^\$[\d,]+(?:\.\d{2})?$/);
  });

  const apiProducts = parseSearchResponse(searchResponseBody);
  expect(apiProducts.length).toBeGreaterThan(0);

  const matches = crossValidate(products, apiProducts);

  console.log(`\n--- Cross-validation UI vs Network response ("${testCase.term}") ---`);
  matches.forEach((m, i) => {
    const status = m.apiProduct ? `matched by ${m.matchedBy}` : 'NO MATCH';
    console.log(`[${i}] "${m.uiProduct.name}" (${m.uiProduct.price}) -> ${status}`);
    m.discrepancies.forEach((d) => console.log(`    ⚠ ${d}`));
  });

  return { products, matches };
}

test.describe('Liverpool - Búsqueda de productos', () => {
  for (const testCase of searchTerms) {
    const colorLabel = testCase.color ? `filtrar por color ${testCase.color}` : 'sin filtro de color';

    test(`Buscar "${testCase.term}" (${colorLabel}), ordenar por menor precio y extraer top 5`, async ({
      page,
    }) => {
      const searchResultsPage = new SearchResultsPage(page);

      const { products, matches } = await runSearchAndValidate(searchResultsPage, testCase);

      const matchedCount = matches.filter((m) => m.apiProduct !== null).length;

       const requiredMatches = Math.min(3, products.length);

      expect(
        matchedCount,
        `Se esperaban al menos ${requiredMatches} de ${products.length} productos de la UI presentes en el response, se encontraron ${matchedCount}`,
      ).toBeGreaterThanOrEqual(requiredMatches);
    });
  }
});
