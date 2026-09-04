import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { BedDouble, Download, LogOut, Plus } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { admitPatient, dischargePatient, fetchActiveAdmissions, searchAdmissions } from '../../features/ipd/ipdSlice'
import { fetchBeds } from '../../features/beds/bedsSlice'
import { fetchPatients } from '../../features/patients/patientsSlice'
import { fetchDoctors } from '../../features/doctors/doctorsSlice'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { SearchBox, PaginationBar } from '../../components/ui/ListToolbar'
import { downloadFile, extractErrorMessage } from '../../api/client'
import type { IpdAdmissionDto } from '../../types'
import { ADMISSION_TYPES, admissionTypeLabel } from '../../utils/admissionTypes'

export function IpdPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const user = useAppSelector((state) => state.auth.user)
  const { list, status } = useAppSelector((state) => state.ipd)
  const { beds } = useAppSelector((state) => state.beds)
  const { list: patients } = useAppSelector((state) => state.patients)
  const { list: doctors } = useAppSelector((state) => state.doctors)
  const admissions = list?.items ?? []

  const [admitOpen, setAdmitOpen] = useState(false)
  const [dischargeTarget, setDischargeTarget] = useState<IpdAdmissionDto | null>(null)
  const [patientId, setPatientId] = useState<number | ''>('')
  const [doctorId, setDoctorId] = useState<number | ''>('')
  const [bedId, setBedId] = useState<number | ''>('')
  const [admissionType, setAdmissionType] = useState(ADMISSION_TYPES[0].value)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [dischargeDiagnosis, setDischargeDiagnosis] = useState('')
  const [dischargeCondition, setDischargeCondition] = useState('')

  // List-screen filters: defaults to "Admitted" so the page still opens on today's active roster, same as
  // before - search and the date range broaden that to the full admission history when used.
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [statusFilter, setStatusFilter] = useState<'Admitted' | 'Discharged' | ''>('Admitted')
  const [page, setPage] = useState(1)

  useEffect(() => {
    dispatch(fetchActiveAdmissions()) // still needed for the Billing page's IPD-admission picker
    dispatch(fetchBeds({ status: 'Available' }))
    dispatch(fetchPatients({ pageSize: 100 }))
    dispatch(fetchDoctors())
  }, [dispatch])

  useEffect(() => {
    const timeout = setTimeout(() => dispatch(searchAdmissions({ pageNumber: page, pageSize: 10, search, fromDate, toDate, status: statusFilter })), 300)
    return () => clearTimeout(timeout)
  }, [dispatch, page, search, fromDate, toDate, statusFilter])

  const handleAdmit = async () => {
    if (!patientId || !doctorId || !bedId) return
    setSubmitting(true)
    try {
      const admission = await dispatch(admitPatient({ patientId, doctorId, bedId, admissionType, reasonForAdmission: reason || undefined, branchId: user?.branchId ?? 1 }))
      toast.success('Patient admitted.')
      setAdmitOpen(false)
      setPatientId(''); setDoctorId(''); setBedId(''); setReason('')
      dispatch(fetchActiveAdmissions())
      dispatch(searchAdmissions({ pageNumber: page, pageSize: 10, search, fromDate, toDate, status: statusFilter }))
      dispatch(fetchBeds({ status: 'Available' }))
      // Admission naturally continues into billing for the stay - carry the patient and their new
      // admission along so Create Bill opens pre-set to "IPD" against it, instead of the receptionist
      // having to switch it over and find the admission themselves.
      navigate('/app/billing', { state: { guidedPatientId: admission.patientId, guidedIpdAdmissionId: admission.id } })
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDischarge = async () => {
    if (!dischargeTarget || !dischargeDiagnosis || !dischargeCondition) return
    setSubmitting(true)
    try {
      await dispatch(dischargePatient(dischargeTarget.id, { diagnosis: dischargeDiagnosis, conditionAtDischarge: dischargeCondition }))
      toast.success('Patient discharged.')
      try {
        await downloadFile(`/discharge/admissions/${dischargeTarget.id}/pdf`, `DischargeSummary-${dischargeTarget.admissionNumber}.pdf`)
      } catch {
        // Discharge already succeeded - a failed PDF fetch shouldn't look like the discharge itself failed.
        toast('Discharged, but the summary PDF could not be downloaded automatically.', { icon: '⚠️' })
      }
      setDischargeTarget(null)
      setDischargeDiagnosis(''); setDischargeCondition('')
      dispatch(fetchActiveAdmissions())
      dispatch(searchAdmissions({ pageNumber: page, pageSize: 10, search, fromDate, toDate, status: statusFilter }))
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownloadAdmissionPdf = async (admission: IpdAdmissionDto) => {
    try {
      await downloadFile(`/ipdadmissions/${admission.id}/pdf`, `AdmissionDocument-${admission.admissionNumber}.pdf`)
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Could not download the admission document.'))
    }
  }

  const columns: Column<IpdAdmissionDto>[] = [
    { key: 'number', header: 'Admission #', render: (a) => <span className="font-mono text-xs">{a.admissionNumber}</span> },
    { key: 'patient', header: 'Patient', render: (a) => a.patientName },
    { key: 'uhid', header: 'UHID', render: (a) => <span className="font-mono text-xs text-ink-500">{a.uhid}</span> },
    { key: 'doctor', header: 'Doctor', render: (a) => a.doctorName },
    { key: 'department', header: 'Department', render: (a) => a.departmentName },
    { key: 'bed', header: 'Bed', render: (a) => `${a.roomNumber} · ${a.bedNumber}` },
    { key: 'type', header: 'Type', render: (a) => <Badge tone="neutral">{admissionTypeLabel(a.admissionType)}</Badge> },
    { key: 'insurance', header: 'Insurance', render: (a) => a.insuranceCompany ?? <span className="text-ink-400">—</span> },
    { key: 'status', header: 'Status', render: (a) => <Badge>{a.status}</Badge> },
    {
      key: 'actions', header: '', render: (a) => (
        <div className="flex gap-3">
          {a.status === 'Admitted' && (
            <button onClick={() => setDischargeTarget(a)} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
              <LogOut size={13} /> Discharge
            </button>
          )}
          <button onClick={() => handleDownloadAdmissionPdf(a)} className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:underline">
            <Download size={13} /> PDF
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="IPD / Admissions"
        subtitle="Track admitted patients, assign beds, and process discharges."
        actions={<Button icon={<Plus size={16} />} onClick={() => setAdmitOpen(true)}>Admit Patient</Button>}
      />

      <Card padded={false}>
        <div className="flex flex-wrap items-end gap-3 border-b border-ink-100 p-4">
          <SearchBox
            value={search}
            onChange={(v) => { setSearch(v); setPage(1) }}
            placeholder="Search by patient, UHID, mobile, or admission #…"
            className="w-full max-w-sm"
          />
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-700">From</span>
            <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1) }}
              className="rounded-lg border border-ink-100 px-3 py-1.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-700">To</span>
            <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1) }}
              className="rounded-lg border border-ink-100 px-3 py-1.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30" />
          </label>
          <Select label="Status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1) }} className="w-40">
            <option value="Admitted">Admitted</option>
            <option value="Discharged">Discharged</option>
            <option value="">All</option>
          </Select>
          {(search || fromDate || toDate || statusFilter !== 'Admitted') && (
            <Button variant="secondary" size="sm" onClick={() => { setSearch(''); setFromDate(''); setToDate(''); setStatusFilter('Admitted'); setPage(1) }}>
              Clear filters
            </Button>
          )}
        </div>
        <div className="p-4">
          <Table columns={columns} rows={admissions} keyField={(a) => a.id} loading={status === 'loading'} emptyMessage="No admissions match these filters." />
        </div>
        {list && <PaginationBar pageNumber={list.pageNumber} totalPages={list.totalPages} totalCount={list.totalCount} onPageChange={setPage} />}
      </Card>

      <Modal open={admitOpen} onClose={() => setAdmitOpen(false)} title="Admit Patient">
        <div className="space-y-4">
          <Select label="Patient" value={patientId} onChange={(e) => setPatientId(Number(e.target.value) || '')}>
            <option value="">Select patient</option>
            {patients?.items.map((p) => <option key={p.id} value={p.id}>{p.fullName} · {p.uhid}</option>)}
          </Select>
          <Select label="Attending doctor" value={doctorId} onChange={(e) => setDoctorId(Number(e.target.value) || '')}>
            <option value="">Select doctor</option>
            {doctors?.items.map((d) => <option key={d.id} value={d.id}>{d.fullName}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Available bed" value={bedId} onChange={(e) => setBedId(Number(e.target.value) || '')}>
              <option value="">Select bed</option>
              {beds.map((b) => <option key={b.id} value={b.id}>{b.roomNumber} · {b.bedNumber} ({b.roomType})</option>)}
            </Select>
            <Select label="Admission type" value={admissionType} onChange={(e) => setAdmissionType(e.target.value as typeof admissionType)}>
              {ADMISSION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </div>
          <Select label="Reason for admission" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">Not specified</option>
            <option value="Observation">Observation</option>
            <option value="Surgery">Surgery</option>
            <option value="Post-operative care">Post-operative care</option>
            <option value="Critical care">Critical care</option>
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setAdmitOpen(false)}>Cancel</Button>
            <Button loading={submitting} disabled={!patientId || !doctorId || !bedId} onClick={handleAdmit}>Admit</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!dischargeTarget} onClose={() => setDischargeTarget(null)} title="Discharge Patient">
        {dischargeTarget && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 text-sm">
              <BedDouble size={15} /> {dischargeTarget.patientName} · {dischargeTarget.bedNumber}
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-700">Diagnosis</span>
              <textarea className="w-full rounded-lg border border-ink-100 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30" rows={2} value={dischargeDiagnosis} onChange={(e) => setDischargeDiagnosis(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-700">Condition at discharge</span>
              <textarea className="w-full rounded-lg border border-ink-100 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30" rows={2} value={dischargeCondition} onChange={(e) => setDischargeCondition(e.target.value)} />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setDischargeTarget(null)}>Cancel</Button>
              <Button variant="success" loading={submitting} disabled={!dischargeDiagnosis || !dischargeCondition} onClick={handleDischarge}>Confirm Discharge</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
