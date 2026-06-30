import { motion } from 'framer-motion'

// Small KPI tile used at the top of dashboard pages.
function StatCard({ title, value, meta, accent = 'green', className = '' }) {
  return (
    <motion.article
      whileHover={{ y: -2 }}
      className={`widget card stat-card stat-card--${accent} ${className}`.trim()}
    >
      <h3>{title}</h3>
      <p>{value}</p>
      {meta ? <small>{meta}</small> : null}
    </motion.article>
  )
}

export default StatCard
