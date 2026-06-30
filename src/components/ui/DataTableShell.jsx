function DataTableShell({ title, filters = null, footer = null, children }) {
  return (
    <section className="card table-shell">
      {title ? <h2>{title}</h2> : null}
      {filters ? <div className="filters">{filters}</div> : null}
      <div className="table-scroll">
        {children}
      </div>
      {footer ? <div className="table-footer">{footer}</div> : null}
    </section>
  )
}

export default DataTableShell
