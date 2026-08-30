import { useState } from 'react'
import toast from 'react-hot-toast'
import { KeyRound } from 'lucide-react'
import { useAppSelector } from '../app/hooks'
import { apiClient, extractErrorMessage } from '../api/client'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

export function ProfilePage() {
  const user = useAppSelector((state) => state.auth.user)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleChangePassword = async () => {
    if (!currentPassword || newPassword.length < 8) {
      toast.error('New password must be at least 8 characters.')
      return
    }
    setSubmitting(true)
    try {
      await apiClient.post('/auth/change-password', { currentPassword, newPassword })
      toast.success('Password updated.')
      setCurrentPassword(''); setNewPassword('')
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader title="Profile" subtitle="Manage your account details." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-ink-900">Account</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink-500">Username</dt><dd className="font-medium text-ink-900">{user?.username}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">Email</dt><dd className="font-medium text-ink-900">{user?.email}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">Role</dt><dd className="font-medium text-ink-900">{user?.role}</dd></div>
          </dl>
        </Card>
        <Card>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900"><KeyRound size={16} /> Change Password</h3>
          <div className="space-y-3">
            <Input label="Current password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            <Input label="New password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <Button loading={submitting} onClick={handleChangePassword}>Update Password</Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
