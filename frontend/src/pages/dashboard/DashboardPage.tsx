import { useEffect } from 'react'
import { Users, IndianRupee, BedDouble, Stethoscope, Scissors, AlertTriangle, CalendarCheck, LogOut, Hospital, Building2, CalendarClock, ShieldCheck } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { fetchDashboardSummary, fetchPlatformSummary } from '../../features/dashboard/dashboardSlice'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatCard } from '../../components/ui/StatCard'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { FullPageSpinner } from '../../components/ui/Spinner'

export function DashboardPage() {
  const dispatch = useAppDispatch()
  const { summary, platformSummary, status } = useAppSelector((state) => state.dashboard)
  const user = useAppSelector((state) => state.auth.user)
  const isSuperAdmin = user?.role === 'SuperAdmin'

  useEffect(() => {
    dispatch(isSuperAdmin ? fetchPlatformSummary() : fetchDashboardSummary())
  }, [dispatch, isSuperAdmin])

  if (isSuperAdmin) {
    if (status === 'loading' && !platformSummary) return <FullPageSpinner />
    return (
      <div>
        <PageHeader title={`Welcome back, ${user?.username}`} subtitle="Platform-wide totals across every hospital and branch." />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Hospitals" value={platformSummary?.totalHospitals ?? 0} icon={Hospital} tone="brand" />
          <StatCard label="Branches" value={platformSummary?.totalBranches ?? 0} icon={Building2} tone="brand" />
          <StatCard label="Doctors" value={platformSummary?.totalDoctors ?? 0} icon={Stethoscope} tone="brand" />
          <StatCard label="Patients" value={platformSummary?.totalPatients ?? 0} icon={Users} tone="brand" />
          <StatCard label="Employees" value={platformSummary?.totalEmployees ?? 0} icon={Users} tone="brand" />
          <StatCard label="Today's Appointments" value={platformSummary?.todaysAppointments ?? 0} icon={CalendarClock} tone="success" hint="Across every branch" />
          <StatCard label="Today's Revenue" value={`₹${(platformSummary?.todaysRevenue ?? 0).toLocaleString('en-IN')}`} icon={IndianRupee} tone="success" hint="Across every branch" />
        </div>

        <Card padded={false} className="mt-6">
          <div className="flex items-center gap-2 border-b border-ink-100 p-4 text-sm font-medium text-ink-700">
            <Hospital size={16} /> Hospitals at a glance
          </div>
          <div className="divide-y divide-ink-100">
            {platformSummary?.hospitals.length ? platformSummary.hospitals.map((h) => (
              <div key={h.hospitalId} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full border border-ink-100"
                    style={{ background: h.themeColor ?? 'var(--color-brand-500)' }}
                  />
                  <span className="text-sm font-medium text-ink-900">{h.hospitalName}</span>
                </div>
                <div className="flex gap-2">
                  <Badge tone="neutral">{h.branchCount} branch{h.branchCount === 1 ? '' : 'es'}</Badge>
                  <Badge tone="neutral">{h.doctorCount} doctors</Badge>
                  <Badge tone="neutral">{h.patientCount} patients</Badge>
                </div>
              </div>
            )) : (
              <p className="px-4 py-6 text-sm text-ink-500">No hospitals yet - add one from the Hospitals page.</p>
            )}
          </div>
        </Card>
      </div>
    )
  }

  if (status === 'loading' && !summary) return <FullPageSpinner />

  // Nurse's own dashboard - exactly the tiles the ward's paper dashboard tracked, nothing else (no revenue
  // figures, no pharmacy alerts/quick-actions card below - those aren't a nurse's concern here).
  if (user?.role === 'Nurse') {
    return (
      <div>
        <PageHeader title={`Welcome back, ${user.username}`} subtitle="Here's what's happening across the hospital today." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <StatCard label="Total OPD Patients" value={summary?.todaysPatients ?? 0} icon={Users} tone="brand" />
          <StatCard label="Total IP Patients" value={summary?.ipdPatientsCount ?? 0} icon={Users} tone="brand" />
          <StatCard label="Bed Occupancy" value={`${summary?.bedOccupancyPercent ?? 0}%`} icon={BedDouble} tone="warning" />
          <StatCard label="Planned Discharges" value={summary?.dischargedTodayCount ?? 0} icon={LogOut} tone="success" hint="Today" />
          <StatCard label="Discharged" value={summary?.dischargedTodayCount ?? 0} icon={LogOut} tone="success" hint="Today" />
          <StatCard label="Insurance Patients" value={summary?.insurancePatientsCount ?? 0} icon={ShieldCheck} tone="brand" hint="Currently admitted" />
          <StatCard label="Today's Surgeries" value={summary?.todaysSurgeriesCount ?? 0} icon={Scissors} tone="warning" />
        </div>
      </div>
    )
  }

  // Doctor's own dashboard - exactly the tiles their paper dashboard tracked, nothing else (no revenue
  // figures, no pharmacy alerts/quick-actions card below - those aren't a doctor's concern here).
  if (user?.role === 'Doctor') {
    return (
      <div>
        <PageHeader title={`Welcome back, ${user.username}`} subtitle="Here's what's happening across the hospital today." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <StatCard label="Total Appointments" value={summary?.doctorTodaysAppointments ?? 0} icon={CalendarCheck} tone="brand" hint="Today" />
          <StatCard label="IP Patients" value={summary?.doctorIpPatientsCount ?? 0} icon={Users} tone="brand" hint="Currently admitted, under you" />
          <StatCard label="Tomorrow Appointments" value={summary?.doctorTomorrowAppointmentsCount ?? 0} icon={CalendarClock} tone="brand" />
          <StatCard label="Bed Occupancy" value={`${summary?.bedOccupancyPercent ?? 0}%`} icon={BedDouble} tone="warning" />
          <StatCard label="Planned Discharges" value={summary?.doctorPlannedDischargesCount ?? 0} icon={LogOut} tone="success" hint="Today" />
          <StatCard label="Insurance Patients" value={summary?.doctorInsurancePatientsCount ?? 0} icon={ShieldCheck} tone="brand" hint="Currently admitted, under you" />
          <StatCard label="Today's Surgeries" value={summary?.doctorTodaysSurgeriesCount ?? 0} icon={Scissors} tone="warning" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={`Welcome back, ${user?.username}`} subtitle="Here's what's happening across the hospital today." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Today's Patients" value={summary?.todaysPatients ?? 0} icon={Users} tone="brand" />
        <StatCard
          label={user?.role === 'Receptionist' ? "Today's Revenue" : "Today's Revenue"}
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
        <StatCard label="IPD Patients" value={summary?.ipdPatientsCount ?? 0} icon={Users} tone="brand" hint="Currently admitted" />
        <StatCard label="Bed Occupancy" value={`${summary?.bedOccupancyPercent ?? 0}%`} icon={BedDouble} tone="warning" />
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
