import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, Users, Stethoscope, CalendarCheck, ClipboardList, Pill, Receipt, BedDouble,
  FlaskConical, ScanLine, Building2, Briefcase, Boxes, Truck, Wallet, CalendarClock, Bell,
  FileBarChart, ShieldCheck, Scissors, FileText, Hospital, Clock, FileSignature, Siren, Droplet,
} from 'lucide-react'
import type { RoleName } from '../../types'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  roles: RoleName[]
}

// SuperAdmin is platform-level only - Dashboard (its own platform-wide view, see DashboardPage) plus the
// SuperAdmin-exclusive Hospitals screen, and nothing else. Administrator, not SuperAdmin, runs day-to-day
// operations within a hospital, even though the backend would let SuperAdmin's secondary Administrator JWT
// claim call any of the operational endpoints below directly - deliberately left out of every one of these
// roles lists so the sidebar doesn't offer what SuperAdmin isn't meant to use.
const ALL_STAFF: RoleName[] = ['Administrator', 'Receptionist', 'Doctor', 'Nurse', 'Pharmacist', 'LabTechnician', 'HR']

export const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard, roles: [...ALL_STAFF, 'SuperAdmin'] },
  { label: 'My Portal', path: '/app/patient', icon: LayoutDashboard, roles: ['Patient'] },
  { label: 'Hospitals', path: '/app/manage/hospitals', icon: Hospital, roles: ['SuperAdmin'] },
  // Nurse works from Appointments (to record vitals against a scheduled visit) rather than the standalone
  // patient registry - see Appointments below.
  { label: 'Patients', path: '/app/patients', icon: Users, roles: ['Administrator', 'Receptionist', 'Doctor'] },
  { label: 'Emergency (ER)', path: '/app/er', icon: Siren, roles: ['Administrator', 'Receptionist', 'Doctor', 'Nurse'] },
  { label: 'Appointments', path: '/app/appointments', icon: CalendarCheck, roles: ['Administrator', 'Receptionist', 'Doctor', 'Nurse'] },
  { label: 'Doctor Console', path: '/app/doctor-console', icon: Stethoscope, roles: ['Doctor'] },
  { label: 'IPD / Admissions', path: '/app/ipd', icon: BedDouble, roles: ['Administrator', 'Receptionist', 'Doctor', 'Nurse'] },
  { label: 'Nursing', path: '/app/nursing', icon: ClipboardList, roles: ['Nurse', 'Administrator'] },
  { label: 'Laboratory', path: '/app/laboratory', icon: FlaskConical, roles: ['LabTechnician', 'Doctor', 'Administrator'] },
  { label: 'Radiology', path: '/app/radiology', icon: ScanLine, roles: ['LabTechnician', 'Doctor', 'Administrator'] },
  { label: 'Pharmacy', path: '/app/pharmacy', icon: Pill, roles: ['Pharmacist', 'Administrator'] },
  { label: 'Billing', path: '/app/billing', icon: Receipt, roles: ['Administrator', 'Receptionist'] },
  { label: 'Insurance', path: '/app/insurance', icon: ShieldCheck, roles: ['Administrator', 'Receptionist'] },
  { label: 'Operation Theatre', path: '/app/operation-theatre', icon: Scissors, roles: ['Administrator', 'Doctor', 'Nurse'] },
  { label: 'Consents', path: '/app/consents', icon: FileSignature, roles: ['Administrator', 'Receptionist', 'Doctor', 'Nurse'] },
  { label: 'Blood Bank / Dialysis / Nutrition', path: '/app/clinical-depts', icon: Droplet, roles: ['Administrator', 'Doctor', 'Nurse', 'LabTechnician'] },
  { label: 'Medical Records', path: '/app/medical-records', icon: FileText, roles: ['Administrator', 'Doctor'] },
  { label: 'Doctors', path: '/app/manage/doctors', icon: Stethoscope, roles: ['Administrator'] },
  { label: 'Departments', path: '/app/manage/departments', icon: Building2, roles: ['Administrator'] },
  { label: 'Employees', path: '/app/manage/employees', icon: Briefcase, roles: ['Administrator', 'HR'] },
  { label: 'Attendance & Leave', path: '/app/manage/attendance', icon: CalendarClock, roles: ['Administrator', 'HR'] },
  // Self-service: own check-in/out history + apply for leave. Doctors excluded on purpose - they're
  // tracked via the separate Doctors table, not Employees (see RoleNames.EmployeeSelfService).
  { label: 'My Attendance', path: '/app/my-attendance', icon: Clock, roles: ['Nurse', 'Pharmacist', 'LabTechnician', 'HR', 'Receptionist'] },
  { label: 'Payroll', path: '/app/manage/payroll', icon: Wallet, roles: ['Administrator', 'HR'] },
  { label: 'Inventory', path: '/app/manage/inventory', icon: Boxes, roles: ['Administrator'] },
  { label: 'Vendors', path: '/app/manage/vendors', icon: Truck, roles: ['Administrator'] },
  { label: 'Notifications', path: '/app/notifications', icon: Bell, roles: ALL_STAFF },
  { label: 'Reports', path: '/app/reports', icon: FileBarChart, roles: ['Administrator'] },
]
