'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [inviteCode, setInviteCode] = useState(searchParams.get('code') || '')
  const [codeValidated, setCodeValidated] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function validateCode() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/invite/${inviteCode}`)
      const data = await res.json()
      if (data.valid) {
        setCodeValidated(true)
      } else {
        setError('Invalid or expired invite code')
      }
    } catch {
      setError('Failed to validate invite code')
    }
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, inviteCode }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Registration failed')
        setLoading(false)
        return
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Account created but login failed. Please try logging in.')
        setLoading(false)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setError('Registration failed')
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 border border-warm-200">
      <h1 className="text-3xl font-accent text-center text-warm-800 mb-2">Join the Journal</h1>
      <p className="text-warm-600 text-center mb-6">Enter your invite code to get started</p>

      {!codeValidated ? (
        <div className="space-y-4">
          {error && (
            <div className="bg-rose-50 text-rose-600 rounded-xl px-4 py-3 text-sm">{error}</div>
          )}
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-warm-600 mb-1">
              Invite Code
            </label>
            <input
              id="code"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="w-full bg-white border border-warm-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none transition-colors"
              placeholder="Enter your invite code"
              required
            />
          </div>
          <button
            onClick={validateCode}
            disabled={loading || !inviteCode}
            className="w-full bg-rose-400 hover:bg-rose-600 text-white rounded-xl px-4 py-2.5 font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Validating...' : 'Continue'}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-rose-50 text-rose-600 rounded-xl px-4 py-3 text-sm">{error}</div>
          )}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-warm-600 mb-1">Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-warm-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none transition-colors"
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-warm-600 mb-1">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-warm-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none transition-colors"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-warm-600 mb-1">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-warm-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none transition-colors"
              minLength={8}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rose-400 hover:bg-rose-600 text-white rounded-xl px-4 py-2.5 font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
      )}

      <p className="mt-4 text-center text-sm text-warm-600">
        Already have an account?{' '}
        <Link href="/login" className="text-rose-400 hover:text-rose-600 font-medium">
          Sign In
        </Link>
      </p>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-warm-200">
        <h1 className="text-3xl font-accent text-center text-warm-800 mb-2">Join the Journal</h1>
        <p className="text-warm-600 text-center mb-6">Loading...</p>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
