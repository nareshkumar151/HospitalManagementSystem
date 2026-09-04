import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { ipPatientListResource, type IpPatientListRow } from '../../features/generic/resources'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { Badge } from '../../components/ui/Badge'
import { SearchBox, PaginationBar } from '../../components/ui/ListToolbar'

export function MedicalRecordsPage() {
  const dispatch = useAppDispatch()
  const { list, status } = useAppSelector((state) => state.ipPatientList)
  const items = list?.items ?? []
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timeout = setTimeout(() => dispatch(ipPatientListResource.fetchPage({ pageNumber: page, pageSize: 10, search })), 300)
    return () => clearTimeout(timeout)
  }, [dispatch, page, search])

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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-ink-700">
            <FileText size={16} /> IP Patient List
          </div>
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search by name, UHID, mobile, or admission #…" />
        </div>
        <div className="p-4">
          <Table columns={columns} rows={items} keyField={(r) => r.patientId + r.admissionNumber} loading={status === 'loading'} emptyMessage="No IPD admission history yet." />
        </div>
        {list && <PaginationBar pageNumber={list.pageNumber} totalPages={list.totalPages} totalCount={list.totalCount} onPageChange={setPage} />}
      </Card>
    </div>
  )
}
