# Reglas compartidas de ESLint

Web y API consumen este paquete mediante `@ludora/eslint-config`.

- Ordena imports y exports.
- Elimina imports sin uso al aplicar correcciones.
- Advierte sobre variables y argumentos sin uso; permite nombres que comienzan por `_`.
- Desactiva las reglas de formato que puedan entrar en conflicto con Prettier. El formato sigue siendo responsabilidad de Prettier.

Cada aplicación añade sus comprobaciones específicas en su `eslint.config.mjs`: Next.js y React en web; Node.js y TypeScript en API, incluyendo promesas sin gestionar.

Desde la raíz del repositorio:

```sh
pnpm --filter api lint
pnpm --filter api lint:fix
pnpm --filter web lint
pnpm --filter web lint:fix
```

La configuración de `.vscode/settings.json` aplica las correcciones de ESLint al guardar manualmente. Requiere la extensión ESLint de VS Code.
