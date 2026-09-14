import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useLocation, useNavigate } from 'react-router-dom'
import { BedDouble, Download, FileText, LogOut, NotebookPen, Pencil, Plus, ShieldCheck, Stethoscope } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { admitPatient, dischargePatient, fetchActiveAdmissions, searchAdmissions, updateDoctorNotes } from '../../features/ipd/ipdSlice'
import { fetchBeds } from '../../features/beds/bedsSlice'
import { fetchPatients } from '../../features/patients/patientsSlice'
import { fetchDoctors } from '../../features/doctors/doctorsSlice'
import { fetchBillById, fetchPendingBills, updateBill } from '../../features/billing/billingSlice'
import { fetchNursingChart } from '../../features/nursing/nursingSlice'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { SearchBox, PaginationBar } from '../../components/ui/ListToolbar'
import { HandwritingField, isHandwritingCapture } from '../../components/clinical/HandwritingField'
import { apiClient, downloadFile, extractErrorMessage } from '../../api/client'
import type { BillDto, BillItemSection, IpdAdmissionDto } from '../../types'
import { ADMISSION_TYPES, admissionTypeLabel } from '../../utils/admissionTypes'

interface PatientReportRow { id: number; testOrScan: string; status: string; reportFileUrl: string | null }

const SECTION_LABELS: Record<BillItemSection, string> = {
  RoomTariff: 'Room Tariff',
  Consultation: 'Consultation',
  Investigation: 'Investigation',
  GeneralService: 'General Service',
  Others: 'Others',
}

interface EditableLineItem { description: string; quantity: number; unitPrice: number; section: BillItemSection }

