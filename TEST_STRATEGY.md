# Test Strategy

## 1. ¿Qué no automatizaría, y por qué?

No automatizaría la usabilidad porque eso va más de lado del juicio humano más que probar si algo funciona o no.

## 2. Si Liverpool agregara un CAPTCHA al flujo de búsqueda, ¿cómo lo manejaría?

El tratar de evadir el CAPTCHA va en contra del proposito de este, si no se puede evadir entonces esa prueba deberá pasar a ser manual.
Por otro lado se puede intentar desactivar el mecanismo de CAPTCHA en un ambiente de pruebas.

## 3. ¿Qué riesgos de flakiness existen, y cómo los mitigué?

Algunos riesgos que pude identificar son:

1.-Condiciones de carrera (timing): en vez de esperas fijas, sincronizo con waitForResponse sobre el endpoint web-bff/product/search antes de leer el DOM, tanto al filtrar por color como al ordenar por precio, esto garantiza que la UI ya refleje la respuesta del backend antes de extraer datos, en lugar de adivinar un tiempo de espera arbitrario.
2.-Datos dinámicos: precios e inventario de un sitio real en producción pueden cambiar entre el momento de la extracción UI y la respuesta de red, por eso el cross-validator usa una tolerancia de precio y un matching en dos niveles primero por id y luego por nombre + precio  en vez de exigir una coincidencia exacta y rígida que rompería la prueba ante diferencias mínimas de formato.
3.-Selectores frágiles: prioricé data-testid sobre clases CSS o texto visual, que cambian con frecuencia en despliegues de frontend y pueden ser unna causa de  tests rotos por razones diferentes a un bug real.
4.-Bloqueo anti-bot: Liverpool bloquea el Chromium *bundled* de Playwright; forcé channel: chrome para usar Chrome real instalado y evitar falsos negativos por bloqueo del sitio, no por un fallo de la prueba.

## 4. Si tuviera que integrar esto en un pipeline de un equipo con 50+ suites, ¿qué cambiaría?

Segmentaría esta suite del resto del pipeline en lugar de dejarla mezclada con pruebas más ligeras. Al depender de un sitio de producción real de un tercero, su tiempo de ejecución son distintos a los de una suite interna: si Liverpool tiene un incidente o cambia su markup, no debería bloquear el pipeline completo ni retrasar el feedback de otros equipos.

La implementaría como un job independiente, con su propio timeout corriendo en paralelo al resto de las suites y sin ser "blocking" para el merge si el resto de la pipeline pasa — reportando su resultado por separado para que el equipo lo revise sin detener el flujo de CI/CD de las demás suites.