import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'
import { FileBarChart, Stethoscope } from 'lucide-react'
import { apiClient } from '../../api/client'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import type { BedOccupancyRow, DailyVisitsRow, DepartmentRevenueRow, RevenueReportRow } from '../../features/reports/types'

function lastNDays(n: number) {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - n)
  return { fromDate: from.toISOString().slice(0, 10), toDate: to.toISOString().slice(0, 10) }
}

export function ReportsPage() {
  const [range] = useState(lastNDays(30))
  const [revenue, setRevenue] = useState<RevenueReportRow[]>([])
  const [deptRevenue, setDeptRevenue] = useState<DepartmentRevenueRow[]>([])
  const [occupancy, setOccupancy] = useState<BedOccupancyRow[]>([])
  const [dailyVisits, setDailyVisits] = useState<DailyVisitsRow[]>([])

  useEffect(() => {
    apiClient.get<RevenueReportRow[]>('/reports/revenue', { params: range }).then((r) => setRevenue(r.data))
    apiClient.get<DepartmentRevenueRow[]>('/reports/department-wise-revenue', { params: range }).then((r) => setDeptRevenue(r.data))
    apiClient.get<BedOccupancyRow[]>('/reports/bed-occupancy').then((r) => setOccupancy(r.data))
    apiClient.get<DailyVisitsRow[]>('/reports/daily-visits', { params: range }).then((r) => setDailyVisits(r.data))
  }, [range])

  const opdRevenueTotal = revenue.reduce((sum, r) => sum + r.opd, 0)
  const ipdRevenueTotal = revenue.reduce((sum, r) => sum + r.ipd, 0)

  const deptColumns: Column<DepartmentRevenueRow>[] = [
    { key: 'dept', header: 'Department', render: (r) => r.departmentName },
    { key: 'revenue', header: 'Revenue', render: (r) => `₹${r.revenue.toLocaleString('en-IN')}` },
  ]

  const visitsColumns: Column<DailyVisitsRow>[] = [
    { key: 'date', header: 'Date', render: (r) => new Date(r.date).toLocaleDateString() },
    { key: 'opd', header: 'OPD Visits', render: (r) => r.opdCount },
    { key: 'ipd', header: 'IPD Admissions', render: (r) => r.ipdCount },
  ]

  const occupancyColumns: Column<BedOccupancyRow>[] = [
    { key: 'ward', header: 'Ward', render: (r) => r.wardName },
    { key: 'total', header: 'Total Beds', render: (r) => r.totalBeds },
    { key: 'occupied', header: 'Occupied', render: (r) => r.occupied },
    { key: 'available', header: 'Available', render: (r) => r.available },
  ]

  return (
    <div>
      <PageHeader title="Reports" subtitle={`Last 30 days · ${range.fromDate} to ${range.toDate}`} />

      <Card className="mb-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900"><FileBarChart size={16} /> Daily Revenue - OPD vs IPD</h3>
          <div className="flex gap-4 text-xs text-ink-500">
            <span>OPD total: <span className="font-semibold text-ink-900">₹{opdRevenueTotal.toLocaleString('en-IN')}</span></span>
            <span>IPD total: <span className="font-semibold text-ink-900">₹{ipdRevenueTotal.toLocaleString('en-IN')}</span></span>
          </div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-ink-100)" />
              <XAxis dataKey="date" tickFormatter={(d: string) => new Date(d).getDate().toString()} fontSize={12} stroke="var(--color-ink-500)" />
              <YAxis fontSize={12} stroke="var(--color-ink-500)" />
              <Tooltip
                labelFormatter={(d) => new Date(String(d)).toLocaleDateString()}
                formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`}
              />
              <Legend />
              <Bar dataKey="opd" name="OPD" stackId="revenue" fill="var(--color-brand-500)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="ipd" name="IPD" stackId="revenue" fill="var(--color-warning-500)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card padded={false}>
          <div className="border-b border-ink-100 p-4 text-sm font-semibold text-ink-900">Department-wise Revenue</div>
          <div className="p-4"><Table columns={deptColumns} rows={deptRevenue} keyField={(r) => r.departmentName} /></div>
        </Card>
        <Card padded={false}>
          <div className="border-b border-ink-100 p-4 text-sm font-semibold text-ink-900">Bed Occupancy</div>
          <div className="p-4"><Table columns={occupancyColumns} rows={occupancy} keyField={(r) => r.wardName} /></div>
        </Card>
      </div>

      <Card padded={false} className="mt-4">
        <div className="flex items-center gap-2 border-b border-ink-100 p-4 text-sm font-semibold text-ink-900">
          <Stethoscope size={16} /> Daily OPD vs IPD Visits
        </div>
        <div className="p-4"><Table columns={visitsColumns} rows={dailyVisits} keyField={(r) => r.date} emptyMessage="No visits recorded in this range." /></div>
      </Card>
    </div>
  )
}
