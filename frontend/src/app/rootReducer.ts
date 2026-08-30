import { combineReducers } from 'redux'
import { authReducer } from '../features/auth/authReducer'
import { appointmentsReducer } from '../features/appointments/appointmentsSlice'
import { attendanceReducer } from '../features/attendance/attendanceSlice'
import { bedsReducer } from '../features/beds/bedsSlice'
import { billingReducer } from '../features/billing/billingSlice'
import { dashboardReducer } from '../features/dashboard/dashboardSlice'
import { doctorsReducer } from '../features/doctors/doctorsSlice'
import { employeesReducer } from '../features/employees/employeesSlice'
import { insuranceResource, radiologyResource, surgeryResource, inventoryResource, vendorResource, payrollResource, leaveRequestResource, ipPatientListResource, notificationResource, labOrderResource } from '../features/generic/resources'
import { ipdReducer } from '../features/ipd/ipdSlice'
import { laboratoryReducer } from '../features/laboratory/laboratorySlice'
import { nursingReducer } from '../features/nursing/nursingSlice'
import { opdReducer } from '../features/opd/opdSlice'
import { organizationReducer } from '../features/organization/organizationSlice'
import { patientsReducer } from '../features/patients/patientsSlice'
import { pharmacyReducer } from '../features/pharmacy/pharmacySlice'
import { prescriptionsReducer } from '../features/prescriptions/prescriptionsSlice'

export const rootReducer = combineReducers({
  auth: authReducer,
  patients: patientsReducer,
  doctors: doctorsReducer,
  appointments: appointmentsReducer,
  attendance: attendanceReducer,
  opd: opdReducer,
  prescriptions: prescriptionsReducer,
  beds: bedsReducer,
  ipd: ipdReducer,
  laboratory: laboratoryReducer,
  nursing: nursingReducer,
  pharmacy: pharmacyReducer,
  billing: billingReducer,
  dashboard: dashboardReducer,
  employees: employeesReducer,
  organization: organizationReducer,
  insurance: insuranceResource.reducer,
  radiology: radiologyResource.reducer,
  surgery: surgeryResource.reducer,
  inventory: inventoryResource.reducer,
  vendors: vendorResource.reducer,
  payroll: payrollResource.reducer,
  leaveRequests: leaveRequestResource.reducer,
  ipPatientList: ipPatientListResource.reducer,
  notifications: notificationResource.reducer,
  labOrders: labOrderResource.reducer,
})

export type RootState = ReturnType<typeof rootReducer>
