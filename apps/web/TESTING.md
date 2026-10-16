# Tests de Ludora

Los tests de Vitest se mantienen junto al código, con `describe` e `it`, Testing Library y mensajes en español. Las pruebas de navegador están en `e2e/`.

## Componentes, lógica y cobertura

Desde la raíz del monorepo:

```sh
pnpm --filter web test
pnpm --filter web test:coverage
```

El segundo comando genera `apps/web/coverage/index.html` y `coverage-summary.json`.
El informe incluye el código fuente aunque ningún test lo haya importado. Excluye los tests, los archivos de tipos y los índices que solo reexportan módulos. Los componentes de UI permanecen incluidos.

La cobertura corresponde a Vitest. Los flujos ejecutados por Playwright se informan por separado, por lo que una página cubierta en navegador puede aparecer con 0 % en el informe de Vitest.

Áreas cubiertas:

- Storage: lectura, escritura, eliminación, suscripciones, cambios entre pestañas y errores del navegador.
- Perfil: schema, JSON corrupto, hidratación, edición, avatares, cancelación, guardado asíncrono y fallos de persistencia.
- Preferencias: selección del tema, idioma y conservación de query string y hash.
- Navegación: enlaces según sesión, sección activa y decisiones de acceso y redirección.
- Registro: validación de la Server Action e idioma utilizado para traducir los errores.
- Componentes compartidos: alertas, estados de error, listas y textarea accesible.

Las pruebas de guardas invocan la función de servidor y comprueban su decisión de redirección. El renderizado de rutas asíncronas se comprueba en navegador.

`test/setup.ts` aporta las APIs de tamaño y captura de puntero ausentes en jsdom. La geometría, el foco real y la persistencia tras recargar se verifican en Playwright.

## Pruebas de navegador

Instalar Chromium una vez:

```sh
pnpm --filter web exec playwright install chromium
pnpm --filter web test:e2e
```

También puede usarse Chrome instalado en el equipo:

```sh
PLAYWRIGHT_CHANNEL=chrome pnpm --filter web test:e2e
```

Playwright inicia y detiene dos servidores Next.js propios:

| Proyecto | Puerto | Sesión simulada |
| --- | --- | --- |
| `signed-in` | 3100 | Usuario con sesión |
| `guest` | 3101 | Invitado |

`LUDORA_E2E_MODE` selecciona un fixture de `e2e/fixtures/` mediante un alias de Turbopack y un directorio de compilación independiente en `.next-e2e/`. Así cada proyecto tiene una sesión reproducible y se puede probar acceso público y privado. El servidor de desarrollo habitual utiliza `src/config/auth.ts` y `.next/`.

Los escenarios comprueban navegación móvil y Escape, sección activa, acceso de invitados, detección y cookie del idioma, persistencia del tema, páginas 404 y guardado del perfil entre recargas y pestañas. Cada test utiliza un contexto de navegador con sus propias cookies y storage.

El servidor utilizado es `next dev`. Las comprobaciones de Next sobre `instant` pueden mostrar avisos de desarrollo al ejecutar redirecciones o `notFound()`. Para una validación final de publicación conviene repetir los flujos contra una compilación de producción.

Los fallos generan capturas y trazas en `test-results/`. El informe HTML queda en `playwright-report/`:

```sh
pnpm --filter web exec playwright show-report
```
