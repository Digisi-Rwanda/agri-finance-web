function PageHeader({ title, subtitle, actions = null }) {
  return (
    <div className="page-header">
      <div>
        {title ? <h1>{title}</h1> : null}
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  )
}

export default PageHeader
