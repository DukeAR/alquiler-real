import * as React from 'react';

// Modern, trustworthy, simple logo for "Alquiler Real"
// SVG: geometric AR monogram + wordmark, palette: var(--color-primary), var(--color-primary-accent)
export const Logo: React.FC<{ height?: number; className?: string }> = ({ height = 36, className }) => (
  <svg
    viewBox="0 0 180 40"
    height={height}
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'block' }}
    aria-label="Alquiler Real logo"
  >
    {/* AR monogram */}
    <g>
      <rect x="2" y="2" width="36" height="36" rx="10" fill="var(--color-primary)" />
      <path
        d="M14 28V12h4.5l5.5 7.5V12h4v16h-4.5l-5.5-7.5V28z"
        fill="white"
      />
      <path
        d="M32 28l-3-6h-3l-3 6h3l1.5-3 1.5 3h3z"
        fill="var(--color-primary-accent)"
      />
    </g>
    {/* Wordmark */}
    <text
      x="48"
      y="27"
      fontFamily="var(--font-brand, 'Inter', 'sans-serif')"
      fontWeight="700"
      fontSize="22"
      letterSpacing="-0.5px"
      fill="var(--color-primary)"
    >
      Alquiler <tspan fill="var(--color-primary-accent)">Real</tspan>
    </text>
  </svg>
);
