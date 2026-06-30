import { usePortalTheme } from '../../context/PortalThemeContext'

const BLOCK_COLORS_DARK = ['#ff2d95', '#22d3ee', '#facc15', '#a3e635', '#fb923c', '#a78bfa']
const BLOCK_COLORS_LIGHT = ['#00450d', '#0a5c18', '#2b5bb5', '#6fbf73', '#4a7c59', '#60a5fa']

/** Vertical stacked bars — palette switches with portal theme. */
function NeonSegmentChart({ rows = [], emptyMessage = 'No data yet.' }) {
  const { isDark } = usePortalTheme()
  const blockColors = isDark ? BLOCK_COLORS_DARK : BLOCK_COLORS_LIGHT

  if (rows.length === 0) {
    return <p className="muted dashboard-empty">{emptyMessage}</p>
  }

  const max = Math.max(...rows.map((row) => row.value), 1)

  return (
    <div className="neon-segment-chart">
      {rows.map((row, index) => {
        const blocks = Math.max(1, Math.round((row.value / max) * 10))
        return (
          <div className="neon-segment-col" key={row.label}>
            <div className="neon-segment-stack">
              {Array.from({ length: blocks }).map((_, blockIndex) => (
                <div
                  key={`${row.label}-${blockIndex}`}
                  className="neon-segment-block"
                  style={{ background: blockColors[(index + blockIndex) % blockColors.length] }}
                />
              ))}
            </div>
            <span>{row.label}</span>
          </div>
        )
      })}
    </div>
  )
}

export default NeonSegmentChart
