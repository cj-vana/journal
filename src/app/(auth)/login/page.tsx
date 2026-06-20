'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    fetch('/api/setup')
      .then((res) => res.json())
      .then((data) => {
        if (data.needsSetup) {
          router.replace('/setup')
        } else {
          setChecking(false)
        }
      })
      .catch(() => setChecking(false))
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('Invalid email or password')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  if (checking) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-warm-200 text-center">
        <p className="text-warm-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 border border-warm-200">
      <h1 className="text-3xl font-accent text-center text-warm-800 mb-2">Welcome Back</h1>
      <p className="text-warm-600 text-center mb-6">Sign in to continue writing</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm" role="alert">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-warm-600 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white border border-warm-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-accent-200 focus:border-accent-400 outline-none transition-colors"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-warm-600 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white border border-warm-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-accent-200 focus:border-accent-400 outline-none transition-colors"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent-400 hover:bg-accent-600 text-white rounded-xl px-4 py-2.5 font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-warm-600">
        Have an invite code?{' '}
        <Link href="/register" className="text-accent-400 hover:text-accent-600 font-medium">
          Register
        </Link>
      </p>
    </div>
  )
}
