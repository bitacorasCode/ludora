---
name: Ludora
description: The visual system for the Ludora web app.
colors:
  primary: "#0f5961"
  primary-dark: "#82d7c9"
  primary-soft: "#dceae6"
  primary-soft-dark: "#1d3b3e"
  secondary: "#e7eeea"
  secondary-dark: "#263f43"
  secondary-foreground: "#214044"
  accent: "#e3efea"
  accent-dark: "#2a4747"
  accent-foreground: "#173c40"
  highlight: "#d99a32"
  highlight-dark: "#e6b35e"
  destructive: "#b63132"
  destructive-dark: "#ff9c96"
  background: "#f7f5f0"
  background-dark: "#12232a"
  foreground: "#17272d"
  foreground-dark: "#f0f5f2"
  card: "#ffffff"
  card-dark: "#1a2d33"
  muted: "#edf0eb"
  muted-dark: "#20363b"
  muted-foreground: "#54696a"
  muted-foreground-dark: "#afc3c0"
  border: "#cbd8d1"
  border-dark: "#415b5f"
  field-border: "#758b84"
  field-border-dark: "#8aa8a2"
  input: "#e4ece8"
  input-dark: "#263e42"
  brand-foreground: "#16545b"
  brand-foreground-dark: "#f0f5f2"
  brand-accent: "#78354d"
  brand-accent-dark: "#d89aaa"
typography:
  display:
    fontFamily: "Geist, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: "2.5rem"
    letterSpacing: "-0.025em"
  display-wide:
    fontFamily: "Geist, sans-serif"
    fontSize: "3.75rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Geist, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: "2rem"
    letterSpacing: "-0.025em"
  headline-wide:
    fontFamily: "Geist, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: "2.25rem"
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: "1.75rem"
    letterSpacing: "-0.025em"
  lead:
    fontFamily: "Noto Sans, sans-serif"
    fontSize: "1.125rem"
    lineHeight: "2rem"
  body:
    fontFamily: "Noto Sans, sans-serif"
    fontSize: "1rem"
    lineHeight: "1.75rem"
  label:
    fontFamily: "Noto Sans, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1
  button-label:
    fontFamily: "Geist, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: "1.25rem"
  eyebrow:
    fontFamily: "Geist, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: "1.25rem"
    letterSpacing: "0.16em"
  mono:
    fontFamily: "Geist Mono, monospace"
rounded:
  sm: "0.45rem"
  md: "0.6rem"
  lg: "0.75rem"
  xl: "1.05rem"
  2xl: "1.35rem"
spacing:
  step: "0.25rem"
  label-gap: "0.5rem"
  control-inline: "0.75rem"
  page-gutter: "1rem"
  page-gutter-sm: "1.5rem"
  page-gutter-lg: "2rem"
  card-inset: "1.5rem"
  card-inset-sm: "1rem"
  hero-inset: "2rem"
  hero-inset-wide: "3rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.card}"
    typography: "{typography.button-label}"
    rounded: "{rounded.lg}"
    padding: "0 0.75rem"
    height: "2.25rem"
  button-primary-dark:
    backgroundColor: "{colors.primary-dark}"
    textColor: "{colors.background-dark}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
  button-outline:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
  button-destructive:
    textColor: "{colors.destructive}"
  button-link:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
  text-input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "0.25rem 0.75rem"
    height: "2.25rem"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.2xl}"
    padding: "{spacing.card-inset}"
  card-hero:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.2xl}"
    padding: "{spacing.hero-inset}"
  section-navigation-active:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    typography: "{typography.button-label}"
    rounded: "{rounded.lg}"
    height: "2.25rem"
---

# Design System for Ludora

## Overview

Ludora uses warm paper and white surfaces in light mode, and deep blue-green
surfaces in dark mode. Rounded controls, a square-tile logo, and a restrained
amber highlight connect the interface to board games. The patterned hero
gives the home page a stronger visual treatment than the account and form
screens.

The semantic theme values live in [globals.css](src/app/globals.css).
The examples below describe the components and their current variants.

## Colors

### Primary

- Petroleum teal fills primary actions in light mode with white text. Mint
  fills those actions in dark mode with ink-colored text. The focus ring
  follows the primary color in each theme.
- The soft primary surface supports the hero card and avatar fallback.

### Secondary

- The lighter green-gray surface sets off secondary actions and the current
  account section. Selection and interactive emphasis also use the theme's
  accent pair, as in select menu items.
- Amber appears in the square beside an eyebrow label and in the radial
  highlight behind the home hero.
- Destructive red is reserved for errors and destructive actions. It becomes
  a softer red in dark mode for legibility on deep surfaces.

### Neutral

- The page, card, and popover tokens establish the surface hierarchy. Cards
  and popovers use white in light mode and the same raised blue-green in
  dark mode.
- Use the muted foreground for descriptions and placeholders. Use the
  standard border for surfaces and the stronger field border for input
  outlines and outline buttons.
