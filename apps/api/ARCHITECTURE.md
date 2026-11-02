# Arquitectura de acceso a datos

## Imports e índices

- Utilizar `index.ts` como punto de entrada de una carpeta cuando agrupe exports
  relacionados y simplifique sus consumidores, como los DTOs de autenticación.
- Declarar los exports explícitamente y utilizar `export type` o `import type`
  para los símbolos que solo representan tipos.
- Dentro de una carpeta, importar las dependencias de archivos vecinos
  directamente; evitar importar un índice que también exporte al consumidor.
- Conservar los imports relativos con archivo y extensión `.js` para NodeNext.
- Revisar las dependencias transitivas al ampliar un índice: reexportar un módulo
  también puede cargar sus dependencias e introducir un ciclo.

## Configuración criptográfica

Los nombres compartidos de algoritmos y codificaciones se declaran en
`common/constants/crypto.ts`. Las configuraciones de cada flujo seleccionan
estos valores y mantienen sus propias longitudes, caducidades y reglas.
La autenticación interna convierte el secreto a bytes UTF-8 para comparar
exactamente su representación de texto.

## Responsabilidades

| Capa | Responsabilidad |
| --- | --- |
| Controller y DTO | Recibir HTTP, validar la entrada y delegar el caso de uso. |
| Service | Aplicar reglas, normalizar datos y coordinar operaciones. |
| Repository | Ejecutar las consultas Prisma del módulo propietario de los datos. |
| PrismaService | Crear el cliente y su pool, e inicializar y cerrar sus recursos. |

`UsersRepository` concentra las consultas sobre usuarios.
`EmailVerificationRepository` concentra las consultas sobre verificaciones.
`PasswordResetRepository` concentra las consultas sobre recuperaciones de contraseña.
Los repositorios son providers internos de sus módulos; otros módulos utilizan
sus servicios públicos.

Por ejemplo, `UsersService.create()` normaliza el nickname y el correo, y luego
delega la escritura en `UsersRepository.create()`.

## Transacciones

El servicio que coordina un caso de uso abre su transacción con
`PrismaService.$transaction()`. Los servicios y repositorios involucrados reciben
el mismo `Prisma.TransactionClient` mediante el argumento `transaction`.

- `AuthService` coordina la creación del usuario y su verificación.
- `EmailVerificationService` coordina el consumo del código y la activación del usuario.
- La activación del usuario pasa por `UsersService` y `UsersRepository`.
- La reserva de un intento y el consumo del código requieren una transacción explícita.
- El reenvío reserva `lastSentAt` con una actualización condicional y renueva el
  código dentro de la misma transacción. Ese bloqueo también coordina los reenvíos
  simultáneos y la confirmación del correo.
- `lastSentAt` representa la reserva del envío, incluso si SMTP no confirma la
  entrega. Cada reenvío genera un código aleatorio, renueva su caducidad
  y reinicia sus intentos sin cambiar el identificador de verificación.
- En la confirmación, los errores de validación se lanzan después de terminar
  la transacción para conservar los intentos fallidos.
- El envío SMTP se realiza después de confirmar la transacción de registro.
- Los reenvíos también contactan SMTP después de confirmar su transacción.

Los servicios conservan las decisiones del proceso. Los repositorios reciben
datos preparados, fechas y límites para construir las consultas correspondientes.

## Lecturas y respuestas

La creación y lectura pública de usuarios seleccionan `id`, `nickname`, `email`
y `createdAt`. La búsqueda por correo usada para autenticar incluye el hash de
contraseña; esa fila completa pertenece al flujo interno de autenticación y no
se devuelve directamente en una respuesta HTTP.

El login comprueba la contraseña antes de devolver el siguiente paso:

- `authenticated` incluye el JWT y los datos públicos del usuario verificado.
- `verifyEmail` incluye únicamente el identificador de verificación, su
  caducidad y la fecha disponible para reenviar. No crea una sesión.

`EmailVerificationService.getPending()` consulta el repositorio por el usuario
único y exige que su correo siga pendiente. Retomar este flujo es una lectura:
no renueva el código, no envía correo ni cambia intentos o tiempos de espera.
La lectura incluye verificaciones caducadas para permitir el reenvío existente.
Si no encuentra una verificación pendiente, el login conserva el error de correo
sin verificar y no emite un JWT. Una confirmación concurrente puede volver
obsoleta esta lectura; el cliente podrá repetir el login sin saltarse la
verificación.

## Modelo de recuperación de contraseña

`PasswordResetTokenService.create()` genera una credencial temporal con su token,
hash y caducidad. La configuración inicial utiliza 32 bytes aleatorios en
`base64url`, un hash SHA-256 en hexadecimal y una vigencia de 30 minutos.
`hash(token)` comparte la misma transformación para la futura búsqueda de la solicitud.
El token original deberá utilizarse exclusivamente para el enlace del correo;
no deberá persistirse, registrarse en logs ni devolverse en la respuesta pública
de solicitud de recuperación.

`PasswordReset` define como máximo una solicitud por usuario. `tokenHash` permite
buscar la solicitud sin guardar el token que se enviará en el enlace del correo.
Una renovación deberá sustituir el hash y la caducidad, invalidando el enlace anterior.
`lastSentAt` representa la reserva del envío, como en la verificación de correo;
no garantiza que SMTP haya entregado el mensaje.

El consumo deberá eliminar la solicitud de forma condicional por hash y
caducidad, dentro de la misma transacción que cambie la contraseña. Solo podrá
continuar si se ha eliminado una fila. Así se evitarán la reutilización y los
consumos concurrentes del mismo enlace.

`PasswordResetRepository.reserveRequest()` intenta insertar la solicitud omitiendo
duplicados. Si ya existe, la renueva únicamente cuando `lastSentAt` cumple el
límite temporal recibido. Tanto la reserva como el consumo requieren que el
servicio les pase una transacción. La búsqueda por hash devuelve únicamente el
usuario asociado y la caducidad.

El servicio deberá calcular `lastSentAt` y el límite de reserva desde la misma
hora. Para consumir el token, deberá tomar una hora actual dentro de la
transacción, después de calcular el hash de la nueva contraseña.

## Solicitud del enlace de recuperación

`PasswordRecoveryService.request(email)` programa el procesamiento y termina sin
esperar a la búsqueda de la cuenta, la reserva o SMTP. No devuelve datos del
usuario ni el estado del correo. Esto permite que el futuro endpoint responda
igual ante una cuenta existente, desconocida o dentro de su espera entre solicitudes.

El procesamiento busca al usuario mediante `UsersService`, genera la credencial
y reserva la solicitud en una transacción. La espera inicial por cuenta es de
60 segundos. El correo se envía después del commit; un fallo de SMTP conserva
la reserva y solo produce un log genérico, sin correos, enlaces ni tokens.
Solicitar recuperación no modifica la contraseña ni verifica el correo.

`PASSWORD_RESET_URL` es una URL completa obtenida de configuración confiable.
En local apunta a `http://localhost:3000/reset-password`, dejando la elección
del idioma al proxy de Next. Se valida con `parseHttpUrl()` compartido entre
ambas apps, más el rechazo de query y fragmento iniciales. El token se añade
con `URLSearchParams`. En producción se exige HTTPS; HTTP solo se admite para
loopback en desarrollo y tests.

El procesamiento actual vive en memoria de la API. Un reinicio o despliegue
puede perder solicitudes pendientes; una cola persistente será necesaria para
garantizar reintentos y durabilidad del trabajo.
