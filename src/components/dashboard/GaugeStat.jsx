/**
 * Circular gauge KPI — matches the neon dashboard reference style.
 * pct is 0–100 and controls how much of the ring is filled.
 */
function GaugeStat({ title, value, pct = 72, color = 'var(--neon-cyan)' }) {
  return (
    <article className="widget card neon-gauge">
      <h3>{title}</h3>
      <div className="neon-gauge__ring" style={{ '--pct': pct, '--ring-color': color }}>
        <span>{value}</span>
      </div>
    </article>
  )
}

export default GaugeStat
