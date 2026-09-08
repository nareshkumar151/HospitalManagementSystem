import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { KeyRound, Plus } from 'lucide-react'
import { apiClient, extractErrorMessage } from '../../api/client'
import { Modal } from '../ui/Modal'
import { Input, Select } from '../ui/Input'
import { Button } from '../ui/Button'
import type { BranchDto, DepartmentDto, DoctorDto, PagedResult, PatientDto, RoleName } from '../../types'
import type { EmployeeDto } from '../../features/employees/employeesSlice'

interface Props {
  open: boolean
  onClose: () => void
  branch: BranchDto
  hospitalName: string
}

const ROLE_OPTIONS: RoleName[] = ['Administrator', 'Receptionist', 'Doctor', 'Nurse', 'Pharmacist', 'LabTechnician', 'HR', 'Patient']
const EMPLOYEE_ROLES: RoleName[] = ['Receptionist', 'Nurse', 'Pharmacist', 'LabTechnician', 'HR']
const BLOOD_GROUPS = ['Unknown', 'APositive', 'ANegative', 'BPositive', 'BNegative', 'ABPositive', 'ABNegative', 'OPositive', 'ONegative']

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '')

/**
 * SuperAdmin-only: provisions a login for ANY role in ANY hospital/branch, from the Hospitals admin page -
 * the UI counterpart of what previously required raw POST /auth/create-user calls. Doctor/Nurse/Pharmacist/
 * LabTechnician/HR/Receptionist/Patient logins need a profile row (Doctors/Employees/Patients) to link to;
 * this either creates one on the spot or links to an existing profile in that branch that has no login yet.
 * Administrator has no profile table of its own, so its login stands alone (LinkedProfileId = null).
 */
