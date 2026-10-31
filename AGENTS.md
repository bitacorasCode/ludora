# Convenciones de constantes

- Dar nombres descriptivos a los valores que representan reglas de negocio,
  límites, plazos, configuración, estados propios de la aplicación o contratos
  de comunicación. Evitar números o strings cuyo significado dependa de conocer
  su contexto.
- Mantener las constantes cerca de su propietario. Compartirlas dentro de una
  app cuando tengan varios consumidores; utilizar un paquete del workspace
  cuando ambas apps deban cumplir exactamente la misma regla.
- Reutilizar los catálogos existentes de rutas, formularios, entorno, tema,
  tiempos, autenticación y errores antes de crear constantes equivalentes.
- Mantener las unidades en los nombres: segundos, milisegundos, bytes, etc.
- Los atributos HTML, clases CSS, claves de traducción, declaraciones de rutas
  del framework e índices u operaciones aritméticas evidentes pueden permanecer
  como literales. Extraerlos cuando representen una decisión o un contrato que
  necesite un nombre o reutilización, evitando constantes que solo repitan el
  mismo literal sin explicar nada.
- Al refactorizar constantes, conservar los valores y el comportamiento actual.
  Mantener las credenciales en variables de entorno y fuera de los catálogos
  compartidos.
