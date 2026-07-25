/**
 * RollingNumber
 * Wraps @hanspeleman/rolling-number (a Web Component) for use in React.
 *
 * The web component:
 *  - Renders digits 0-9 stacked in a Shadow DOM column
 *  - CSS `transition: transform var(--roll-duration)` drives the slot-machine roll
 *  - Responds to the `value` DOM property being set (React passes it as an attribute)
 *
 * Usage:
 *   <RollingNumber value={42} duration="600ms" />
 *   <RollingNumber value="—" />          ← renders a plain dash
 */

import '@hanspeleman/rolling-number';
import { useEffect, useRef } from 'react';

export default function RollingNumber({
  value,
  duration = '550ms',
  className = '',
  style = {},
}) {
  const elRef = useRef(null);

  // Dash state — render as plain text (web component doesn't handle '—')
  const isDash = value === '—' || value === null || value === undefined || Number.isNaN(Number(value));

  // The web component responds to the `.value` JS property (not just the HTML attribute).
  // React cannot set JS properties via JSX attributes, so we do it manually via a ref.
  useEffect(() => {
    const el = elRef.current;
    if (!el || isDash) return;
    // Use requestAnimationFrame to ensure the web component is ready
    requestAnimationFrame(() => {
      el.value = Math.round(Number(value));
    });
  }, [value, isDash]);

  if (isDash) {
    return (
      <span className={className} style={style}>
        —
      </span>
    );
  }

  const numVal = Math.round(Number(value));

  return (
    // eslint-disable-next-line react/no-unknown-property
    <rolling-number
      ref={elRef}
      value={numVal}
      class={className}
      style={{
        '--roll-duration': duration,
        fontFamily: 'inherit',
        fontWeight: 'inherit',
        fontSize:   'inherit',
        letterSpacing: 'inherit',
        lineHeight: 'inherit',
        color: 'inherit',
        display: 'inline-block',
        minWidth: '0.6em',
        ...style,
      }}
    />
  );
}

