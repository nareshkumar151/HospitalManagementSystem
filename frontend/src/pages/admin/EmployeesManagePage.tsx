import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Briefcase, KeyRound, Plus } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { createEmployee, fetchEmployees } from '../../features/employees/employeesSlice'
import { fetchDepartments } from '../../features/doctors/doctorsSlice'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { CreateLoginModal } from '../../components/admin/CreateLoginModal'
import { extractErrorMessage } from '../../api/client'
import type { EmployeeDto } from '../../features/employees/employeesSlice'
import type { RoleName } from '../../types'

// An Employee's free-text Designation doesn't map 1:1 to a login role, so the admin picks explicitly when
// creating the login (see RoleNames.EmployeeSelfService on the backend for why Doctor isn't in this list).
const EMPLOYEE_LOGIN_ROLES: RoleName[] = ['Nurse', 'Pharmacist', 'LabTechnician', 'HR', 'Receptionist']

export function EmployeesManagePage() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const { list, status } = useAppSelector((state) => state.employees)
  const { departments } = useAppSelector((state) => state.doctors)

  const [modalOpen, setModalOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [departmentId, setDepartmentId] = useState<number | ''>('')
  const [designation, setDesignation] = useState('')
  const [salary, setSalary] = useState(0)
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().slice(0, 10))
  const [shift, setShift] = useState('General')
  const [contact, setContact] = useState('')
  const [emailId, setEmailId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loginTarget, setLoginTarget] = useState<EmployeeDto | null>(null)

  useEffect(() => { dispatch(fetchEmployees()); dispatch(fetchDepartments()) }, [dispatch])

  const handleCreate = async () => {
    if (!fullName || !departmentId || !designation) return
    setSubmitting(true)
    try {
      const created = await dispatch(createEmployee({ fullName, departmentId, designation, salary, joiningDate, shift, contact, emailId, branchId: user?.branchId ?? 1 }))
      toast.success('Employee added.')
      setModalOpen(false)
      setFullName(''); setDepartmentId(''); setDesignation(''); setSalary(0); setContact(''); setEmailId('')
      // An Employee row alone can't sign in - prompt straight away to set up their login too.
      setLoginTarget(created)
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const columns: Column<EmployeeDto>[] = [
    { key: 'code', header: 'Code', render: (e) => <span className="font-mono text-xs">{e.employeeCode}</span> },
    { key: 'name', header: 'Name', render: (e) => e.fullName },
    { key: 'dept', header: 'Department', render: (e) => e.departmentName },
    { key: 'designation', header: 'Designation', render: (e) => e.designation },
    { key: 'shift', header: 'Shift', render: (e) => e.shift },
    { key: 'status', header: 'Status', render: (e) => <Badge tone={e.isActive ? 'success' : 'neutral'}>{e.isActive ? 'Active' : 'Inactive'}</Badge> },
    {
      key: 'login', header: 'Login', render: (e) => e.hasLogin ? (
        <Badge tone="success">Has Login</Badge>
      ) : (
        <button onClick={() => setLoginTarget(e)} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
          <KeyRound size={12} /> Create Login
        </button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle="Manage hospital staff records (nursing, pharmacy, lab, front desk, and HR)."
        actions={<Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>Add Employee</Button>}
      />
      <Card padded={false}>
        <div className="flex items-center gap-2 border-b border-ink-100 p-4 text-sm font-medium text-ink-700">
          <Briefcase size={16} /> Staff Directory
        </div>
        <div className="p-4">
          <Table columns={columns} rows={list?.items ?? []} keyField={(e) => e.id} loading={status === 'loading'} />
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Employee" widthClassName="max-w-lg">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
          <Select label="Department" value={departmentId} onChange={(e) => setDepartmentId(Number(e.target.value) || '')}>
            <option value="">Select department</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <Input label="Designation" value={designation} onChange={(e) => setDesignation(e.target.value)} />
          <Input label="Salary" type="number" value={salary} onChange={(e) => setSalary(Number(e.target.value))} />
          <Input label="Joining date" type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
          <Select label="Shift" value={shift} onChange={(e) => setShift(e.target.value)}>
            {['Morning', 'Evening', 'Night', 'General'].map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Input label="Contact" value={contact} onChange={(e) => setContact(e.target.value)} />
          <Input label="Email" type="email" value={emailId} onChange={(e) => setEmailId(e.target.value)} />
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={submitting} onClick={handleCreate}>Add Employee</Button>
          </div>
        </div>
      </Modal>

      {loginTarget && (
        <CreateLoginModal
          open={!!loginTarget}
          onClose={() => setLoginTarget(null)}
          onCreated={() => dispatch(fetchEmployees())}
          linkedProfileId={loginTarget.id}
          branchId={loginTarget.branchId}
          subjectName={loginTarget.fullName}
          defaultEmail={loginTarget.emailId}
          roleOptions={EMPLOYEE_LOGIN_ROLES}
        />
      )}
    </div>
  )
}
