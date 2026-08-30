import { createResourceSlice } from './createResourceSlice'

// Minimal row shapes for the scaffold modules - widen these as each screen grows real business logic.
export interface InsuranceClaimRow { id: number; patientId: number; patientName: string; insuranceCompany: string; policyNumber: string; coverageAmount: number; approvedAmount: number | null; status: string; submittedAt: string }
export interface RadiologyOrderRow { id: number; patientId: number; patientName: string; doctorId: number; doctorName: string; scanType: string; status: string; orderedAt: string; price: number; reportFileUrl: string | null; doctorNotes: string | null }
export interface SurgeryRow { id: number; patientId: number; patientName: string; surgeryName: string; surgeonDoctorId: number; surgeonName: string; scheduledAt: string; operationCost: number; status: string }
export interface InventoryItemRow { id: number; itemName: string; type: string; unit: string; stock: number; reorderLevel: number; expiryDate: string | null }
export interface VendorRow { id: number; name: string; gstNumber: string; contact: string; address: string | null; isActive: boolean }
export interface PayrollRow { id: number; employeeId: number; employeeName: string; payPeriod: string; basicSalary: number; pf: number; esi: number; taxDeduction: number; bonus: number; netSalary: number; generatedAt: string }
export interface LeaveRequestRow { id: number; employeeId: number; employeeName: string; fromDate: string; toDate: string; reason: string; status: string }
export interface IpPatientListRow { patientId: number; uhid: string; fullName: string; mobile: string; admissionNumber: string; status: string; admissionDate: string; dischargeDate: string | null }
export interface NotificationRow { id: number; channel: string; category: string; message: string; isSent: boolean; isRead: boolean; createdAt: string }
export interface LabTestOrderRow { id: number; patientId: number; patientName: string; doctorId: number; doctorName: string; testName: string; status: string; orderedAt: string }

export const insuranceResource = createResourceSlice<InsuranceClaimRow>('insurance', '/insurance')
export const radiologyResource = createResourceSlice<RadiologyOrderRow>('radiology', '/radiology/orders/pending')
export const surgeryResource = createResourceSlice<SurgeryRow>('surgery', '/operationtheatre/today')
export const inventoryResource = createResourceSlice<InventoryItemRow>('inventory', '/inventory')
export const vendorResource = createResourceSlice<VendorRow>('vendors', '/vendors')
// Payroll has no "get all" endpoint by design (payslips are always scoped to an employee or a pay period);
// the Payroll page passes a concrete `/payroll/period/{yyyy-MM}` path via fetchAll's pathOverride argument.
export const payrollResource = createResourceSlice<PayrollRow>('payroll', '/payroll/period')
export const leaveRequestResource = createResourceSlice<LeaveRequestRow>('leaveRequests', '/attendance/leave-requests')
export const ipPatientListResource = createResourceSlice<IpPatientListRow>('ipPatientList', '/medicalrecords/ip-patient-list')
export const notificationResource = createResourceSlice<NotificationRow>('notifications', '/notifications/my')
export const labOrderResource = createResourceSlice<LabTestOrderRow>('laborders', '/laboratory/orders/pending')
