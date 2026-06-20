'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import DatePicker from '@/components/ui/DatePicker'

interface AppSettings {
  childName: string
  appTitle: string
  childBirthDate: string | null
  gender: string
}

interface SettingsFormProps {
  initialSettings: AppSettings
}

const genderOptions = [
  { value: 'girl', label: 'Girl', colors: ['#FFF5F5', '#FFCCD2', '#F4A0A8', '#D16B77'] },
  { value: 'boy', label: 'Boy', colors: ['#F0F7FF', '#BAD9FF', '#7BB4E8', '#4A8BC4'] },
  { value: 'neutral', label: 'No Preference', colors: ['#F4F8F4', '#C4D9C4', '#8CB88C', '#5A8A5A'] },
] as const

export default function SettingsForm({ initialSettings }: SettingsFormProps) {
  const router = useRouter()
  const [childName, setChildName] = useState(initialSettings.childName)
  const [appTitle, setAppTitle] = useState(initialSettings.appTitle)
  const [childBirthDate, setChildBirthDate] = useState(
    initialSettings.childBirthDate
      ? initialSettings.childBirthDate.split('T')[0]
      : ''
  )
  const [gender, setGender] = useState(initialSettings.gender || 'neutral')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childName,
          appTitle,
          childBirthDate: childBirthDate || null,
          gender,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save settings')
      }

      setMessage({ type: 'success', text: 'Settings saved successfully!' })
      // Refresh server components so layout picks up new appTitle/childName/theme
      router.refresh()
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save settings',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      <Input
        label="Child's Name"
        value={childName}
        onChange={(e) => setChildName(e.target.value)}
        placeholder="Baby"
      />
      <Input
        label="App Title"
        value={appTitle}
        onChange={(e) => setAppTitle(e.target.value)}
        placeholder="Our Journal"
      />
      <DatePicker
        label="Child's Birth Date"
        value={childBirthDate}
        onChange={(e) => setChildBirthDate(e.target.value)}
      />

      <div>
        <span className="block text-sm font-medium text-warm-800 mb-2">
          Color Theme
        </span>
        <div role="radiogroup" aria-label="Color Theme" className="flex gap-3">
          {genderOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={gender === option.value}
              onClick={() => setGender(option.value)}
              className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                gender === option.value
                  ? 'border-warm-800 bg-warm-50'
                  : 'border-warm-200 hover:border-warm-400'
              }`}
            >
              <div className="flex gap-1" aria-hidden="true">
                {option.colors.map((color, i) => (
                  <div
                    key={i}
                    className="w-5 h-5 rounded-full border border-warm-200"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-warm-800">
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {message && (
        <p
          role={message.type === 'success' ? 'status' : 'alert'}
          className={`text-sm rounded-lg p-3 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-600'
          }`}
        >
          {message.text}
        </p>
      )}

      <Button type="submit" disabled={saving}>
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </form>
  )
}
