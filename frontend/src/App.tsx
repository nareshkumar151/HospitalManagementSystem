import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from './app/hooks'
import { restoreSession } from './features/auth/authActions'
import { AppLayout } from './components/layout/AppLayout'
import { ProtectedRoute } from './routes/ProtectedRoute'

import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { PatientsPage } from './pages/patients/PatientsPage'
import { PatientPortalPage } from './pages/patients/PatientPortalPage'
import { AppointmentsPage } from './pages/appointments/AppointmentsPage'
import { DoctorConsolePage } from './pages/doctorconsole/DoctorConsolePage'
import { IpdPage } from './pages/ipd/IpdPage'
import { NursingPage } from './pages/ipd/NursingPage'
import { PharmacyPage } from './pages/pharmacy/PharmacyPage'
import { BillingPage } from './pages/billing/BillingPage'
import { LaboratoryPage } from './pages/generic/LaboratoryPage'
import { RadiologyPage } from './pages/generic/RadiologyPage'
import { InsurancePage } from './pages/generic/InsurancePage'
import { OperationTheatrePage } from './pages/generic/OperationTheatrePage'
import { MedicalRecordsPage } from './pages/generic/MedicalRecordsPage'
import { NotificationsPage } from './pages/generic/NotificationsPage'
import { HospitalsManagePage } from './pages/admin/HospitalsManagePage'
import { DoctorsManagePage } from './pages/admin/DoctorsManagePage'
import { DepartmentsManagePage } from './pages/admin/DepartmentsManagePage'
import { EmployeesManagePage } from './pages/admin/EmployeesManagePage'
import { AttendanceLeavePage } from './pages/admin/AttendanceLeavePage'
import { PayrollPage } from './pages/admin/PayrollPage'
import { InventoryPage } from './pages/admin/InventoryPage'
import { VendorsPage } from './pages/admin/VendorsPage'
import { ReportsPage } from './pages/admin/ReportsPage'
import { MyAttendancePage } from './pages/employee/MyAttendancePage'
import { ProfilePage } from './pages/ProfilePage'
import { NotFoundPage } from './pages/NotFoundPage'

export default function App() {
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state) => state.auth)

  useEffect(() => {
    dispatch(restoreSession())
  }, [dispatch])

  return (
    <Routes>
      <Route path="/" element={<Navigate to={user ? '/app/dashboard' : '/login'} replace />} />
      <Route path="/login" element={user ? <Navigate to="/app/dashboard" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/app/dashboard" replace /> : <RegisterPage />} />

      <Route path="/app" element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="profile" element={<ProfilePage />} />

          <Route element={<ProtectedRoute allowedRoles={['Patient']} />}>
            <Route path="patient" element={<PatientPortalPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['SuperAdmin']} />}>
            <Route path="manage/hospitals" element={<HospitalsManagePage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['SuperAdmin', 'Administrator', 'Receptionist', 'Doctor', 'Nurse']} />}>
            <Route path="patients" element={<PatientsPage />} />
            <Route path="ipd" element={<IpdPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['SuperAdmin', 'Administrator', 'Receptionist', 'Doctor']} />}>
            <Route path="appointments" element={<AppointmentsPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Doctor']} />}>
            <Route path="doctor-console" element={<DoctorConsolePage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Nurse', 'SuperAdmin', 'Administrator']} />}>
            <Route path="nursing" element={<NursingPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['LabTechnician', 'Doctor', 'SuperAdmin', 'Administrator']} />}>
            <Route path="laboratory" element={<LaboratoryPage />} />
            <Route path="radiology" element={<RadiologyPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Pharmacist', 'SuperAdmin', 'Administrator']} />}>
            <Route path="pharmacy" element={<PharmacyPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['SuperAdmin', 'Administrator', 'Receptionist']} />}>
            <Route path="billing" element={<BillingPage />} />
            <Route path="insurance" element={<InsurancePage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['SuperAdmin', 'Administrator', 'Doctor', 'Nurse']} />}>
            <Route path="operation-theatre" element={<OperationTheatrePage />} />
            <Route path="medical-records" element={<MedicalRecordsPage />} />
          </Route>

          <Route path="notifications" element={<NotificationsPage />} />

          <Route element={<ProtectedRoute allowedRoles={['SuperAdmin', 'Administrator']} />}>
            <Route path="manage/doctors" element={<DoctorsManagePage />} />
            <Route path="manage/departments" element={<DepartmentsManagePage />} />
            <Route path="manage/inventory" element={<InventoryPage />} />
            <Route path="manage/vendors" element={<VendorsPage />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['SuperAdmin', 'Administrator', 'HR']} />}>
            <Route path="manage/employees" element={<EmployeesManagePage />} />
            <Route path="manage/attendance" element={<AttendanceLeavePage />} />
            <Route path="manage/payroll" element={<PayrollPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Nurse', 'Pharmacist', 'LabTechnician', 'HR', 'Receptionist']} />}>
            <Route path="my-attendance" element={<MyAttendancePage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
