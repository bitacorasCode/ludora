This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Pruebas de navegador con Playwright

Las pruebas de autenticación utilizan la API de Nest, PostgreSQL y Mailpit reales.
Ejecuta los comandos desde la raíz del monorepo, con las dependencias instaladas
y las migraciones existentes aplicadas en tu base de desarrollo local.

1. Abre Docker Desktop y levanta PostgreSQL y Mailpit:

   ```bash
   docker compose up -d
   ```

2. Comprueba que la configuración SMTP de la API apunta a Mailpit:
   `SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025` y `SMTP_SECURE=false`.

3. Instala Chromium si todavía no está disponible:

   ```bash
   pnpm --filter web exec playwright install chromium
   ```

4. Ejecuta los recorridos de registro y verificación:

   ```bash
   pnpm --filter web test:e2e e2e/email-verification.spec.ts --project=guest
   ```

   Para ejecutar toda la suite de navegador:

   ```bash
   pnpm --filter web test:e2e
   ```

Playwright inicia la API si no está disponible y levanta una web independiente
en el puerto `3100`, con el proxy de pruebas en `3102`. La API utiliza `3001` y
Mailpit expone su bandeja y API en `8025`. La web de pruebas usa `.next-e2e`
para mantener su compilación separada del servidor de desarrollo habitual.

Las cuentas usan correos únicos con el formato `e2e-<uuid>@example.test`. Al
terminar se eliminan únicamente esas cuentas y sus mensajes. No se vacía la
base de datos ni la bandeja de Mailpit. La limpieza exige una base PostgreSQL
local y un destinatario temporal válido.

El recorrido de reenvío espera el plazo real del servidor; tarda aproximadamente
un minuto. No modifica el reloj, las fechas de la base de datos ni los límites
de la aplicación. Las pruebas leen el código del correo capturado en Mailpit y
comprueban que la cookie `HttpOnly` aparece solamente después de confirmar.

Los tests de autenticación desactivan las trazas y capturas, que pueden incluir
credenciales, códigos de verificación o tokens.
