import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, Users, Stethoscope, CalendarCheck, ClipboardList, Pill, Receipt, BedDouble,
  FlaskConical, ScanLine, Building2, Briefcase, Boxes, Truck, Wallet, CalendarClock, Bell,
  FileBarChart, ShieldCheck, Scissors, FileText, Hospital, Clock,
} from 'lucide-react'
import type { RoleName } from '../../types'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  roles: RoleName[]
}

// SuperAdmin can reach everything Administrator can (the backend grants it via a secondary JWT claim -
// see JwtTokenService) plus the SuperAdmin-exclusive Hospitals screen, so it's listed alongside
// Administrator everywhere below rather than needing its own parallel set of nav rules.
const ALL_STAFF: RoleName[] = ['SuperAdmin', 'Administrator', 'Receptionist', 'Doctor', 'Nurse', 'Pharmacist', 'LabTechnician', 'HR']

export const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard, roles: ALL_STAFF },
  { label: 'My Portal', path: '/app/patient', icon: LayoutDashboard, roles: ['Patient'] },
  { label: 'Hospitals', path: '/app/manage/hospitals', icon: Hospital, roles: ['SuperAdmin'] },
  { label: 'Patients', path: '/app/patients', icon: Users, roles: ['SuperAdmin', 'Administrator', 'Receptionist', 'Doctor', 'Nurse'] },
  { label: 'Appointments', path: '/app/appointments', icon: CalendarCheck, roles: ['SuperAdmin', 'Administrator', 'Receptionist', 'Doctor'] },
  { label: 'Doctor Console', path: '/app/doctor-console', icon: Stethoscope, roles: ['Doctor'] },
  { label: 'IPD / Admissions', path: '/app/ipd', icon: BedDouble, roles: ['SuperAdmin', 'Administrator', 'Receptionist', 'Doctor', 'Nurse'] },
  { label: 'Nursing', path: '/app/nursing', icon: ClipboardList, roles: ['Nurse', 'SuperAdmin', 'Administrator'] },
  { label: 'Laboratory', path: '/app/laboratory', icon: FlaskConical, roles: ['LabTechnician', 'Doctor', 'SuperAdmin', 'Administrator'] },
  { label: 'Radiology', path: '/app/radiology', icon: ScanLine, roles: ['LabTechnician', 'Doctor', 'SuperAdmin', 'Administrator'] },
  { label: 'Pharmacy', path: '/app/pharmacy', icon: Pill, roles: ['Pharmacist', 'SuperAdmin', 'Administrator'] },
  { label: 'Billing', path: '/app/billing', icon: Receipt, roles: ['SuperAdmin', 'Administrator', 'Receptionist'] },
  { label: 'Insurance', path: '/app/insurance', icon: ShieldCheck, roles: ['SuperAdmin', 'Administrator', 'Receptionist'] },
  { label: 'Operation Theatre', path: '/app/operation-theatre', icon: Scissors, roles: ['SuperAdmin', 'Administrator', 'Doctor', 'Nurse'] },
  { label: 'Medical Records', path: '/app/medical-records', icon: FileText, roles: ['SuperAdmin', 'Administrator', 'Doctor', 'Nurse'] },
  { label: 'Doctors', path: '/app/manage/doctors', icon: Stethoscope, roles: ['SuperAdmin', 'Administrator'] },
  { label: 'Departments', path: '/app/manage/departments', icon: Building2, roles: ['SuperAdmin', 'Administrator'] },
  { label: 'Employees', path: '/app/manage/employees', icon: Briefcase, roles: ['SuperAdmin', 'Administrator', 'HR'] },
  { label: 'Attendance & Leave', path: '/app/manage/attendance', icon: CalendarClock, roles: ['SuperAdmin', 'Administrator', 'HR'] },
  // Self-service: own check-in/out history + apply for leave. Doctors excluded on purpose - they're
  // tracked via the separate Doctors table, not Employees (see RoleNames.EmployeeSelfService).
  { label: 'My Attendance', path: '/app/my-attendance', icon: Clock, roles: ['Nurse', 'Pharmacist', 'LabTechnician', 'HR', 'Receptionist'] },
  { label: 'Payroll', path: '/app/manage/payroll', icon: Wallet, roles: ['SuperAdmin', 'Administrator', 'HR'] },
  { label: 'Inventory', path: '/app/manage/inventory', icon: Boxes, roles: ['SuperAdmin', 'Administrator'] },
  { label: 'Vendors', path: '/app/manage/vendors', icon: Truck, roles: ['SuperAdmin', 'Administrator'] },
  { label: 'Notifications', path: '/app/notifications', icon: Bell, roles: ALL_STAFF },
  { label: 'Reports', path: '/app/reports', icon: FileBarChart, roles: ['SuperAdmin', 'Administrator'] },
]
