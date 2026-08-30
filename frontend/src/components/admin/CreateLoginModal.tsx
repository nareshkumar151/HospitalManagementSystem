import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { KeyRound } from 'lucide-react'
import { apiClient, extractErrorMessage } from '../../api/client'
import { Modal } from '../ui/Modal'
import { Input, Select } from '../ui/Input'
import { Button } from '../ui/Button'
import type { RoleName } from '../../types'

interface CreateLoginModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
  /** The profile this login is tied to - a Doctors.Id or Employees.Id depending on `fixedRole`/`roleOptions`. */
  linkedProfileId: number
  branchId: number
  subjectName: string
  defaultEmail?: string
  /** Set for Doctors (role is always "Doctor"); leave unset and pass `roleOptions` for Employees, whose
   * Designation doesn't map 1:1 to a login role (Nurse/Pharmacist/LabTechnician/HR/Receptionist). */
  fixedRole?: RoleName
  roleOptions?: RoleName[]
}

/**
 * Creating a Doctor/Employee row only ever wrote to the Doctors/Employees table - it never created a
 * Users login, so that person had no way to sign in. This calls the (already-existing but previously
 * unused-by-any-page) POST /auth/create-user endpoint to close that gap from wherever a profile is created.
 */
export function CreateLoginModal({ open, onClose, onCreated, linkedProfileId, branchId, subjectName, defaultEmail, fixedRole, roleOptions }: CreateLoginModalProps) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<RoleName | ''>(fixedRole ?? '')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setUsername(subjectName.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, ''))
    setEmail(defaultEmail ?? '')
    setPassword('')
    setRole(fixedRole ?? '')
  }, [open, subjectName, defaultEmail, fixedRole])

  const effectiveRole = fixedRole ?? role
  const canSubmit = username.trim().length >= 4 && email.trim().length > 0 && password.length >= 8 && effectiveRole

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await apiClient.post('/auth/create-user', {
        username, email, password, role: effectiveRole, linkedProfileId, branchId,
      })
      toast.success(`Login created for ${subjectName}.`)
      onCreated()
      onClose()
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Could not create the login.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Create Login - ${subjectName}`}>
      <div className="space-y-4">
        {roleOptions && (
          <Select label="Role" value={role} onChange={(e) => setRole(e.target.value as RoleName)}>
            <option value="">Select role</option>
            {roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        )}
        <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} hint="At least 4 characters." />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input
          label="Temporary password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="At least 8 characters, with an uppercase letter, a lowercase letter, and a digit."
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon={<KeyRound size={16} />} loading={submitting} disabled={!canSubmit} onClick={handleSubmit}>Create Login</Button>
        </div>
      </div>
    </Modal>
  )
}
