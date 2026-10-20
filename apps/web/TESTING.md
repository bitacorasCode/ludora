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
- Autenticación: acciones de login y logout, estado pendiente, errores traducidos, cookies y consulta del usuario actual.
- Cliente HTTP: token por petición, cabeceras reservadas, fallos de red, respuestas inválidas y política HTTP/HTTPS.
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

Para ejecutar estos flujos deben estar disponibles PostgreSQL y la configuración local de `apps/api/.env` (`DATABASE_URL` y `JWT_SECRET`). Desde la raíz, levanta PostgreSQL con `docker compose up -d` y aplica las migraciones de la API si aún no lo hiciste.

Playwright utiliza:

| Servicio           | Puerto | Uso                                                                      |
| ------------------ | ------ | ------------------------------------------------------------------------ |
| API Nest           | 3001   | Reutiliza la API local si está activa; en otro caso la inicia.           |
| Proxy de pruebas   | 3102   | Reenvía las peticiones a Nest y permite simular demoras o desconexiones. |
| Next.js de pruebas | 3100   | Usa el directorio independiente `.next-e2e/`.                            |

Los proyectos `signed-in` y `guest` comparten ese servidor Next. Las sesiones son cookies con JWT emitidos por la API real; no hay aliases de autenticación ni booleanos de acceso.

Cada worker crea una cuenta temporal mediante `/auth/register`, con un correo `e2e-<uuid>@example.test`. La elimina al terminar usando una consulta parametrizada que exige su identificador y correo exactos. El helper `apps/api/test/fixtures/auth-fixture.mjs` también genera un token ya caducado para comprobar que Nest lo rechaza; lee la configuración local sin imprimir secretos. Estas pruebas están diseñadas para la base local de desarrollo.

Los escenarios comprueban login correcto e incorrecto, cookie HttpOnly, persistencia tras recargar, logout sin recarga completa, acceso tras cerrar sesión, redirecciones de invitado, expiración real del JWT y fallos de conexión. También mantienen los escenarios de navegación móvil, idioma, tema, páginas 404 y perfil entre pestañas. Cada test utiliza cookies y storage independientes.

Las desconexiones se provocan solo en el proxy de pruebas: no se detiene ni modifica la API del desarrollador. El modo normal del proxy se restaura al terminar cada test.

El servidor utilizado es `next dev`. Las comprobaciones de Next sobre `instant` pueden mostrar avisos de desarrollo al ejecutar redirecciones o `notFound()`. Para una validación final de publicación conviene repetir los flujos contra una compilación de producción.

Los fallos generan capturas y trazas en `test-results/`. El informe HTML queda en `playwright-report/`:

```sh
pnpm --filter web exec playwright show-report
```