export function CreateHospitalUserModal({ open, onClose, branch, hospitalName }: Props) {
  const [role, setRole] = useState<RoleName | ''>('')
  const [departments, setDepartments] = useState<DepartmentDto[]>([])
  const [departmentId, setDepartmentId] = useState<number | ''>('')
  const [newDepartmentName, setNewDepartmentName] = useState('')
  const [addingDepartment, setAddingDepartment] = useState(false)

  const [profileMode, setProfileMode] = useState<'new' | 'existing'>('new')
  const [existingProfiles, setExistingProfiles] = useState<{ id: number; label: string }[]>([])
  const [selectedExistingId, setSelectedExistingId] = useState<number | ''>('')

  // Doctor fields
  const [docFullName, setDocFullName] = useState('')
  const [docQualification, setDocQualification] = useState('')
  const [docExperience, setDocExperience] = useState(0)
  const [docFee, setDocFee] = useState(0)
  const [docMobile, setDocMobile] = useState('')
  const [docEmail, setDocEmail] = useState('')

  // Employee fields
  const [empFullName, setEmpFullName] = useState('')
  const [empDesignation, setEmpDesignation] = useState('')
  const [empSalary, setEmpSalary] = useState(0)
  const [empJoiningDate, setEmpJoiningDate] = useState(new Date().toISOString().slice(0, 10))
  const [empShift, setEmpShift] = useState('General')
  const [empContact, setEmpContact] = useState('')
  const [empEmail, setEmpEmail] = useState('')

  // Patient fields / search
  const [patMode, setPatMode] = useState<'new' | 'search'>('new')
  const [patFullName, setPatFullName] = useState('')
  const [patGender, setPatGender] = useState('Male')
  const [patDob, setPatDob] = useState('')
  const [patAge, setPatAge] = useState(30)
  const [patMobile, setPatMobile] = useState('')
  const [patEmail, setPatEmail] = useState('')
  const [patBloodGroup, setPatBloodGroup] = useState('Unknown')
  const [patientSearch, setPatientSearch] = useState('')
  const [patientResults, setPatientResults] = useState<PatientDto[]>([])
  const [searchingPatients, setSearchingPatients] = useState(false)

  // Login fields
  const [username, setUsername] = useState('')
  const [usernameTouched, setUsernameTouched] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [createdCreds, setCreatedCreds] = useState<{ username: string; password: string } | null>(null)

  const needsDepartment = role === 'Doctor' || (role !== '' && EMPLOYEE_ROLES.includes(role))

  useEffect(() => {
    if (!open) return
    setRole(''); setDepartments([]); setDepartmentId(''); setNewDepartmentName(''); setAddingDepartment(false)
    setProfileMode('new'); setExistingProfiles([]); setSelectedExistingId('')
    setDocFullName(''); setDocQualification(''); setDocExperience(0); setDocFee(0); setDocMobile(''); setDocEmail('')
    setEmpFullName(''); setEmpDesignation(''); setEmpSalary(0); setEmpJoiningDate(new Date().toISOString().slice(0, 10)); setEmpShift('General'); setEmpContact(''); setEmpEmail('')
    setPatMode('new'); setPatFullName(''); setPatGender('Male'); setPatDob(''); setPatAge(30); setPatMobile(''); setPatEmail(''); setPatBloodGroup('Unknown')
    setPatientSearch(''); setPatientResults([])
    setUsername(''); setUsernameTouched(false); setLoginEmail(''); setPassword(''); setCreatedCreds(null)
  }, [open, branch.id])

  // Departments + existing-profile-without-login lookups, scoped to this branch, whenever the role changes.
  useEffect(() => {
    if (!open || !needsDepartment) return
    apiClient.get<DepartmentDto[]>('/departments', { params: { branchId: branch.id } })
      .then(({ data }) => setDepartments(data))
      .catch(() => setDepartments([]))
  }, [open, needsDepartment, branch.id])

  useEffect(() => {
    if (!open || role === '') return
    setProfileMode('new'); setSelectedExistingId(''); setExistingProfiles([])
    if (role === 'Doctor') {
      apiClient.get<PagedResult<DoctorDto>>('/doctors', { params: { branchId: branch.id, pageSize: 200 } })
        .then(({ data }) => setExistingProfiles(
          data.items.filter((d) => !d.hasLogin && d.branchId === branch.id).map((d) => ({ id: d.id, label: `${d.fullName} - ${d.departmentName}` }))
        )).catch(() => setExistingProfiles([]))
    } else if (EMPLOYEE_ROLES.includes(role)) {
      apiClient.get<PagedResult<EmployeeDto>>('/employees', { params: { branchId: branch.id, pageSize: 200 } })
        .then(({ data }) => setExistingProfiles(
          data.items.filter((e) => !e.hasLogin).map((e) => ({ id: e.id, label: `${e.fullName} - ${e.designation}` }))
        )).catch(() => setExistingProfiles([]))
    }
  }, [open, role, branch.id])

  useEffect(() => {
    if (usernameTouched) return
    const source = role === 'Doctor' ? docFullName : role && EMPLOYEE_ROLES.includes(role) ? empFullName
      : role === 'Patient' ? patFullName : role === 'Administrator' ? `admin.${branch.name}` : ''
    if (source) setUsername(slugify(source))
  }, [role, docFullName, empFullName, patFullName, branch.name, usernameTouched])

  const handleAddDepartment = async () => {
    if (!newDepartmentName.trim()) return
    setAddingDepartment(true)
    try {
      const { data } = await apiClient.post<DepartmentDto>('/departments', { branchId: branch.id, name: newDepartmentName.trim() })
      setDepartments((prev) => [...prev, data])
      setDepartmentId(data.id)
      setNewDepartmentName('')
      toast.success('Department added.')
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Could not add the department.'))
    } finally {
      setAddingDepartment(false)
    }
  }

  const handleSearchPatients = async () => {
    setSearchingPatients(true)
    try {
      const { data } = await apiClient.get<PagedResult<PatientDto>>('/patients', {
        params: { search: patientSearch, pageSize: 10, hospitalId: branch.hospitalId },
      })
      setPatientResults(data.items)
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Could not search patients.'))
    } finally {
      setSearchingPatients(false)
    }
  }

  const canSubmit = (() => {
    if (!role) return false
    if (username.trim().length < 4 || loginEmail.trim().length === 0 || password.length < 8) return false
    if (role === 'Doctor' || (role && EMPLOYEE_ROLES.includes(role))) {
      if (profileMode === 'existing') return !!selectedExistingId
      if (!departmentId) return false
      return role === 'Doctor' ? !!(docFullName && docQualification) : !!(empFullName && empDesignation)
    }
    if (role === 'Patient') {
      return patMode === 'search' ? !!selectedExistingId : !!(patFullName && patMobile)
    }
    return true // Administrator
  })()

  const handleSubmit = async () => {
    if (!canSubmit || !role) return
    setSubmitting(true)
    try {
      let linkedProfileId: number | null = null

      if (role === 'Doctor') {
        if (profileMode === 'existing') {
          linkedProfileId = selectedExistingId as number
        } else {
          const { data } = await apiClient.post<DoctorDto>('/doctors', {
            fullName: docFullName, departmentId, qualification: docQualification,
            experienceYears: docExperience, consultationFee: docFee, mobile: docMobile, email: docEmail || undefined,
            branchId: branch.id,
          })
          linkedProfileId = data.id
        }
      } else if (EMPLOYEE_ROLES.includes(role)) {
        if (profileMode === 'existing') {
          linkedProfileId = selectedExistingId as number
        } else {
          const { data } = await apiClient.post<EmployeeDto>('/employees', {
            fullName: empFullName, departmentId, designation: empDesignation || role,
            salary: empSalary, joiningDate: empJoiningDate, shift: empShift, contact: empContact, emailId: empEmail || undefined,
            branchId: branch.id,
          })
          linkedProfileId = data.id
        }
      } else if (role === 'Patient') {
        if (patMode === 'search') {
          linkedProfileId = selectedExistingId as number
        } else {
          const { data } = await apiClient.post<PatientDto>('/patients', {
            fullName: patFullName, gender: patGender, dateOfBirth: patDob || undefined, age: patAge,
            mobile: patMobile, email: patEmail || undefined, bloodGroup: patBloodGroup, branchId: branch.id,
          })
          linkedProfileId = data.id
        }
      }
      // Administrator: no profile table of its own - linkedProfileId stays null.

      await apiClient.post('/auth/create-user', { username, email: loginEmail, password, role, linkedProfileId, branchId: branch.id })
      setCreatedCreds({ username, password })
      toast.success(`Login created for ${username}.`)
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Could not create the login.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Create Login - ${hospitalName} / ${branch.name}`} widthClassName="max-w-xl">
      {createdCreds ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-success-200 bg-success-50 p-4 text-sm text-ink-800">
            <p className="font-medium text-success-700">Login created.</p>
            <p className="mt-2">Username: <span className="font-mono font-semibold">{createdCreds.username}</span></p>
            <p>Password: <span className="font-mono font-semibold">{createdCreds.password}</span></p>
            <p className="mt-2 text-xs text-ink-500">Share these with the account holder now - the password cannot be retrieved again later.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreatedCreds(null)}>Create another</Button>
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Select label="Role" value={role} onChange={(e) => setRole(e.target.value as RoleName)}>
            <option value="">Select role</option>
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>

          {needsDepartment && (
            <div className="space-y-2 rounded-lg border border-ink-100 p-3">
              <Select label="Department" value={departmentId} onChange={(e) => setDepartmentId(Number(e.target.value) || '')}>
                <option value="">Select department</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
              <div className="flex items-end gap-2">
                <Input label="Or add a new department" value={newDepartmentName} onChange={(e) => setNewDepartmentName(e.target.value)} className="flex-1" />
                <Button type="button" variant="secondary" icon={<Plus size={14} />} loading={addingDepartment} onClick={handleAddDepartment}>Add</Button>
              </div>
            </div>
          )}

          {(role === 'Doctor' || (role && EMPLOYEE_ROLES.includes(role))) && existingProfiles.length > 0 && (
            <div className="flex gap-2 text-sm">
              <button type="button" onClick={() => setProfileMode('new')} className={`rounded-full px-3 py-1 font-medium ${profileMode === 'new' ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-700'}`}>Create new</button>
              <button type="button" onClick={() => setProfileMode('existing')} className={`rounded-full px-3 py-1 font-medium ${profileMode === 'existing' ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-700'}`}>Use existing ({existingProfiles.length})</button>
            </div>
          )}

          {role === 'Doctor' && profileMode === 'existing' && (
            <Select label="Existing doctor (no login yet)" value={selectedExistingId} onChange={(e) => setSelectedExistingId(Number(e.target.value) || '')}>
              <option value="">Select doctor</option>
              {existingProfiles.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </Select>
          )}
          {role === 'Doctor' && profileMode === 'new' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Input label="Full name" value={docFullName} onChange={(e) => setDocFullName(e.target.value)} /></div>
              <Input label="Qualification" value={docQualification} onChange={(e) => setDocQualification(e.target.value)} />
              <Input label="Experience (years)" type="number" value={docExperience} onChange={(e) => setDocExperience(Number(e.target.value))} />
              <Input label="Consultation fee" type="number" value={docFee} onChange={(e) => setDocFee(Number(e.target.value))} />
              <Input label="Mobile" value={docMobile} onChange={(e) => setDocMobile(e.target.value)} />
              <Input label="Email" type="email" value={docEmail} onChange={(e) => setDocEmail(e.target.value)} />
            </div>
          )}

          {role && EMPLOYEE_ROLES.includes(role) && profileMode === 'existing' && (
            <Select label="Existing employee (no login yet)" value={selectedExistingId} onChange={(e) => setSelectedExistingId(Number(e.target.value) || '')}>
              <option value="">Select employee</option>
              {existingProfiles.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </Select>
          )}
          {role && EMPLOYEE_ROLES.includes(role) && profileMode === 'new' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Input label="Full name" value={empFullName} onChange={(e) => setEmpFullName(e.target.value)} /></div>
              <Input label="Designation" value={empDesignation} onChange={(e) => setEmpDesignation(e.target.value)} placeholder={role} />
              <Input label="Salary" type="number" value={empSalary} onChange={(e) => setEmpSalary(Number(e.target.value))} />
              <Input label="Joining date" type="date" value={empJoiningDate} onChange={(e) => setEmpJoiningDate(e.target.value)} />
              <Select label="Shift" value={empShift} onChange={(e) => setEmpShift(e.target.value)}>
                {['Morning', 'Evening', 'Night', 'General'].map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
              <Input label="Contact" value={empContact} onChange={(e) => setEmpContact(e.target.value)} />
              <Input label="Email" type="email" value={empEmail} onChange={(e) => setEmpEmail(e.target.value)} />
            </div>
          )}

          {role === 'Patient' && (
            <div className="space-y-3">
              <div className="flex gap-2 text-sm">
                <button type="button" onClick={() => setPatMode('new')} className={`rounded-full px-3 py-1 font-medium ${patMode === 'new' ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-700'}`}>Register new patient</button>
                <button type="button" onClick={() => setPatMode('search')} className={`rounded-full px-3 py-1 font-medium ${patMode === 'search' ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-700'}`}>Link existing patient</button>
              </div>
              {patMode === 'search' ? (
                <div className="space-y-2">
                  <div className="flex items-end gap-2">
                    <Input label="Search by name, mobile, or UHID" value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} className="flex-1" />
                    <Button type="button" variant="secondary" loading={searchingPatients} onClick={handleSearchPatients}>Search</Button>
                  </div>
                  {patientResults.length > 0 && (
                    <Select label="Matching patients" value={selectedExistingId} onChange={(e) => setSelectedExistingId(Number(e.target.value) || '')}>
                      <option value="">Select patient</option>
                      {patientResults.map((p) => <option key={p.id} value={p.id}>{p.fullName} - {p.uhid} - {p.mobile}</option>)}
                    </Select>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2"><Input label="Full name" value={patFullName} onChange={(e) => setPatFullName(e.target.value)} /></div>
                  <Select label="Gender" value={patGender} onChange={(e) => setPatGender(e.target.value)}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </Select>
                  <Input label="Age" type="number" value={patAge} onChange={(e) => setPatAge(Number(e.target.value))} />
                  <Input label="Date of birth" type="date" hint="Optional" value={patDob} onChange={(e) => setPatDob(e.target.value)} />
                  <Input label="Mobile" value={patMobile} onChange={(e) => setPatMobile(e.target.value)} />
                  <Input label="Email" type="email" hint="Optional" value={patEmail} onChange={(e) => setPatEmail(e.target.value)} />
                  <Select label="Blood group" value={patBloodGroup} onChange={(e) => setPatBloodGroup(e.target.value)}>
                    {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                  </Select>
                </div>
              )}
            </div>
          )}

          {role && (
            <div className="space-y-3 rounded-lg border border-ink-100 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Login credentials</p>
              <Input label="Username" value={username} onChange={(e) => { setUsername(e.target.value); setUsernameTouched(true) }} hint="At least 4 characters." />
              <Input label="Login email" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
              <Input
                label="Temporary password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                hint="At least 8 characters, with an uppercase letter, a lowercase letter, and a digit."
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button icon={<KeyRound size={16} />} loading={submitting} disabled={!canSubmit} onClick={handleSubmit}>Create Login</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
