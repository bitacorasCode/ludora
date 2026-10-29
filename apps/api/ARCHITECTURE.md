# Arquitectura de acceso a datos

## Responsabilidades

| Capa | Responsabilidad |
| --- | --- |
| Controller y DTO | Recibir HTTP, validar la entrada y delegar el caso de uso. |
| Service | Aplicar reglas, normalizar datos y coordinar operaciones. |
| Repository | Ejecutar las consultas Prisma del módulo propietario de los datos. |
| PrismaService | Crear el cliente y su pool, e inicializar y cerrar sus recursos. |

`UsersRepository` concentra las consultas sobre usuarios.
`EmailVerificationRepository` concentra las consultas sobre verificaciones.
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
