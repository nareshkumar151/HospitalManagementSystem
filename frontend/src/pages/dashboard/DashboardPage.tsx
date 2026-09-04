import { useEffect } from 'react'
import { Users, IndianRupee, BedDouble, Receipt, Stethoscope, Scissors, AlertTriangle } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { fetchDashboardSummary } from '../../features/dashboard/dashboardSlice'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatCard } from '../../components/ui/StatCard'
import { Card } from '../../components/ui/Card'
import { FullPageSpinner } from '../../components/ui/Spinner'

export function DashboardPage() {
  const dispatch = useAppDispatch()
  const { summary, status } = useAppSelector((state) => state.dashboard)
  const user = useAppSelector((state) => state.auth.user)

  useEffect(() => {
    dispatch(fetchDashboardSummary())
  }, [dispatch])

  if (status === 'loading' && !summary) return <FullPageSpinner />

  return (
    <div>
      <PageHeader title={`Welcome back, ${user?.username}`} subtitle="Here's what's happening across the hospital today." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Today's Patients" value={summary?.todaysPatients ?? 0} icon={Users} tone="brand" />
        <StatCard
          label={user?.role === 'Receptionist' ? "Today's Collection" : "Today's Revenue"}
          value={`₹${(summary?.todaysRevenue ?? 0).toLocaleString('en-IN')}`}
          icon={IndianRupee}
          tone="success"
        />
        <StatCard
          label="OPD Revenue"
          value={`₹${(summary?.todaysOpdRevenue ?? 0).toLocaleString('en-IN')}`}
          icon={IndianRupee}
          tone="brand"
          hint="Outpatient bills"
        />
        <StatCard
          label="IPD Revenue"
          value={`₹${(summary?.todaysIpdRevenue ?? 0).toLocaleString('en-IN')}`}
          icon={IndianRupee}
          tone="warning"
          hint="Admission-linked bills"
        />
        <StatCard label="Bed Occupancy" value={`${summary?.bedOccupancyPercent ?? 0}%`} icon={BedDouble} tone="warning" />
        <StatCard label="Pending Bills" value={summary?.pendingBillsCount ?? 0} icon={Receipt} tone="danger" />
        <StatCard label="Available Doctors" value={summary?.availableDoctorsCount ?? 0} icon={Stethoscope} tone="brand" />
        <StatCard label="Today's Surgeries" value={summary?.todaysSurgeriesCount ?? 0} icon={Scissors} tone="warning" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
            <AlertTriangle size={16} className="text-warning-500" /> Pharmacy stock alerts
          </h3>
          {summary?.pharmacyStockAlerts.length ? (
            <ul className="space-y-2">
              {summary.pharmacyStockAlerts.map((alert) => (
                <li key={alert.medicineId} className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2 text-sm">
                  <span className="text-ink-700">{alert.medicineName}</span>
                  <span className="font-medium text-danger-500">{alert.stock} left (reorder at {alert.reorderLevel})</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-500">Stock levels look healthy - nothing needs attention.</p>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-ink-900">Quick actions</h3>
          <p className="text-sm text-ink-500">
            Use the sidebar to register a patient, book an appointment, admit to a ward, or jump into your
            role's workspace (Doctor Console, Pharmacy, Billing, Nursing).
          </p>
        </Card>
      </div>
    </div>
  )
}
