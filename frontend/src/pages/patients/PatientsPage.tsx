import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Download, Plus, Search } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { createPatient, fetchPatients } from '../../features/patients/patientsSlice'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { downloadFile, extractErrorMessage } from '../../api/client'
import type { PatientDto } from '../../types'

const schema = z.object({
  fullName: z.string().min(2, 'Required'),
  mobile: z.string().regex(/^\+?[0-9]{10,15}$/, 'Enter a valid mobile number'),
  gender: z.enum(['Male', 'Female', 'Other']),
  dateOfBirth: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  bloodGroup: z.string(),
  allergies: z.string().optional(),
  referredByDoctorName: z.string().optional(),
  insuranceCompany: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

const bloodGroups = ['Unknown', 'APositive', 'ANegative', 'BPositive', 'BNegative', 'ABPositive', 'ABNegative', 'OPositive', 'ONegative']

export function PatientsPage() {
  const dispatch = useAppDispatch()
  const { list, status } = useAppSelector((state) => state.patients)
  const branchId = useAppSelector((state) => state.auth.user?.branchId) ?? 1
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { gender: 'Male', bloodGroup: 'Unknown' },
  })

  useEffect(() => {
    dispatch(fetchPatients({ pageNumber: page, pageSize: 10, search: search || undefined }))
  }, [dispatch, page, search])

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true)
    try {
      await dispatch(createPatient({ ...values, branchId }))
      toast.success('Patient registered successfully.')
      setModalOpen(false)
      reset()
      dispatch(fetchPatients({ pageNumber: 1, pageSize: 10 }))
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownloadPdf = async (patient: PatientDto) => {
    try {
      await downloadFile(`/patients/${patient.id}/pdf`, `PatientDetails-${patient.uhid}.pdf`)
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Could not download patient details.'))
    }
  }

  const columns: Column<PatientDto>[] = [
    { key: 'uhid', header: 'UHID', render: (p) => <span className="font-mono text-xs text-ink-500">{p.uhid}</span> },
    { key: 'name', header: 'Name', render: (p) => <span className="font-medium text-ink-900">{p.fullName}</span> },
    { key: 'gender', header: 'Gender', render: (p) => p.gender },
    { key: 'mobile', header: 'Mobile', render: (p) => p.mobile },
    { key: 'blood', header: 'Blood Group', render: (p) => <Badge tone="neutral">{p.bloodGroup}</Badge> },
    { key: 'registered', header: 'Registered', render: (p) => new Date(p.createdAt).toLocaleDateString() },
    {
      key: 'actions', header: '', render: (p) => (
        <button onClick={() => handleDownloadPdf(p)} className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:underline">
          <Download size={13} /> PDF
        </button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Patients"
        subtitle="Register new patients and search existing records by name, mobile, or UHID."
        actions={<Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>Register Patient</Button>}
      />

      <Card padded={false} className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-ink-100 p-4">
          <div className="relative w-full max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by name, mobile, or UHID…"
              className="w-full rounded-lg border border-ink-100 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
            />
          </div>
        </div>
        <div className="p-4">
          <Table columns={columns} rows={list?.items ?? []} keyField={(p) => p.id} loading={status === 'loading'} emptyMessage="No patients found - register one to get started." />
        </div>
        {list && list.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-ink-100 px-4 py-3 text-sm text-ink-500">
            <span>Page {list.pageNumber} of {list.totalPages} · {list.totalCount} total</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="secondary" size="sm" disabled={page >= list.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Register New Patient" widthClassName="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Full name" error={errors.fullName?.message} {...register('fullName')} />
          <Input label="Mobile" error={errors.mobile?.message} {...register('mobile')} />
          <Select label="Gender" {...register('gender')}>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </Select>
          <Input label="Date of birth" type="date" {...register('dateOfBirth')} />
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Select label="Blood group" {...register('bloodGroup')}>
            {bloodGroups.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
          </Select>
          <Input label="Referred by (doctor)" hint="Optional" {...register('referredByDoctorName')} />
          <Input label="Insurance company" hint="Optional" {...register('insuranceCompany')} />
          <div className="sm:col-span-2">
            <Input label="Allergies" hint="Optional - comma separated" {...register('allergies')} />
          </div>
          <div className="sm:col-span-2 mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Register Patient</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
