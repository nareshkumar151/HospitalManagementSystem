import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { FlaskConical, Upload } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { labOrderResource } from '../../features/generic/resources'
import { apiClient, extractErrorMessage } from '../../api/client'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { SearchBox, PaginationBar } from '../../components/ui/ListToolbar'
import type { LabTestOrderRow } from '../../features/generic/resources'

export function LaboratoryPage() {
  const dispatch = useAppDispatch()
  const role = useAppSelector((state) => state.auth.user?.role)
  const { list, status } = useAppSelector((state) => state.labOrders)
  const items = list?.items ?? []
  const [reportTarget, setReportTarget] = useState<LabTestOrderRow | null>(null)
  const [resultSummary, setResultSummary] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const refresh = () => dispatch(labOrderResource.fetchPage({ pageNumber: page, pageSize: 10, search }))
  useEffect(() => {
    const timeout = setTimeout(refresh, 300)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, page, search])

  const collectSample = async (id: number) => {
    try {
      await apiClient.put(`/laboratory/orders/${id}/collect-sample`)
      toast.success('Sample marked collected.')
      refresh()
    } catch (error) {
      toast.error(extractErrorMessage(error))
    }
  }

  const uploadReport = async () => {
    if (!reportTarget || !resultSummary.trim()) return
    setSubmitting(true)
    try {
      await apiClient.post(`/laboratory/orders/${reportTarget.id}/report`, { resultSummary, reportFileUrl: 'pending-upload' })
      toast.success('Report uploaded.')
      setReportTarget(null); setResultSummary('')
      refresh()
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const columns: Column<LabTestOrderRow>[] = [
    { key: 'patient', header: 'Patient', render: (o) => o.patientName },
    { key: 'doctor', header: 'Doctor', render: (o) => o.doctorName },
    { key: 'test', header: 'Test', render: (o) => o.testName },
    { key: 'ordered', header: 'Ordered', render: (o) => new Date(o.orderedAt).toLocaleString() },
    { key: 'status', header: 'Status', render: (o) => <Badge>{o.status}</Badge> },
    {
      key: 'actions', header: '', render: (o) => (
        <div className="flex gap-3">
          {o.status === 'Ordered' && role === 'LabTechnician' && (
            <button onClick={() => collectSample(o.id)} className="text-xs font-medium text-brand-600 hover:underline">Collect sample</button>
          )}
          {o.status === 'SampleCollected' && role === 'LabTechnician' && (
            <button onClick={() => setReportTarget(o)} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
              <Upload size={12} /> Upload report
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Laboratory" subtitle="Pending orders across Blood, Urine, ECG and health-check packages." />
      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-ink-700">
            <FlaskConical size={16} /> Pending Orders
          </div>
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search by patient, test, or doctor…" />
        </div>
        <div className="p-4">
          <Table columns={columns} rows={items} keyField={(o) => o.id} loading={status === 'loading'} emptyMessage="No pending lab orders." />
        </div>
        {list && <PaginationBar pageNumber={list.pageNumber} totalPages={list.totalPages} totalCount={list.totalCount} onPageChange={setPage} />}
      </Card>

      <Modal open={!!reportTarget} onClose={() => setReportTarget(null)} title="Upload Lab Report">
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-700">Result summary</span>
            <textarea rows={4} value={resultSummary} onChange={(e) => setResultSummary(e.target.value)}
              className="w-full rounded-lg border border-ink-100 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30" />
          </label>
          <p className="text-xs text-ink-500">File upload storage is wired to Local/Azure Blob at the API layer per the NFR; this demo records the result text.</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReportTarget(null)}>Cancel</Button>
            <Button loading={submitting} onClick={uploadReport}>Upload</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
