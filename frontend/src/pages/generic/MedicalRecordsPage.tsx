import { useEffect } from 'react'
import { FileText } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { ipPatientListResource, type IpPatientListRow } from '../../features/generic/resources'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { Badge } from '../../components/ui/Badge'

export function MedicalRecordsPage() {
  const dispatch = useAppDispatch()
  const { items, status } = useAppSelector((state) => state.ipPatientList)

  useEffect(() => { dispatch(ipPatientListResource.fetchAll()) }, [dispatch])

  const columns: Column<IpPatientListRow>[] = [
    { key: 'uhid', header: 'UHID', render: (r) => <span className="font-mono text-xs">{r.uhid}</span> },
    { key: 'name', header: 'Patient', render: (r) => r.fullName },
    { key: 'mobile', header: 'Mobile', render: (r) => r.mobile },
    { key: 'admission', header: 'Admission #', render: (r) => r.admissionNumber },
    { key: 'admitted', header: 'Admitted', render: (r) => new Date(r.admissionDate).toLocaleDateString() },
    { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
  ]

  return (
    <div>
      <PageHeader title="Medical Records" subtitle="IP patient list - old and new admission records at a glance." />
      <Card padded={false}>
        <div className="flex items-center gap-2 border-b border-ink-100 p-4 text-sm font-medium text-ink-700">
          <FileText size={16} /> IP Patient List
        </div>
        <div className="p-4">
          <Table columns={columns} rows={items} keyField={(r) => r.patientId + r.admissionNumber} loading={status === 'loading'} emptyMessage="No IPD admission history yet." />
        </div>
      </Card>
    </div>
  )
}
