import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <section className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <article className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Error 404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Page Not Found</h1>
        <p className="mt-3 text-slate-600">The page you requested does not exist or was moved.</p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-800"
        >
          Go back to dashboard
        </Link>
      </article>
    </section>
  )
}

export default NotFoundPage
