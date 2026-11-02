# Shared ESLint rules

The web app and API consume this package through `@ludora/eslint-config`.

- Sorts imports and exports.
- Removes unused imports when applying fixes.
- Warns about unused variables and arguments; allows names starting with `_`.
- Disables formatting rules that could conflict with Prettier. Prettier remains responsible for formatting.

Each app adds its own checks in `eslint.config.mjs`: Next.js and React for the web app; Node.js and TypeScript for the API, including unhandled promises.

From the repository root:

```sh
pnpm --filter api lint
pnpm --filter api lint:fix
pnpm --filter web lint
pnpm --filter web lint:fix
```

The configuration in `.vscode/settings.json` applies ESLint fixes when saving manually. It requires the VS Code ESLint extension.
