# Project language

- Use English for source code, comments, email templates, documentation, and
  other nonlocalized project text.
- Keep Spanish website translations in `apps/web/src/messages/es.json`.
  Tests that exercise Spanish translations must retain the corresponding
  localized input and expectations.

# Constant conventions

- Give descriptive names to values that represent business rules, limits,
  deadlines, configuration, application states, or communication contracts.
  Avoid numbers or strings whose meaning depends on knowing their context.
- Keep constants close to their owner. Share them within an app when they have
  multiple consumers; use a workspace package when both apps must follow
  exactly the same rule.
- Reuse existing route, form, environment, theme, time, authentication, and error
  catalogs before introducing equivalent constants.
- Include units in names: seconds, milliseconds, bytes, and so on.
- HTML attributes, CSS classes, translation keys, framework route declarations,
  and obvious indices or arithmetic may remain literals. Extract them when they
  represent a decision or contract that needs a name or reuse. Avoid constants
  that merely repeat the same literal without explaining its meaning.
- Preserve existing values and behavior when refactoring constants. Keep
  credentials in environment variables and out of shared catalogs.
