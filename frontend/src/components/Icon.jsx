// Graphical icon set. <Ico e="📊" tip="Analytics" /> renders an SVG for the
// emoji and, when `tip` is given, wraps it in a styled hover tooltip (see the
// .tip rules in index.css). Any emoji without a mapped SVG falls back to the
// emoji itself, so nothing ever breaks.
import React from 'react'

const SW = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }

const ICONS = {
  '🏠': <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></>,
  '📦': <><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 7v10l9 4 9-4V7" /><path d="M12 11v10" /></>,
  '💳': <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>,
  '💰': <><path d="M3 7a2 2 0 0 1 2-2h12v4" /><path d="M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5" /><circle cx="16" cy="13" r="1.3" /></>,
  '🏦': <><path d="M3 10l9-6 9 6" /><path d="M5 10v8m5-8v8m4-8v8m5-8v8" /><path d="M2 21h20" /></>,
  '🎉': <><path d="M4 20l5-13 8 8z" /><path d="M14 5l1-2M18 8l2-1M16 12l2 0" /></>,
  '⭐': <path d="M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-2.9L6.4 19.6l1.1-6L3.1 9.4l6-.8z" />,
  '✨': <path d="M12 3l1.8 5.5L19 10l-5.2 1.5L12 17l-1.8-5.5L5 10l5.2-1.5z" />,
  '✈️': <path d="M2 12l19-7-7 19-2.6-8.4z" />,
  '🛒': <><circle cx="9" cy="20" r="1.4" /><circle cx="17" cy="20" r="1.4" /><path d="M2 3h3l2.4 12.3a1 1 0 0 0 1 .7h8.6a1 1 0 0 0 1-.8L21 7H6" /></>,
  '🛍': <><path d="M6 8h12l1 12H5z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
  '🚗': <><path d="M4 12l2-5h12l2 5" /><path d="M2 12h20v5H2z" /><circle cx="7" cy="17.5" r="1.4" /><circle cx="17" cy="17.5" r="1.4" /></>,
  '🚌': <><rect x="4" y="4" width="16" height="13" rx="2" /><path d="M4 11h16" /><circle cx="8" cy="18" r="1.4" /><circle cx="16" cy="18" r="1.4" /></>,
  '💼': <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M3 13h18" /></>,
  '👗': <path d="M9 3l-5 3 2 3 3-1v11h6V8l3 1 2-3-5-3-2 2z" />,
  '🥗': <><path d="M3 11h18a9 9 0 0 1-18 0z" /><path d="M6 11a6 6 0 0 1 12 0" /></>,
  '🔁': <><path d="M17 2l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></>,
  '🔀': <><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" /></>,
  '📷': <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7l1.5-3h5L16 7" /><circle cx="12" cy="13" r="3.4" /></>,
  '📶': <><path d="M4 20v-3" /><path d="M9 20v-7" /><path d="M14 20v-11" /><path d="M19 20V5" /></>,
  '📊': <><line x1="6" y1="20" x2="6" y2="12" /><line x1="12" y1="20" x2="12" y2="6" /><line x1="18" y1="20" x2="18" y2="9" /><line x1="3" y1="20" x2="21" y2="20" /></>,
  '📈': <><path d="M3 17l6-6 4 4 8-8" /><path d="M17 7h4v4" /></>,
  '💻': <><rect x="4" y="5" width="16" height="11" rx="1" /><path d="M2 20h20" /></>,
  '🐷': <><path d="M4 13a6 5 0 0 1 12 0c1.5 0 2 1 2 2v3h-3l-1 2h-3l-1-2H6a3 3 0 0 1-2-5z" /><circle cx="9" cy="12" r="1" /><path d="M15 10l2-1" /></>,
  '🏥': <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M12 8v8M8 12h8" /></>,
  '🏋️': <path d="M2 9v6M5 7v10M19 7v10M22 9v6M5 12h14" />,
  '🎬': <><rect x="3" y="8" width="18" height="12" rx="2" /><path d="M3 8l2-4 4 1-2 4M9 5l4 1-2 4M15 6l4 1-2 4" /></>,
  '🎁': <><rect x="3" y="8" width="18" height="4" /><path d="M5 12v9h14v-9" /><path d="M12 8v13" /><path d="M12 8C11 4 8 4 8 6s2 2 4 2zM12 8c1-4 4-4 4-2s-2 2-4 2z" /></>,
  '🍎': <><path d="M12 8c-2-3-7-2-7 3 0 4 3 9 5 9 1 0 1-1 2-1s1 1 2 1c2 0 5-5 5-9 0-5-5-6-7-3z" /><path d="M12 8V4" /></>,
  '🤖': <><rect x="5" y="8" width="14" height="10" rx="2" /><path d="M12 8V5M9 13h.01M15 13h.01" /><circle cx="12" cy="4" r="1" /></>,
  '🎓': <><path d="M2 8l10-4 10 4-10 4z" /><path d="M6 10v5c0 1 3 3 6 3s6-2 6-3v-5" /></>,
  '🍽️': <><path d="M4 3v7a2 2 0 0 0 2 2M6 3v18M18 3c-2 0-3 2-3 4s1 3 3 3zM18 10v11" /></>,
  '👤': <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  '🧓': <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  '🎯': <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></>,
  '🛡️': <path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z" />,
  '🛡': <path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z" />,
  '🚫': <><circle cx="12" cy="12" r="9" /><path d="M5.5 5.5l13 13" /></>,
  '🚀': <><path d="M12 3c3 1 5 4 5 8l-2 4H9l-2-4c0-4 2-7 5-8z" /><path d="M9 15l-2 4M15 15l2 4" /><circle cx="12" cy="10" r="1.3" /></>,
  '🔒': <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  '📥': <><path d="M12 3v11" /><path d="M7 10l5 5 5-5" /><path d="M4 21h16" /></>,
  '📤': <><path d="M12 15V4" /><path d="M7 9l5-5 5 5" /><path d="M4 21h16" /></>,
  '⬆': <><path d="M12 20V5" /><path d="M6 11l6-6 6 6" /></>,
  '⭳': <><path d="M12 3v12" /><path d="M6 11l6 6 6-6" /><path d="M4 21h16" /></>,
  '📚': <><path d="M4 5h5v15H4zM11 5h5v15h-5z" /><path d="M18 6l2 .4-3 14.2-2-.4z" /></>,
  '📋': <><rect x="5" y="4" width="14" height="17" rx="2" /><rect x="9" y="2" width="6" height="4" rx="1" /></>,
  '📅': <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></>,
  '💵': <><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></>,
  '💬': <path d="M4 4h16v12H8l-4 4z" />,
  '👍': <><path d="M7 11v9H4v-9z" /><path d="M7 11l4-8c2 0 3 1 3 3l-1 4h6l-2 9H7" /></>,
  '🏷️': <><path d="M3 3h8l10 10-8 8L3 11z" /><circle cx="7.5" cy="7.5" r="1.4" /></>,
  '🏢': <><rect x="5" y="3" width="14" height="18" rx="1" /><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01" /></>,
  '🌐': <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>,
  '✂️': <><circle cx="6" cy="6" r="2.5" /><circle cx="6" cy="18" r="2.5" /><path d="M8 8l12 8M8 16L20 8" /></>,
  '✕': <path d="M6 6l12 12M18 6L6 18" />,
  '✓': <path d="M5 12l4 4 10-11" />,
  '→': <><path d="M4 12h16" /><path d="M14 6l6 6-6 6" /></>,
  '➤': <><path d="M4 12h16" /><path d="M14 6l6 6-6 6" /></>,
  '←': <><path d="M20 12H4" /><path d="M10 6l-6 6 6 6" /></>,
}

export default function Ico({ e, tip, size = 18, color, style, className, ...rest }) {
  const inner = ICONS[e]
  const svg = inner
    ? <svg width={size} height={size} viewBox="0 0 24 24" {...SW} style={{ color, display: 'block', ...style }} aria-hidden="true">{inner}</svg>
    : <span style={{ fontSize: size, lineHeight: 1, ...style }} aria-hidden="true">{e}</span>
  if (!tip) return svg
  return (
    <span className={`tip${className ? ' ' + className : ''}`} data-tip={tip} style={{ display: 'inline-flex', alignItems: 'center' }} {...rest}>
      {svg}
    </span>
  )
}
