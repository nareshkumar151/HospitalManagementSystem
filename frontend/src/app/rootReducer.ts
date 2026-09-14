import { combineReducers } from 'redux'
import { authReducer } from '../features/auth/authReducer'
import { appointmentsReducer } from '../features/appointments/appointmentsSlice'
import { attendanceReducer } from '../features/attendance/attendanceSlice'
import { bedsReducer } from '../features/beds/bedsSlice'
import { billingReducer } from '../features/billing/billingSlice'
import { chargeCatalogReducer } from '../features/chargeCatalog/chargeCatalogSlice'
import { consentsReducer } from '../features/consents/consentsSlice'
import { dashboardReducer } from '../features/dashboard/dashboardSlice'
import { doctorsReducer } from '../features/doctors/doctorsSlice'
import { employeesReducer } from '../features/employees/employeesSlice'
import { erReducer } from '../features/er/erSlice'
import { insuranceResource, radiologyResource, surgeryResource, inventoryResource, vendorResource, payrollResource, leaveRequestResource, ipPatientListResource, notificationResource, labOrderResource, consentTemplateResource, consentSearchResource } from '../features/generic/resources'
import { ipdReducer } from '../features/ipd/ipdSlice'
import { laboratoryReducer } from '../features/laboratory/laboratorySlice'
import { newDepartmentsReducer } from '../features/newdepartments/newDepartmentsSlice'
import { nursingReducer } from '../features/nursing/nursingSlice'
import { opdReducer } from '../features/opd/opdSlice'
import { organizationReducer } from '../features/organization/organizationSlice'
import { otRecordsReducer } from '../features/ot/otRecordsSlice'
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
  chargeCatalog: chargeCatalogReducer,
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
  consents: consentsReducer,
  consentTemplates: consentTemplateResource.reducer,
  consentSearch: consentSearchResource.reducer,
  otRecords: otRecordsReducer,
  er: erReducer,
  newDepartments: newDepartmentsReducer,
})

export type RootState = ReturnType<typeof rootReducer>
