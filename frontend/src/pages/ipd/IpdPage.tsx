import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { BedDouble, Download, LogOut, Plus } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { admitPatient, dischargePatient, fetchActiveAdmissions } from '../../features/ipd/ipdSlice'
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
import { downloadFile, extractErrorMessage } from '../../api/client'
import type { IpdAdmissionDto } from '../../types'

const admissionTypes = ['GeneralMedical', 'GeneralSurgical', 'ICU', 'Emergency']

export function IpdPage() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const { active, status } = useAppSelector((state) => state.ipd)
  const { beds } = useAppSelector((state) => state.beds)
  const { list: patients } = useAppSelector((state) => state.patients)
  const { list: doctors } = useAppSelector((state) => state.doctors)

  const [admitOpen, setAdmitOpen] = useState(false)
  const [dischargeTarget, setDischargeTarget] = useState<IpdAdmissionDto | null>(null)
  const [patientId, setPatientId] = useState<number | ''>('')
  const [doctorId, setDoctorId] = useState<number | ''>('')
  const [bedId, setBedId] = useState<number | ''>('')
  const [admissionType, setAdmissionType] = useState('GeneralMedical')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [dischargeDiagnosis, setDischargeDiagnosis] = useState('')
  const [dischargeCondition, setDischargeCondition] = useState('')

  useEffect(() => {
    dispatch(fetchActiveAdmissions())
    dispatch(fetchBeds({ status: 'Available' }))
    dispatch(fetchPatients({ pageSize: 100 }))
    dispatch(fetchDoctors())
  }, [dispatch])

  const handleAdmit = async () => {
    if (!patientId || !doctorId || !bedId) return
    setSubmitting(true)
    try {
      await dispatch(admitPatient({ patientId, doctorId, bedId, admissionType, reasonForAdmission: reason || undefined, branchId: user?.branchId ?? 1 }))
      toast.success('Patient admitted.')
      setAdmitOpen(false)
      setPatientId(''); setDoctorId(''); setBedId(''); setReason('')
      dispatch(fetchActiveAdmissions())
      dispatch(fetchBeds({ status: 'Available' }))
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
    { key: 'doctor', header: 'Doctor', render: (a) => a.doctorName },
    { key: 'bed', header: 'Bed', render: (a) => `${a.roomNumber} · ${a.bedNumber}` },
    { key: 'type', header: 'Type', render: (a) => <Badge tone="neutral">{a.admissionType}</Badge> },
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
        <div className="p-4">
          <Table columns={columns} rows={active} keyField={(a) => a.id} loading={status === 'loading'} emptyMessage="No active admissions." />
        </div>
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
            <Select label="Admission type" value={admissionType} onChange={(e) => setAdmissionType(e.target.value)}>
              {admissionTypes.map((t) => <option key={t} value={t}>{t}</option>)}
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
