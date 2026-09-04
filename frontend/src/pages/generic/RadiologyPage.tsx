import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { ScanLine, Upload } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { radiologyResource, type RadiologyOrderRow } from '../../features/generic/resources'
import { apiClient, extractErrorMessage } from '../../api/client'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { SearchBox, PaginationBar } from '../../components/ui/ListToolbar'

export function RadiologyPage() {
  const dispatch = useAppDispatch()
  const { list, status } = useAppSelector((state) => state.radiology)
  const items = list?.items ?? []
  const [target, setTarget] = useState<RadiologyOrderRow | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const refresh = () => dispatch(radiologyResource.fetchPage({ pageNumber: page, pageSize: 10, search }))
  useEffect(() => {
    const timeout = setTimeout(refresh, 300)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, page, search])

  const uploadReport = async () => {
    if (!target) return
    setSubmitting(true)
    try {
      await apiClient.post(`/radiology/orders/${target.id}/report`, { doctorNotes: notes, reportFileUrl: 'pending-upload' })
      toast.success('Radiology report uploaded.')
      setTarget(null); setNotes('')
      refresh()
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const columns: Column<RadiologyOrderRow>[] = [
    { key: 'patient', header: 'Patient', render: (o) => o.patientName },
    { key: 'doctor', header: 'Doctor', render: (o) => o.doctorName },
    { key: 'scan', header: 'Scan Type', render: (o) => o.scanType },
    { key: 'price', header: 'Price', render: (o) => `₹${o.price}` },
    { key: 'status', header: 'Status', render: (o) => <Badge>{o.status}</Badge> },
    {
      key: 'actions', header: '', render: (o) => o.status !== 'Completed' ? (
        <button onClick={() => setTarget(o)} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
          <Upload size={12} /> Upload report
        </button>
      ) : null,
    },
  ]

  return (
    <div>
      <PageHeader title="Radiology" subtitle="X-Ray, MRI, CT Scan, PET Scan and Ultrasound orders." />
      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-ink-700">
            <ScanLine size={16} /> Pending Orders
          </div>
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search by patient, scan type, or doctor…" />
        </div>
        <div className="p-4">
          <Table columns={columns} rows={items} keyField={(o) => o.id} loading={status === 'loading'} emptyMessage="No pending radiology orders." />
        </div>
        {list && <PaginationBar pageNumber={list.pageNumber} totalPages={list.totalPages} totalCount={list.totalCount} onPageChange={setPage} />}
      </Card>

      <Modal open={!!target} onClose={() => setTarget(null)} title="Upload Radiology Report">
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-700">Doctor notes / findings</span>
            <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-ink-100 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30" />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setTarget(null)}>Cancel</Button>
            <Button loading={submitting} onClick={uploadReport}>Upload</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
