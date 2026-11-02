# @ludora/security

Definiciones públicas de seguridad y autenticación compartidas por Nest y Next.

| Exportación | Uso |
| --- | --- |
| `HEX_64_PATTERN` | Formato de los secretos de 64 caracteres hexadecimales. |
| `DIGITS_PATTERN` | Códigos formados únicamente por dígitos ASCII. |
| `INTERNAL_REQUEST_HEADERS` | Nombres de los encabezados entre Next y Nest. |
| `AUTH_NEXT_STEP` | Siguientes pasos que puede devolver el login. |
| `AUTH_ERROR_CODES` | Identificadores públicos de los errores de autenticación. |
| `AUTH_VALIDATION` | Mínimos de nickname y contraseña nueva. |
| `EMAIL_VERIFICATION_CODE_LENGTH` | Longitud del código generado y validado. |
| `ACCESS_TOKEN_TTL_SECONDS` | Duración del JWT y de la cookie de sesión. |

## Consumo

Ambas apps declaran `"@ludora/security": "workspace:*"` en sus dependencias.
La instalación se ejecuta desde la raíz del monorepo:

```sh
pnpm install
```

```ts
import { HEX_64_PATTERN } from '@ludora/security';
```

El paquete utiliza JavaScript ESM ejecutable y declaraciones TypeScript
(`index.d.ts`). No requiere un build previo para arrancar las apps. Los tipos
públicos se mantienen junto con las exportaciones; los valores de configuración
se definen en `index.js`.

## Responsabilidades

- Los valores secretos permanecen en las variables de entorno de cada app.
- Nest conserva la comparación criptográfica, el hashing y la emisión del JWT.
- Next conserva la gestión de cookies y la lectura de su configuración.
- Cada app mantiene sus schemas Zod, transformaciones y mensajes. La web también
  valida la confirmación de contraseña, que no forma parte del DTO de registro.
- `passwordMinLength` se aplica a contraseñas nuevas; el login exige únicamente
  que la contraseña esté presente.
- Caducidad del código, intentos y cooldown de reenvío son políticas de Nest;
  la web utiliza las fechas y las esperas recibidas del servidor.

El formato de un secreto no demuestra su aleatoriedad. `INTERNAL_API_SECRET` y
`EMAIL_VERIFICATION_SECRET` deben conservar valores independientes.

## Utilidades de servidor

`@ludora/security/server` expone `isValidIp()` y `parseHttpUrl()` para ambas apps.
Este punto de entrada utiliza Node y se importa únicamente desde código de servidor.

`parseHttpUrl(value, nodeEnvironment)` devuelve una URL válida o `null`. Exige
HTTPS sin credenciales; permite HTTP sobre loopback únicamente en desarrollo y
tests. El consumidor debe proporcionar el valor desde configuración confiable y
aplicar sus restricciones adicionales de ruta, query o fragmento.

En los despliegues de Vercel y Render se debe conservar el workspace e instalar
desde la raíz, incluyendo `packages/security` y el lockfile.
