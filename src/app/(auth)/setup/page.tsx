'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

type Step = 'welcome' | 'account' | 'baby' | 'done'

const genderOptions = [
  { value: 'girl', label: 'Girl', colors: ['#FFF5F5', '#FFCCD2', '#F4A0A8', '#D16B77'] },
  { value: 'boy', label: 'Boy', colors: ['#F0F7FF', '#BAD9FF', '#7BB4E8', '#4A8BC4'] },
  { value: 'neutral', label: 'No Preference', colors: ['#F4F8F4', '#C4D9C4', '#8CB88C', '#5A8A5A'] },
] as const

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('welcome')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [autoLoginFailed, setAutoLoginFailed] = useState(false)

  // Account fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Baby fields
  const [childName, setChildName] = useState('')
  const [appTitle, setAppTitle] = useState('')
  const [childBirthDate, setChildBirthDate] = useState('')
  const [gender, setGender] = useState('neutral')

  useEffect(() => {
    fetch('/api/setup')
      .then((res) => res.json())
      .then((data) => {
        if (!data.needsSetup) {
          router.replace('/login')
        } else {
          setLoading(false)
        }
      })
      .catch(() => setLoading(false))
  }, [router])

  async function handleSubmit() {
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          childName: childName || 'Baby',
          appTitle: appTitle || 'Our Journal',
          childBirthDate: childBirthDate || null,
          gender,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Setup failed')
      }

      // Auto-login
      const signInResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (signInResult?.error) {
        setAutoLoginFailed(true)
        setStep('done')
      } else {
        setStep('done')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-warm-200 text-center">
        <p className="text-warm-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 border border-warm-200">
      {/* Progress indicator */}
      <div className="flex justify-center gap-2 mb-8">
        {(['welcome', 'account', 'baby', 'done'] as Step[]).map((s, i) => (
          <div
            key={s}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              step === s ? 'bg-accent-400' : i < ['welcome', 'account', 'baby', 'done'].indexOf(step) ? 'bg-accent-200' : 'bg-warm-200'
            }`}
          />
        ))}
      </div>

      {step === 'welcome' && (
        <div className="text-center">
          <div className="text-5xl mb-4">&#128214;</div>
          <h1 className="text-3xl font-accent text-warm-800 mb-2">
            Welcome to Baby Journal!
          </h1>
          <p className="text-warm-600 mb-8">
            Let&apos;s get you set up in just a few steps.
          </p>
          <button
            onClick={() => setStep('account')}
            className="w-full bg-accent-400 hover:bg-accent-600 text-white rounded-xl px-4 py-2.5 font-medium transition-colors"
          >
            Get Started
          </button>
        </div>
      )}

      {step === 'account' && (
        <div>
          <h1 className="text-2xl font-accent text-warm-800 mb-1">
            Create Admin Account
          </h1>
          <p className="text-warm-600 text-sm mb-6">
            This will be the main administrator account.
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-warm-600 mb-1">
                Your Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-warm-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-accent-200 focus:border-accent-400 outline-none transition-colors"
                required
              />
            </div>
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
                minLength={8}
                required
              />
              <p className="text-xs text-warm-600 mt-1">Minimum 8 characters</p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setStep('welcome')}
              className="px-4 py-2.5 text-warm-600 hover:bg-warm-50 rounded-xl transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => {
                if (!name || !email || !password || password.length < 8) {
                  setError('Please fill in all fields (password must be 8+ characters)')
                  return
                }
                setError('')
                setStep('baby')
              }}
              className="flex-1 bg-accent-400 hover:bg-accent-600 text-white rounded-xl px-4 py-2.5 font-medium transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 'baby' && (
        <div>
          <h1 className="text-2xl font-accent text-warm-800 mb-1">
            About Your Little One
          </h1>
          <p className="text-warm-600 text-sm mb-6">
            You can always change these later in settings.
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="childName" className="block text-sm font-medium text-warm-600 mb-1">
                Child&apos;s Name
              </label>
              <input
                id="childName"
                type="text"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder="Baby"
                className="w-full bg-white border border-warm-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-accent-200 focus:border-accent-400 outline-none transition-colors"
              />
            </div>
            <div>
              <label htmlFor="appTitle" className="block text-sm font-medium text-warm-600 mb-1">
                Journal Title
              </label>
              <input
                id="appTitle"
                type="text"
                value={appTitle}
                onChange={(e) => setAppTitle(e.target.value)}
                placeholder="Our Journal"
                className="w-full bg-white border border-warm-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-accent-200 focus:border-accent-400 outline-none transition-colors"
              />
            </div>
            <div>
              <label htmlFor="birthDate" className="block text-sm font-medium text-warm-600 mb-1">
                Birth Date <span className="text-warm-400">(optional)</span>
              </label>
              <input
                id="birthDate"
                type="date"
                value={childBirthDate}
                onChange={(e) => setChildBirthDate(e.target.value)}
                className="w-full bg-white border border-warm-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-accent-200 focus:border-accent-400 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-600 mb-2">
                Color Theme
              </label>
              <div className="flex gap-3">
                {genderOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setGender(option.value)}
                    className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      gender === option.value
                        ? 'border-warm-800 bg-warm-50'
                        : 'border-warm-200 hover:border-warm-400'
                    }`}
                  >
                    <div className="flex gap-1">
                      {option.colors.map((color, i) => (
                        <div
                          key={i}
                          className="w-5 h-5 rounded-full border border-warm-200"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-medium text-warm-800">
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setStep('account')}
              className="px-4 py-2.5 text-warm-600 hover:bg-warm-50 rounded-xl transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-accent-400 hover:bg-accent-600 text-white rounded-xl px-4 py-2.5 font-medium transition-colors disabled:opacity-50"
            >
              {submitting ? 'Setting up...' : 'Complete Setup'}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="text-center">
          <div className="text-5xl mb-4">&#127881;</div>
          <h1 className="text-3xl font-accent text-warm-800 mb-2">
            You&apos;re All Set!
          </h1>
          <p className="text-warm-600 mb-8">
            {autoLoginFailed
              ? 'Your journal is ready. Please sign in to continue.'
              : 'Your journal is ready. Start capturing memories.'}
          </p>
          <button
            onClick={() => {
              if (autoLoginFailed) {
                router.push('/login')
              } else {
                router.push('/dashboard')
                router.refresh()
              }
            }}
            className="w-full bg-accent-400 hover:bg-accent-600 text-white rounded-xl px-4 py-2.5 font-medium transition-colors"
          >
            {autoLoginFailed ? 'Go to Login' : 'Go to Dashboard'}
          </button>
        </div>
      )}
    </div>
  )
}
