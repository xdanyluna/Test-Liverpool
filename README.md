# Liverpool - Automatización de pruebas de búsqueda

Suite de pruebas end-to-end con [Playwright](https://playwright.dev/) que automatiza el flujo de búsqueda de productos en Liverpool.mx: búsqueda por término, filtrado por color, ordenamiento por precio, extracción de resultados y validación cruzada contra la respuesta de red del backend.

Para el razonamiento detrás de las decisiones de la estrategia de pruebas (qué no automatizar, manejo de CAPTCHA, mitigación de flakiness, integración en un pipeline con más suites), ver [TEST_STRATEGY.md](./TEST_STRATEGY.md).

## Requisitos

- [Node.js](https://nodejs.org/) 20 o superior
- Google Chrome instalado (los tests usan `channel: 'chrome'`, no el Chromium bundled, para evitar bloqueos anti-bot del sitio)

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/xdanyluna/Liverpool_Test.git
cd Liverpool_Test

# Instalar dependencias
npm ci

# Instalar los navegadores de Playwright (Chrome y Firefox)
npx playwright install --with-deps chrome firefox
```

## Ejecución local

### Modo headless

Ejecuta la suite completa sin abrir ventana de navegador (es el modo por defecto, el mismo que usa CI):

```bash
npm test
```

### Modo headed

Ejecuta la suite con el navegador visible, útil para depurar un test o ver el flujo en acción:

```bash
npm run test:headed
```

### Ver el reporte de resultados

Después de correr los tests, Playwright genera un reporte HTML en `playwright-report/`:

```bash
npx playwright show-report
```

## Integración continua

Cada push y pull request hacia `main` dispara la suite completa en modo headless vía GitHub Actions ([`.github/workflows/test.yml`](./.github/workflows/test.yml)).

Ver las ejecuciones: https://github.com/xdanyluna/Liverpool_Test/actions/workflows/test.yml
