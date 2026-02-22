import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl font-accent text-warm-400 mb-4">404</h1>
        <p className="text-warm-600 mb-6">Page not found</p>
        <Link
          href="/dashboard"
          className="bg-accent-400 hover:bg-accent-600 text-white rounded-xl px-6 py-2.5 font-medium transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}
