function PageHeader({ title, subtitle, breadcrumb, actions = null }) {
  return (
    <div className="page-header">
      <div>
        {breadcrumb ? <p className="breadcrumb">{breadcrumb}</p> : null}
        {title ? <h1>{title}</h1> : null}
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  )
}

export default PageHeader
