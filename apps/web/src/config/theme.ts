export const THEME = {
    system: 'system',
    light: 'light',
    dark: 'dark',
} as const;

export const FAVICON_BY_THEME = {
    [THEME.light]: '/branding/favicon-light.svg',
    [THEME.dark]: '/branding/favicon-dark.svg',
} as const;