export function IpdPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  // A patient can arrive here already chosen - e.g. an ER doctor's "Admit" disposition hands off to
  // reception/nursing to actually complete the admission, since ER only flips the visit's own status.
  const guidedPatientId = (location.state as { guidedPatientId?: number } | null)?.guidedPatientId
  const user = useAppSelector((state) => state.auth.user)
  const { list, status } = useAppSelector((state) => state.ipd)
  const { beds } = useAppSelector((state) => state.beds)
  const { list: patients } = useAppSelector((state) => state.patients)
  const { list: doctors } = useAppSelector((state) => state.doctors)
  const { pending: pendingIpdBills } = useAppSelector((state) => state.billing)
  const { chart: nursingChart } = useAppSelector((state) => state.nursing)
  const admissions = list?.items ?? []
  const canEditDoctorNotes = user?.role === 'Doctor' || user?.role === 'Administrator'

  const [admitOpen, setAdmitOpen] = useState(!!guidedPatientId)
  const [dischargeTarget, setDischargeTarget] = useState<IpdAdmissionDto | null>(null)
  const [patientId, setPatientId] = useState<number | ''>(guidedPatientId ?? '')
  const [doctorId, setDoctorId] = useState<number | ''>('')
  const [bedId, setBedId] = useState<number | ''>('')
  const [admissionType, setAdmissionType] = useState(ADMISSION_TYPES[0].value)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [dischargeDiagnosis, setDischargeDiagnosis] = useState('')
  const [dischargeCondition, setDischargeCondition] = useState('')

  // Edit Bill - only ever available while the admission has a bill that hasn't collected any payment yet
  // (see pendingIpdBills below and BillingService.UpdateBillAsync's own server-side check).
  const [editBillTarget, setEditBillTarget] = useState<BillDto | null>(null)
  const [editItems, setEditItems] = useState<EditableLineItem[]>([])
  const [editDiscount, setEditDiscount] = useState(0)
  const [editGst, setEditGst] = useState(0)

  // "View Reports" widget - lab + radiology reports on file for this admission's patient.
  const [reportsTarget, setReportsTarget] = useState<IpdAdmissionDto | null>(null)
  const [reportRows, setReportRows] = useState<PatientReportRow[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)

  // "Vitals / Nursing Notes" widget - read-only view of this admission's nursing chart (recorded from the
  // Nursing page - see NursingPage.tsx).
  const [vitalsTarget, setVitalsTarget] = useState<IpdAdmissionDto | null>(null)

  // "Doctor Notes" widget - a single editable note against the admission (see ipdSlice.updateDoctorNotes),
  // stylus-capable. Doctor/Administrator can edit; everyone else on this page sees it read-only.
  const [doctorNotesTarget, setDoctorNotesTarget] = useState<IpdAdmissionDto | null>(null)
  const [doctorNotesDraft, setDoctorNotesDraft] = useState('')
  const [doctorNotesFieldKey, setDoctorNotesFieldKey] = useState(0)
  const [doctorNotesSubmitting, setDoctorNotesSubmitting] = useState(false)

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
    dispatch(fetchPendingBills('IPD')) // which admissions currently have an editable (unpaid) bill
  }, [dispatch])

  useEffect(() => {
    const timeout = setTimeout(() => dispatch(searchAdmissions({ pageNumber: page, pageSize: 10, search, fromDate, toDate, status: statusFilter })), 300)
    return () => clearTimeout(timeout)
  }, [dispatch, page, search, fromDate, toDate, statusFilter])

  // The patient currently selected in the Admit modal, so their insurance on file can be shown right there.
  const admitTargetPatient = patients?.items.find((p) => p.id === patientId)

  const billForAdmission = (admissionId: number) => pendingIpdBills.find((b) => b.ipdAdmissionId === admissionId)

  const openEditBill = async (bill: BillDto) => {
    try {
      const full = await dispatch(fetchBillById(bill.id))
      setEditItems(full.items.map((i) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, section: i.section ?? 'Others' })))
      setEditDiscount(full.discountAmount)
      setEditGst(full.subTotal > 0 ? Math.round((full.gstAmount / full.subTotal) * 100) : 0)
      setEditBillTarget(full)
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Could not load this bill.'))
    }
  }

  const editSubTotal = editItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
  const addEditItem = () => setEditItems((i) => [...i, { description: '', quantity: 1, unitPrice: 0, section: 'Others' }])
  const updateEditItem = (index: number, patch: Partial<EditableLineItem>) =>
    setEditItems((i) => i.map((line, idx) => (idx === index ? { ...line, ...patch } : line)))
  const removeEditItem = (index: number) => setEditItems((i) => i.filter((_, idx) => idx !== index))

  const handleSaveBill = async () => {
    if (!editBillTarget || editItems.every((i) => !i.description)) return
    setSubmitting(true)
    try {
      await dispatch(updateBill(editBillTarget.id, {
        items: editItems.filter((i) => i.description),
        discountAmount: editDiscount,
        gstPercent: editGst,
      }))
      toast.success('Bill updated.')
      setEditBillTarget(null)
      dispatch(fetchPendingBills('IPD'))
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

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
        // One-click bundle: discharge summary + every consent/OT/nursing/ER/blood-bank/dialysis/nutrition
        // record on file for this admission's patient, not just the discharge summary alone.
        await downloadFile(`/discharge/admissions/${dischargeTarget.id}/documents-pdf`, `PatientDocuments-${dischargeTarget.admissionNumber}.pdf`)
      } catch {
        // Discharge already succeeded - a failed PDF fetch shouldn't look like the discharge itself failed.
        toast('Discharged, but the documents PDF could not be downloaded automatically.', { icon: '⚠️' })
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

  // One-click bundle covering discharge AND a mid-admission ward/bed transfer - works whether or not the
  // patient has been discharged yet (the discharge summary section is simply omitted until then).
  const handleDownloadAllDocuments = async (admission: IpdAdmissionDto) => {
    try {
      await downloadFile(`/discharge/admissions/${admission.id}/documents-pdf`, `PatientDocuments-${admission.admissionNumber}.pdf`)
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Could not download the patient documents.'))
    }
  }

  const openReports = async (a: IpdAdmissionDto) => {
    setReportsTarget(a)
    setReportsLoading(true)
    setReportRows([])
    try {
      const [labRes, radRes] = await Promise.all([
        apiClient.get<{ id: number; testName: string; status: string; report?: { reportFileUrl: string | null } | null }[]>(`/laboratory/orders/patient/${a.patientId}`),
        apiClient.get<{ id: number; scanType: string; status: string; reportFileUrl: string | null }[]>(`/radiology/orders/patient/${a.patientId}`),
      ])
      setReportRows([
        ...labRes.data.map((r) => ({ id: r.id, testOrScan: `Lab: ${r.testName}`, status: r.status, reportFileUrl: r.report?.reportFileUrl ?? null })),
        ...radRes.data.map((r) => ({ id: r.id, testOrScan: `Radiology: ${r.scanType}`, status: r.status, reportFileUrl: r.reportFileUrl })),
      ])
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Could not load reports.'))
    } finally {
      setReportsLoading(false)
    }
  }

  const openVitals = (a: IpdAdmissionDto) => {
    setVitalsTarget(a)
    dispatch(fetchNursingChart(a.id))
  }

  const openDoctorNotes = (a: IpdAdmissionDto) => {
    setDoctorNotesTarget(a)
    setDoctorNotesDraft(a.doctorNotes ?? '')
    setDoctorNotesFieldKey((k) => k + 1)
  }

  const handleSaveDoctorNotes = async () => {
    if (!doctorNotesTarget) return
    setDoctorNotesSubmitting(true)
    try {
      await dispatch(updateDoctorNotes(doctorNotesTarget.id, doctorNotesDraft))
      toast.success('Doctor notes saved.')
      setDoctorNotesTarget(null)
      dispatch(searchAdmissions({ pageNumber: page, pageSize: 10, search, fromDate, toDate, status: statusFilter }))
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setDoctorNotesSubmitting(false)
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
    {
      key: 'insurance', header: 'Insurance', render: (a) => a.insuranceCompany ? (
        <>
          {a.insuranceCompany}
          {a.insurancePolicyNumber && <span className="block text-xs text-ink-500">Policy: {a.insurancePolicyNumber}</span>}
        </>
      ) : <span className="text-ink-400">—</span>,
    },
    { key: 'status', header: 'Status', render: (a) => <Badge>{a.status}</Badge> },
    {
      key: 'reports', header: 'View Reports', render: (a) => (
        <button onClick={() => openReports(a)} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
          <FileText size={13} /> Reports
        </button>
      ),
    },
    {
      key: 'vitals', header: 'Vitals / Nursing Notes', render: (a) => (
        <button onClick={() => openVitals(a)} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
          <Stethoscope size={13} /> Notes
        </button>
      ),
    },
    {
      key: 'doctorNotes', header: 'Doctor Notes', render: (a) => (
        <button onClick={() => openDoctorNotes(a)} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
          <NotebookPen size={13} /> {a.doctorNotes ? 'View / Edit' : canEditDoctorNotes ? 'Add' : 'None'}
        </button>
      ),
    },
    {
      key: 'actions', header: '', render: (a) => (
        <div className="flex flex-wrap gap-3">
          {a.status === 'Admitted' && (
            <button onClick={() => setDischargeTarget(a)} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
              <LogOut size={13} /> Discharge
            </button>
          )}
          {billForAdmission(a.id) && (
            <button onClick={() => openEditBill(billForAdmission(a.id)!)} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
              <Pencil size={13} /> Edit Bill
            </button>
          )}
          <button onClick={() => handleDownloadAdmissionPdf(a)} className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:underline">
            <Download size={13} /> Admission PDF
          </button>
          <button onClick={() => handleDownloadAllDocuments(a)} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
            <Download size={13} /> All Documents
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
        // Admitting a patient is a front-desk/doctor decision, not a nursing one - the backend refuses it
        // for Nurse too (see IpdAdmissionsController.Admit).
        actions={user?.role !== 'Nurse' ? <Button icon={<Plus size={16} />} onClick={() => setAdmitOpen(true)}>Admit Patient</Button> : undefined}
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
          {admitTargetPatient && (
            <div className="flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 text-sm text-ink-700">
              <ShieldCheck size={15} className={admitTargetPatient.insuranceCompany ? 'text-success-500' : 'text-ink-400'} />
              {admitTargetPatient.insuranceCompany
                ? <>Insured: <strong>{admitTargetPatient.insuranceCompany}</strong>{admitTargetPatient.insurancePolicyNumber && ` · Policy ${admitTargetPatient.insurancePolicyNumber}`}</>
                : 'No insurance on file for this patient.'}
            </div>
          )}
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

      <Modal open={!!editBillTarget} onClose={() => setEditBillTarget(null)} title="Edit Bill" widthClassName="max-w-2xl">
        {editBillTarget && (
          <div className="space-y-4">
            <div className="rounded-lg bg-surface-muted p-3 text-sm text-ink-700">
              {editBillTarget.billNumber} · {editBillTarget.patientName}
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-ink-700">Line items</span>
                <Button size="sm" variant="secondary" onClick={addEditItem}>+ Add line</Button>
              </div>
              <div className="space-y-2">
                {editItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2">
                    <select
                      className="col-span-3 rounded-md border border-ink-100 px-2 py-1.5 text-xs"
                      value={item.section}
                      onChange={(e) => updateEditItem(index, { section: e.target.value as BillItemSection })}
                    >
                      {Object.entries(SECTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <input className="col-span-4 rounded-md border border-ink-100 px-2 py-1.5 text-sm" placeholder="Description" value={item.description} onChange={(e) => updateEditItem(index, { description: e.target.value })} />
                    <input type="number" min={1} className="col-span-1 rounded-md border border-ink-100 px-2 py-1.5 text-sm" placeholder="Qty" value={item.quantity} onChange={(e) => updateEditItem(index, { quantity: Number(e.target.value) })} />
                    <input type="number" min={0} className="col-span-3 rounded-md border border-ink-100 px-2 py-1.5 text-sm" placeholder="Unit price" value={item.unitPrice} onChange={(e) => updateEditItem(index, { unitPrice: Number(e.target.value) })} />
                    <button onClick={() => removeEditItem(index)} className="col-span-1 text-danger-500">✕</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Discount (₹)" type="number" value={editDiscount} onChange={(e) => setEditDiscount(Number(e.target.value))} />
              <Input label="GST (%)" type="number" value={editGst} onChange={(e) => setEditGst(Number(e.target.value))} />
            </div>
            <div className="rounded-lg bg-surface-muted p-3 text-sm text-ink-700">
              Subtotal ₹{editSubTotal.toFixed(2)} + GST {editGst}% − Discount ₹{editDiscount} ={' '}
              <span className="font-semibold text-ink-900">₹{(editSubTotal + editSubTotal * editGst / 100 - editDiscount).toFixed(2)}</span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setEditBillTarget(null)}>Cancel</Button>
              <Button loading={submitting} disabled={editItems.every((i) => !i.description)} onClick={handleSaveBill}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!reportsTarget} onClose={() => setReportsTarget(null)} title="View Reports">
        {reportsTarget && (
          <div className="space-y-3">
            <p className="text-sm text-ink-600">{reportsTarget.patientName} <span className="text-xs text-ink-500">· {reportsTarget.uhid}</span></p>
            {reportsLoading && <p className="text-sm text-ink-500">Loading…</p>}
            {!reportsLoading && (
              <div className="max-h-96 overflow-y-auto rounded-lg border border-ink-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-muted text-ink-500"><tr>
                    <th className="px-3 py-2">Test / Scan</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Report</th>
                  </tr></thead>
                  <tbody>
                    {reportRows.map((r) => (
                      <tr key={`${r.testOrScan}-${r.id}`} className="border-t border-ink-100">
                        <td className="px-3 py-2">{r.testOrScan}</td>
                        <td className="px-3 py-2"><Badge>{r.status}</Badge></td>
                        <td className="px-3 py-2">
                          {r.reportFileUrl ? <a href={r.reportFileUrl} target="_blank" rel="noreferrer" className="font-medium text-brand-600 hover:underline">View</a> : <span className="text-ink-400">Not uploaded yet</span>}
                        </td>
                      </tr>
                    ))}
                    {reportRows.length === 0 && <tr><td colSpan={3} className="px-3 py-6 text-center text-ink-500">No lab or radiology orders on file yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={!!vitalsTarget} onClose={() => setVitalsTarget(null)} title="Vitals / Nursing Notes" widthClassName="max-w-2xl">
        {vitalsTarget && (
          <div className="space-y-3">
            <p className="text-sm text-ink-600">{vitalsTarget.patientName} <span className="text-xs text-ink-500">· {vitalsTarget.uhid}</span></p>
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {nursingChart.map((entry) => (
                <div key={entry.id} className="rounded-lg bg-surface-muted p-3 text-sm">
                  <p className="mb-1 text-xs font-medium text-ink-500">{new Date(entry.recordedAt).toLocaleString()} · {entry.nurseName}</p>
                  <div className="flex flex-wrap gap-3 text-ink-700">
                    {entry.temperature != null && <span>🌡 {entry.temperature}°F</span>}
                    {entry.pulse != null && <span>♥ {entry.pulse} bpm</span>}
                    {entry.bloodPressure && <span>BP {entry.bloodPressure}</span>}
                    {entry.oxygen != null && <span>SpO2 {entry.oxygen}%</span>}
                    {entry.respiratoryRate != null && <span>RR {entry.respiratoryRate}/min</span>}
                    {entry.painScore != null && <span>Pain {entry.painScore}/10</span>}
                    {entry.consciousness && <span>AVPU {entry.consciousness}</span>}
                  </div>
                  {entry.dailyNotes && (
                    isHandwritingCapture(entry.dailyNotes)
                      ? <img src={entry.dailyNotes} alt="Nursing note (handwritten)" className="mt-1 max-h-24 rounded border border-ink-100 bg-white" />
                      : <p className="mt-1 text-xs text-ink-500">{entry.dailyNotes}</p>
                  )}
                </div>
              ))}
              {nursingChart.length === 0 && <p className="text-sm text-ink-500">No vitals recorded yet for this admission.</p>}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!doctorNotesTarget} onClose={() => setDoctorNotesTarget(null)} title="Doctor Notes">
        {doctorNotesTarget && (
          <div className="space-y-4">
            <p className="text-sm text-ink-600">{doctorNotesTarget.patientName} <span className="text-xs text-ink-500">· {doctorNotesTarget.uhid}</span></p>
            {doctorNotesTarget.doctorNotesUpdatedAt && (
              <p className="text-xs text-ink-500">Last updated {new Date(doctorNotesTarget.doctorNotesUpdatedAt).toLocaleString()}</p>
            )}
            <HandwritingField
              key={doctorNotesFieldKey}
              label="Doctor notes (type or draw with stylus)"
              value={doctorNotesDraft}
              onChange={setDoctorNotesDraft}
              multiline
              padHeight={160}
              readOnly={!canEditDoctorNotes}
            />
            {canEditDoctorNotes && (
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setDoctorNotesTarget(null)}>Cancel</Button>
                <Button loading={doctorNotesSubmitting} onClick={handleSaveDoctorNotes}>Save Notes</Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
