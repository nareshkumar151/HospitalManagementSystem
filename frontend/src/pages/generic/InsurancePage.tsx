import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, ShieldCheck } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { insuranceResource, type InsuranceClaimRow } from '../../features/generic/resources'
import { fetchPatients } from '../../features/patients/patientsSlice'
import { apiClient, extractErrorMessage } from '../../api/client'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'

export function InsurancePage() {
  const dispatch = useAppDispatch()
  const role = useAppSelector((state) => state.auth.user?.role)
  const { items, status } = useAppSelector((state) => state.insurance)
  const { list: patients } = useAppSelector((state) => state.patients)

  const [modalOpen, setModalOpen] = useState(false)
  const [patientId, setPatientId] = useState<number | ''>('')
  const [company, setCompany] = useState('')
  const [policyNumber, setPolicyNumber] = useState('')
  const [coverage, setCoverage] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const refresh = () => dispatch(insuranceResource.fetchAll())
  useEffect(() => { refresh(); dispatch(fetchPatients({ pageSize: 100 })) }, [dispatch])

  const submitClaim = async () => {
    if (!patientId || !company || !policyNumber) return
    setSubmitting(true)
    try {
      await dispatch(insuranceResource.create({ patientId, insuranceCompany: company, policyNumber, coverageAmount: coverage }))
      toast.success('Claim submitted.')
      setModalOpen(false); setCompany(''); setPolicyNumber(''); setCoverage(0); setPatientId('')
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const updateStatus = async (id: number, statusValue: string) => {
    try {
      await apiClient.put(`/insurance/${id}/status`, { status: statusValue })
      toast.success(`Claim marked ${statusValue}.`)
      refresh()
    } catch (error) {
      toast.error(extractErrorMessage(error))
    }
  }

  const columns: Column<InsuranceClaimRow>[] = [
    { key: 'patient', header: 'Patient', render: (c) => c.patientName },
    { key: 'company', header: 'Company', render: (c) => c.insuranceCompany },
    { key: 'policy', header: 'Policy #', render: (c) => c.policyNumber },
    { key: 'coverage', header: 'Coverage', render: (c) => `₹${c.coverageAmount.toLocaleString('en-IN')}` },
    { key: 'status', header: 'Status', render: (c) => <Badge>{c.status}</Badge> },
    {
      key: 'actions', header: '', render: (c) => role === 'Administrator' && c.status === 'Submitted' ? (
        <div className="flex gap-2">
          <button onClick={() => updateStatus(c.id, 'Approved')} className="text-xs font-medium text-success-500 hover:underline">Approve</button>
          <button onClick={() => updateStatus(c.id, 'Rejected')} className="text-xs font-medium text-danger-500 hover:underline">Reject</button>
        </div>
      ) : null,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Insurance"
        subtitle="Submit and track patient insurance claims."
        actions={<Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>Submit Claim</Button>}
      />
      <Card padded={false}>
        <div className="flex items-center gap-2 border-b border-ink-100 p-4 text-sm font-medium text-ink-700">
          <ShieldCheck size={16} /> Claims
        </div>
        <div className="p-4">
          <Table columns={columns} rows={items} keyField={(c) => c.id} loading={status === 'loading'} emptyMessage="No insurance claims yet." />
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Submit Insurance Claim">
        <div className="space-y-4">
          <Select label="Patient" value={patientId} onChange={(e) => setPatientId(Number(e.target.value) || '')}>
            <option value="">Select patient</option>
            {patients?.items.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
          </Select>
          <Input label="Insurance company" value={company} onChange={(e) => setCompany(e.target.value)} />
          <Input label="Policy number" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} />
          <Input label="Coverage amount" type="number" value={coverage} onChange={(e) => setCoverage(Number(e.target.value))} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={submitting} onClick={submitClaim}>Submit</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
