import React from 'react';

/** A dependency-free liquid glass button for the app's existing React/CSS setup. */
export const LiquidButton = React.forwardRef(function LiquidButton(
  { children, className = '', variant = 'default', size = 'default', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`liquid-glass-button liquid-glass-button--${variant} liquid-glass-button--${size} ${className}`.trim()}
      {...props}
    >
      <span className="liquid-glass-button__lens" aria-hidden="true" />
      <span className="liquid-glass-button__content">{children}</span>
      <svg className="liquid-glass-button__filter" aria-hidden="true" focusable="false">
        <defs>
          <filter id="liquid-glass-lens" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.04 0.08" numOctaves="1" seed="7" result="noise" />
            <feGaussianBlur in="noise" stdDeviation="2" result="softNoise" />
            <feDisplacementMap in="SourceGraphic" in2="softNoise" scale="18" xChannelSelector="R" yChannelSelector="B" />
          </filter>
        </defs>
      </svg>
    </button>
  );
});

LiquidButton.displayName = 'LiquidButton';
