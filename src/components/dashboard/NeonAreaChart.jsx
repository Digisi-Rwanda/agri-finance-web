import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { usePortalTheme } from '../../context/PortalThemeContext'

const LIGHT_FILL = ['#0a5c18', '#2b5bb5', '#6fbf73']
const DARK_FILL = ['#fb923c', '#f472b6', '#a78bfa']

/** Smooth gradient area chart — colors adapt to light/dark theme. */
function NeonAreaChart({ data = [] }) {
  const { isDark } = usePortalTheme()

  if (data.length === 0) {
    return <p className="muted dashboard-empty">Chart data will appear when records exist.</p>
  }

  const fillStops = isDark ? DARK_FILL : LIGHT_FILL
  const strokeStart = isDark ? '#facc15' : '#00450d'
  const strokeEnd = isDark ? '#22d3ee' : '#6fbf73'
  const tooltipStyle = isDark
    ? {
        background: '#1a0b2e',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10,
        color: '#f1ecff',
      }
    : {
        background: '#ffffff',
        border: '1px solid #e1e3de',
        borderRadius: 10,
        color: '#191c1a',
      }

  return (
    <div className="neon-area-chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="neonAreaFill" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={fillStops[0]} />
              <stop offset="50%" stopColor={fillStops[1]} />
              <stop offset="100%" stopColor={fillStops[2]} />
            </linearGradient>
            <linearGradient id="neonAreaStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={strokeStart} />
              <stop offset="100%" stopColor={strokeEnd} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} width={32} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="url(#neonAreaStroke)"
            fill="url(#neonAreaFill)"
            fillOpacity={isDark ? 0.35 : 0.25}
            strokeWidth={3}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default NeonAreaChart
