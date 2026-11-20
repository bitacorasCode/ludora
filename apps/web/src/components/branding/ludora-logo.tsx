import type { ComponentProps, CSSProperties } from 'react';

const BRAND_PALETTE = {
  light: { foreground: '#16545b', accent: '#78354d', background: '#f7f5f0' },
  dark: { foreground: '#f0f5f2', accent: '#d89aaa', background: '#12232a' },
} as const;

const THEMED_PALETTE = {
  foreground: 'var(--brand-foreground)',
  accent: 'var(--brand-accent)',
  background: 'var(--brand-background)',
};

const BRAND_THEME_STYLE: CSSProperties & Record<`--brand-${string}`, string> = {
  '--brand-light-foreground': BRAND_PALETTE.light.foreground,
  '--brand-light-accent': BRAND_PALETTE.light.accent,
  '--brand-light-background': BRAND_PALETTE.light.background,
  '--brand-dark-foreground': BRAND_PALETTE.dark.foreground,
  '--brand-dark-accent': BRAND_PALETTE.dark.accent,
  '--brand-dark-background': BRAND_PALETTE.dark.background,
};

type LudoraSvgProps = ComponentProps<'svg'> & {
  theme?: keyof typeof BRAND_PALETTE;
};

type LudoraArtworkProps = LudoraSvgProps & {
  variant: 'mark' | 'favicon' | 'logo';
};

function LudoraArtwork({ variant, theme, style, ...props }: LudoraArtworkProps) {
  const isLogo = variant === 'logo';
  const isFavicon = variant === 'favicon';
  const colors = theme ? BRAND_PALETTE[theme] : THEMED_PALETTE;
  const inset = isFavicon ? 4 : 2;
  const tileSize = 15 - inset;
  const accentSize = isFavicon ? 8 : 9;
  const tile = { width: tileSize, height: tileSize, rx: isFavicon ? 2.5 : 3 };

  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width={isLogo ? 144 : 32}
      height={32}
      viewBox={isLogo ? '0 0 144 32' : '0 0 32 32'}
      focusable='false'
      data-ludora-brand={theme ? undefined : ''}
      style={theme ? style : { ...BRAND_THEME_STYLE, ...style }}
      {...props}
    >
      {isFavicon && <rect width='32' height='32' rx='6' fill={colors.background} />}
      <g fill={colors.foreground}>
        <rect x={inset} y={inset} {...tile} />
        <rect x={inset} y='17' {...tile} />
        <rect x='17' y='17' {...tile} />
      </g>
      <rect
        x='17'
        y={15 - accentSize}
        width={accentSize}
        height={accentSize}
        rx={isFavicon ? 2 : 2.2}
        fill={colors.accent}
      />
      {isLogo && (
        <g
          fill='none'
          stroke={colors.foreground}
          strokeWidth='3.8'
          strokeLinecap='round'
          strokeLinejoin='round'
        >
          <path d='M44 7v18h11' />
          <path d='M61 13v6.5c0 3.7 1.8 5.5 4.7 5.5 3 0 5.3-2.3 5.3-5.5V13m0 6.5V25' />
          <ellipse cx='83.3' cy='19' rx='5.9' ry='6.2' />
          <path d='M89.2 7v18' />
          <ellipse cx='101.5' cy='19' rx='6.1' ry='6.2' />
          <path d='M115 25V13m0 6c0-3.6 2.1-6 6-6' />
          <ellipse cx='132.8' cy='19' rx='5.9' ry='6.2' />
          <path d='M138.7 13v12' />
        </g>
      )}
    </svg>
  );
}

export function LudoraMark({
  variant = 'mark',
  ...props
}: LudoraSvgProps & { variant?: 'mark' | 'favicon' }) {
  return <LudoraArtwork variant={variant} {...props} />;
}

export function LudoraLogo(props: LudoraSvgProps) {
  return <LudoraArtwork variant='logo' {...props} />;
}
