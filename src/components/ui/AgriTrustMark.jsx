/**
 * Agri Trust brand mark: a sprout inside a shield (agriculture + custody).
 * Inline SVG so it stays crisp at any size and inherits `currentColor`.
 */
function AgriTrustMark({ size = 20, strokeWidth = 1.75, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 2.75 4.6 5.85v5.3c0 4.55 2.98 7.8 7.4 9.4 4.42-1.6 7.4-4.85 7.4-9.4v-5.3L12 2.75Z" />
      <path d="M12 16.6v-4.2" />
      <path d="M12 12.4c0-2.3 1.5-4 3.8-4.25-.15 2.35-1.55 4-3.8 4.25Z" />
      <path d="M12 12.4c0-2.3-1.5-4-3.8-4.25.15 2.35 1.55 4 3.8 4.25Z" />
    </svg>
  )
}

export default AgriTrustMark