- In the light home hero, use the foreground color for the description
  to keep it legible over the grid.

### Brand artwork

The logo combines three rounded tiles arranged as an L, a smaller accent
tile, and a custom wordmark. In light mode the artwork uses petroleum teal
and burgundy. In dark mode it uses off-white and muted rose. The header logo
follows the selected app theme. The favicon follows the system theme and
uses its own solid background. Both come from the same artwork.
[Logo source](src/components/branding/ludora-logo.tsx)

## Typography

- **Geist** gives page headings and button labels a shared visual voice.
  Page titles are semibold and tightly tracked, increasing from 2.25rem
  to 3.75rem at the small breakpoint. Section titles increase from 1.5rem
  to 1.875rem. Card titles use 1.25rem.
- **Noto Sans** is the default reading and form font. Body copy uses 1rem
  with a 1.75rem line height. Introductory copy uses 1.125rem with a 2rem
  line height. Form labels use 0.875rem at medium weight.
- **Geist Mono** is available through the shared monospace utility.
- Where a shared heading includes an eyebrow, it places an uppercase 0.875rem
  Geist label with 0.16em tracking beside the amber square.

See the [fonts](src/config/fonts.ts) and [shared typography](src/components/typography/typography.tsx).

## Layout

- The page and header share a centered 72rem maximum width. Side gutters
  are 1rem by default, 1.5rem at 40rem, and 2rem at 64rem.
- The standard section uses a 1.5rem vertical gap and 3.5rem of vertical
  padding, rising to 5rem at 40rem. Page heading groups cap text at 48rem.
- Below 64rem, account navigation wraps into rows above the content.
  At 64rem and wider it becomes a 14rem sticky sidebar beside a flexible
  content column. The header switches from a menu drawer to inline links
  at the same breakpoint.

See the [page layout](src/components/layout/page-layout.tsx),
[section navigation](src/components/navigation/section-navigation.tsx), and
[account shell](src/features/account/components/account-shell.tsx).

## Elevation & Depth

Surface color and borders provide most of the separation. Default cards and
the hero use the small shadow. Empty-state cards use a dashed outline and a
translucent card fill. Select menus use the large shadow. Dialogs and
drawers use the extra-large shadow above a dimmed backdrop. The sticky header
uses a translucent card surface with backdrop blur and a bottom border.

## Shapes

The shared radius starts at 0.75rem for buttons, inputs, and select triggers.
Menu panels use 1.05rem. Cards and dialogs use the broader 1.35rem radius.
Avatars are circular. The square logo tiles and square eyebrow marker give the
brand a repeatable geometric detail.

## Components

### Buttons

The shared button uses a 2.25rem default height and 0.75rem horizontal
padding. The large size raises the height to 2.5rem for prominent actions.
Use the primary fill for the main action, secondary for softer emphasis,
outline to define a control on a surface, ghost for quiet actions, and link
for text that underlines on hover. Destructive actions use red text on a
tinted red surface. Keyboard focus uses a themed border and a 3px ring.
[Button](src/components/ui/button.tsx)

### Cards

Standard cards have a solid border, a card surface, and a 1.5rem inset.
Compact cards reduce the inset to 1rem. The hero uses the soft primary
surface with a 3.25rem grid and an amber radial highlight. Its inset grows
from 2rem to 3rem at 40rem. Empty-state cards use the dashed border treatment
for views such as games, ranking, and activity.
[Card](src/components/ui/card.tsx)

### Form fields

Text inputs and select triggers use the card surface and a stronger field
border. The text input uses 1rem type below 48rem and 0.875rem above that
breakpoint. A visible focus border and ring mark keyboard focus. Invalid
controls use the destructive token and pair with the form's error copy.
[Input](src/components/ui/input.tsx) and [Field](src/components/ui/field.tsx)

### Navigation and overlays

The header uses quiet ghost links and a bordered menu trigger on smaller
screens. The account navigation uses a secondary fill, an underline, and
`aria-current` for the active page. Other entries use ghost styling. Dialogs retain
a named close action and use the shared popover surface. Dialog motion and
loading skeleton pulses respect reduced motion.
[Section navigation](src/components/navigation/section-navigation.tsx),
[Dialog](src/components/ui/dialog.tsx), and [Skeleton](src/components/ui/skeleton.tsx)

### Avatars and loading

The avatar crops the selected artwork into a circle. Its fallback shows
the user's initial in semibold Geist on the soft primary surface. Loading
skeletons use muted rounded blocks sized by the screen that renders them.
The profile card and its skeleton share the layout for the avatar, name,
edit action, and biography. The edit action sits above the biography on
narrow screens and beside the name on wider screens.
[Avatar](src/components/ui/avatar.tsx)

## Do's and Don'ts

- **Do** pair each semantic background with its corresponding foreground and
  use the shared focus ring in both themes.
- **Do** use the matching artwork variant for the app logo and the favicon.
- **Do** reuse shared button, field, card, and navigation variants for their
  existing roles.
