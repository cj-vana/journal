'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import DatePicker from '@/components/ui/DatePicker'

interface AppSettings {
  childName: string
  appTitle: string
  childBirthDate: string | null
}

interface SettingsFormProps {
  initialSettings: AppSettings
}

export default function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [childName, setChildName] = useState(initialSettings.childName)
  const [appTitle, setAppTitle] = useState(initialSettings.appTitle)
  const [childBirthDate, setChildBirthDate] = useState(
    initialSettings.childBirthDate
      ? initialSettings.childBirthDate.split('T')[0]
      : ''
  )
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
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save settings')
      }

      setMessage({ type: 'success', text: 'Settings saved successfully!' })
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

      {message && (
        <p
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
