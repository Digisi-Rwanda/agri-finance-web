/**
 * Horizontal bar chart without a chart library.
 * Pass rows like [{ label: 'Low', value: 12 }].
 */
function SimpleBarChart({ rows = [], emptyMessage = 'No data yet.' }) {
  const max = Math.max(...rows.map((row) => row.value), 1)

  if (rows.length === 0) {
    return <p className="muted dashboard-empty">{emptyMessage}</p>
  }

  return (
    <div className="chart-area">
      {rows.map((row) => (
        <div className="bar-row" key={row.label}>
          <span>{row.label}</span>
          <div className="bar-row__track">
            <div
              className="bar-row__fill"
              style={{ width: `${(row.value / max) * 100}%` }}
              title={`${row.value}`}
            />
          </div>
          <span className="bar-row__count">{row.value}</span>
        </div>
      ))}
    </div>
  )
}

export default SimpleBarChart
