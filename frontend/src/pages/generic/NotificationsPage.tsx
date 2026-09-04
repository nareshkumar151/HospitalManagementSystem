import { useEffect, useState } from 'react'
import { Bell, Check } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { notificationResource } from '../../features/generic/resources'
import { apiClient } from '../../api/client'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { SearchBox, PaginationBar } from '../../components/ui/ListToolbar'

export function NotificationsPage() {
  const dispatch = useAppDispatch()
  const { list, status } = useAppSelector((state) => state.notifications)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const items = list?.items ?? []

  useEffect(() => {
    const timeout = setTimeout(() => dispatch(notificationResource.fetchPage({ pageNumber: page, pageSize: 10, search })), 300)
    return () => clearTimeout(timeout)
  }, [dispatch, page, search])

  const markRead = async (id: number) => {
    await apiClient.put(`/notifications/${id}/read`)
    dispatch(notificationResource.fetchPage({ pageNumber: page, pageSize: 10, search }))
  }

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Appointment reminders, lab-ready alerts, billing and follow-up notices." />
      <Card>
        <div className="mb-4">
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search notifications…" />
        </div>
        {status === 'loading' && <p className="text-sm text-ink-500">Loading…</p>}
        <div className="space-y-2">
          {items.map((n) => (
            <div key={n.id} className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm ${n.isRead ? 'bg-surface-muted' : 'bg-brand-50'}`}>
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-ink-500" />
                <div>
                  <p className="text-ink-900">{n.message}</p>
                  <p className="text-xs text-ink-500">{n.channel} · {new Date(n.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="neutral">{n.category}</Badge>
                {!n.isRead && (
                  <button onClick={() => markRead(n.id)} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
                    <Check size={12} /> Mark read
                  </button>
                )}
              </div>
            </div>
          ))}
          {items.length === 0 && status !== 'loading' && <p className="text-sm text-ink-500">You're all caught up.</p>}
        </div>
        {list && (
          <div className="-mx-4 -mb-4 mt-2">
            <PaginationBar pageNumber={list.pageNumber} totalPages={list.totalPages} totalCount={list.totalCount} onPageChange={setPage} />
          </div>
        )}
      </Card>
    </div>
  )
}
