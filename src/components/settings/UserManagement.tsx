'use client'

import { useState, useEffect, useCallback } from 'react'
import { Shield, ShieldOff, Trash2, Copy, Plus, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'

interface User {
  id: string
  email: string
  name: string
  role: string
  createdAt: string
  _count: { entries: number }
}

interface InviteCode {
  id: string
  code: string
  createdBy: { id: string; name: string }
  usedAt: string | null
  usedByEmail: string | null
  expiresAt: string | null
  maxUses: number
  useCount: number
  createdAt: string
}

export default function UserManagement({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<User[]>([])
  const [invites, setInvites] = useState<InviteCode[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'role' | 'delete'
    user: User
  } | null>(null)
  const [maxUses, setMaxUses] = useState('1')
  const [expiresIn, setExpiresIn] = useState('')
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, invitesRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/invite'),
      ])
      if (usersRes.ok) setUsers(await usersRes.json())
      if (invitesRes.ok) setInvites(await invitesRes.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleRoleChange(user: User) {
    const newRole = user.role === 'admin' ? 'member' : 'admin'
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
      )
    }
    setConfirmAction(null)
  }

  async function handleDeleteUser(user: User) {
    const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
    }
    setConfirmAction(null)
  }

  async function handleGenerateInvite() {
    setGenerating(true)
    try {
      const body: Record<string, unknown> = {}
      if (maxUses) body.maxUses = parseInt(maxUses) || 1
      if (expiresIn) {
        const days = parseInt(expiresIn)
        if (days > 0) {
          const date = new Date()
          date.setDate(date.getDate() + days)
          body.expiresAt = date.toISOString()
        }
      }

      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const invite = await res.json()
        setInvites((prev) => [invite, ...prev])
      }
    } finally {
      setGenerating(false)
    }
  }

  async function handleDeleteInvite(id: string) {
    const res = await fetch(`/api/invite/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setInvites((prev) => prev.filter((i) => i.id !== id))
    }
  }

  function copyInviteLink(code: string) {
    const url = `${window.location.origin}/register?code=${code}`
    navigator.clipboard.writeText(url)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  function getInviteStatus(invite: InviteCode) {
    if (invite.useCount >= invite.maxUses) return 'used'
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date())
      return 'expired'
    return 'active'
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Users Table */}
      <div className="bg-white border border-warm-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-warm-200">
          <h2 className="text-lg font-semibold text-warm-800">Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-warm-100 bg-warm-50/50">
                <th className="text-left px-5 py-3 text-warm-600 font-medium">
                  Name
                </th>
                <th className="text-left px-5 py-3 text-warm-600 font-medium">
                  Email
                </th>
                <th className="text-left px-5 py-3 text-warm-600 font-medium">
                  Role
                </th>
                <th className="text-left px-5 py-3 text-warm-600 font-medium">
                  Entries
                </th>
                <th className="text-left px-5 py-3 text-warm-600 font-medium">
                  Joined
                </th>
                <th className="text-right px-5 py-3 text-warm-600 font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-warm-100 last:border-0"
                >
                  <td className="px-5 py-3 font-medium text-warm-800">
                    {user.name}
                    {user.id === currentUserId && (
                      <span className="ml-2 text-xs text-warm-600">(you)</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-warm-600">{user.email}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-accent-100 text-accent-600'
                          : 'bg-warm-100 text-warm-700'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-warm-600">
                    {user._count.entries}
                  </td>
                  <td className="px-5 py-3 text-warm-600">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {user.id !== currentUserId && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() =>
                            setConfirmAction({ type: 'role', user })
                          }
                          className="p-1.5 rounded-lg hover:bg-warm-50 text-warm-500 hover:text-warm-700 transition-colors"
                          title={
                            user.role === 'admin'
                              ? 'Demote to member'
                              : 'Promote to admin'
                          }
                        >
                          {user.role === 'admin' ? (
                            <ShieldOff className="w-4 h-4" />
                          ) : (
                            <Shield className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() =>
                            setConfirmAction({ type: 'delete', user })
                          }
                          className="p-1.5 rounded-lg hover:bg-red-50 text-warm-500 hover:text-red-600 transition-colors"
                          title="Remove user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Codes */}
      <div className="bg-white border border-warm-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-warm-200">
          <h2 className="text-lg font-semibold text-warm-800">Invite Codes</h2>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap items-end gap-3 mb-6">
            <div className="w-32">
              <Input
                label="Max Uses"
                type="number"
                min="1"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
              />
            </div>
            <div className="w-40">
              <Input
                label="Expires in (days)"
                type="number"
                min="1"
                placeholder="Never"
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value)}
              />
            </div>
            <Button
              onClick={handleGenerateInvite}
              disabled={generating}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              {generating ? 'Generating...' : 'Generate Code'}
            </Button>
          </div>

          {invites.length === 0 ? (
            <p className="text-sm text-warm-500 py-4">
              No invite codes yet. Generate one to invite someone.
            </p>
          ) : (
            <div className="space-y-3">
              {invites.map((invite) => {
                const status = getInviteStatus(invite)
                return (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-3 bg-warm-50/50 rounded-xl"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono text-warm-800 bg-white px-2 py-0.5 rounded border border-warm-200">
                          {invite.code}
                        </code>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : status === 'used'
                                ? 'bg-warm-100 text-warm-600'
                                : 'bg-red-100 text-red-600'
                          }`}
                        >
                          {status}
                        </span>
                      </div>
                      <div className="text-xs text-warm-500 mt-1">
                        by {invite.createdBy.name} &middot;{' '}
                        {invite.useCount}/{invite.maxUses} uses
                        {invite.expiresAt &&
                          ` \u00B7 expires ${new Date(invite.expiresAt).toLocaleDateString()}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-3">
                      {status === 'active' && (
                        <button
                          onClick={() => copyInviteLink(invite.code)}
                          className="p-1.5 rounded-lg hover:bg-white text-warm-500 hover:text-warm-700 transition-colors"
                          title="Copy invite link"
                        >
                          {copied === invite.code ? (
                            <span className="text-xs text-green-600">
                              Copied!
                            </span>
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteInvite(invite.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-warm-500 hover:text-red-600 transition-colors"
                        title="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={
          confirmAction?.type === 'delete' ? 'Remove User' : 'Change Role'
        }
      >
        {confirmAction?.type === 'delete' ? (
          <div>
            <p className="text-warm-600 mb-4">
              Are you sure you want to remove{' '}
              <strong>{confirmAction.user.name}</strong>? This action cannot be
              undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDeleteUser(confirmAction.user)}
              >
                Remove
              </Button>
            </div>
          </div>
        ) : confirmAction ? (
          <div>
            <p className="text-warm-600 mb-4">
              {confirmAction.user.role === 'admin'
                ? `Demote ${confirmAction.user.name} from admin to member?`
                : `Promote ${confirmAction.user.name} from member to admin?`}
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => handleRoleChange(confirmAction.user)}
              >
                Confirm
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
