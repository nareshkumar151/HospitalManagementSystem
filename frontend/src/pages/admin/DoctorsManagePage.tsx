import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { KeyRound, Plus, Stethoscope } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { createDoctor, fetchDepartments, fetchDoctors } from '../../features/doctors/doctorsSlice'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { CreateLoginModal } from '../../components/admin/CreateLoginModal'
import { extractErrorMessage } from '../../api/client'
import type { DoctorDto } from '../../types'

export function DoctorsManagePage() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const { list, departments, status } = useAppSelector((state) => state.doctors)

  const [modalOpen, setModalOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [departmentId, setDepartmentId] = useState<number | ''>('')
  const [qualification, setQualification] = useState('')
  const [experience, setExperience] = useState(0)
  const [fee, setFee] = useState(0)
  const [mobile, setMobile] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loginTarget, setLoginTarget] = useState<DoctorDto | null>(null)

  useEffect(() => { dispatch(fetchDoctors()); dispatch(fetchDepartments()) }, [dispatch])

  const handleCreate = async () => {
    if (!fullName || !departmentId || !qualification) return
    setSubmitting(true)
    try {
      const created = await dispatch(createDoctor({
        fullName, departmentId, qualification, experienceYears: experience, consultationFee: fee, mobile, email, branchId: user?.branchId ?? 1,
      }))
      toast.success('Doctor added.')
      setModalOpen(false)
      setFullName(''); setDepartmentId(''); setQualification(''); setExperience(0); setFee(0); setMobile(''); setEmail('')
      // A doctor row alone can't sign in - prompt straight away to set up their login too.
      setLoginTarget(created)
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const columns: Column<DoctorDto>[] = [
    { key: 'code', header: 'Code', render: (d) => <span className="font-mono text-xs">{d.doctorCode}</span> },
    { key: 'name', header: 'Name', render: (d) => d.fullName },
    { key: 'dept', header: 'Department', render: (d) => d.departmentName },
    { key: 'qualification', header: 'Qualification', render: (d) => d.qualification },
    { key: 'experience', header: 'Experience', render: (d) => `${d.experienceYears} yrs` },
    { key: 'fee', header: 'Fee', render: (d) => `₹${d.consultationFee}` },
    { key: 'status', header: 'Status', render: (d) => <Badge tone={d.isActive ? 'success' : 'neutral'}>{d.isActive ? 'Active' : 'Inactive'}</Badge> },
    {
      key: 'login', header: 'Login', render: (d) => d.hasLogin ? (
        <Badge tone="success">Has Login</Badge>
      ) : (
        <button onClick={() => setLoginTarget(d)} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
          <KeyRound size={12} /> Create Login
        </button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Doctors"
        subtitle="Manage the hospital's doctor roster and consultation fees."
        actions={<Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>Add Doctor</Button>}
      />
      <Card padded={false}>
        <div className="flex items-center gap-2 border-b border-ink-100 p-4 text-sm font-medium text-ink-700">
          <Stethoscope size={16} /> Doctor Roster
        </div>
        <div className="p-4">
          <Table columns={columns} rows={list?.items ?? []} keyField={(d) => d.id} loading={status === 'loading'} />
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Doctor" widthClassName="max-w-lg">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
          <Select label="Department" value={departmentId} onChange={(e) => setDepartmentId(Number(e.target.value) || '')}>
            <option value="">Select department</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <Input label="Qualification" value={qualification} onChange={(e) => setQualification(e.target.value)} />
          <Input label="Experience (years)" type="number" value={experience} onChange={(e) => setExperience(Number(e.target.value))} />
          <Input label="Consultation fee" type="number" value={fee} onChange={(e) => setFee(Number(e.target.value))} />
          <Input label="Mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={submitting} onClick={handleCreate}>Add Doctor</Button>
          </div>
        </div>
      </Modal>

      {loginTarget && (
        <CreateLoginModal
          open={!!loginTarget}
          onClose={() => setLoginTarget(null)}
          onCreated={() => dispatch(fetchDoctors())}
          linkedProfileId={loginTarget.id}
          branchId={loginTarget.branchId}
          subjectName={loginTarget.fullName}
          defaultEmail={loginTarget.email ?? undefined}
          fixedRole="Doctor"
        />
      )}
    </div>
  )
}
