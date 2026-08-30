// Mirrors HMS.Domain.Enums / Application DTOs on the backend. Kept hand-written (no codegen) for a small,
// readable surface - extend alongside the matching C# record when a new field is added.

export type RoleName =
  | 'SuperAdmin' | 'Administrator' | 'Receptionist' | 'Doctor' | 'Nurse' | 'Pharmacist' | 'LabTechnician' | 'HR' | 'Patient'

export type Gender = 'Male' | 'Female' | 'Other'
export type BloodGroup = 'Unknown' | 'APositive' | 'ANegative' | 'BPositive' | 'BNegative' | 'ABPositive' | 'ABNegative' | 'OPositive' | 'ONegative'
export type AppointmentType = 'Online' | 'WalkIn'
export type AppointmentStatus = 'Scheduled' | 'Completed' | 'Cancelled' | 'Rescheduled'
export type AdmissionType = 'GeneralMedical' | 'GeneralSurgical' | 'ICU' | 'Emergency'
export type RoomType = 'General' | 'SemiPrivate' | 'Private' | 'Deluxe' | 'ICU'
export type BedStatus = 'Available' | 'Occupied' | 'Reserved' | 'Maintenance'
export type AdmissionStatus = 'Admitted' | 'Discharged' | 'Transferred'
export type LabTestStatus = 'Ordered' | 'SampleCollected' | 'Processing' | 'ReportUploaded' | 'Reviewed'
export type PrescriptionStatus = 'Active' | 'Dispensed' | 'Cancelled'
export type PaymentMode = 'Cash' | 'Card' | 'UPI' | 'Insurance'
export type BillStatus = 'Draft' | 'Pending' | 'PartiallyPaid' | 'Paid' | 'Refunded'
export type BillType = 'Consultation' | 'Admission' | 'Lab' | 'Pharmacy' | 'Operation' | 'Room' | 'Nursing'
export type ClaimStatus = 'Submitted' | 'UnderReview' | 'Approved' | 'Rejected' | 'Settled'
export type LeaveStatus = 'Requested' | 'Approved' | 'Rejected'

export interface AttendanceDto {
  id: number
  employeeId: number
  employeeName: string
  attendanceDate: string
  checkIn: string | null
  checkOut: string | null
  overtimeHours: number
  shift: string
}

export interface AttendanceSummaryDto {
  totalEmployees: number
  presentToday: number
  onLeaveToday: number
  pendingLeaveRequests: number
}

export interface LeaveRequestDto {
  id: number
  employeeId: number
  employeeName: string
  fromDate: string
  toDate: string
  reason: string
  status: LeaveStatus
}

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  pageNumber: number
  pageSize: number
  totalPages: number
}

export interface PagedRequest {
  pageNumber: number
  pageSize: number
  search?: string
}

export interface LoginResponse {
  accessToken: string
  accessTokenExpiresAt: string
  refreshToken: string
  userId: number
  username: string
  email: string
  role: RoleName
  branchId: number | null
  linkedProfileId: number | null
}

export interface PatientDto {
  id: number
  uhid: string
  aadhaarNumber: string | null
  fullName: string
  gender: Gender
  dateOfBirth: string | null
  age: number | null
  mobile: string
  email: string | null
  address: string | null
  bloodGroup: BloodGroup
  emergencyContactName: string | null
  emergencyContactNumber: string | null
  referredByDoctorName: string | null
  referralHospital: string | null
  referralNotes: string | null
  insuranceCompany: string | null
  insurancePolicyNumber: string | null
  allergies: string | null
  branchId: number
  createdAt: string
}

export interface DoctorDto {
  id: number
  doctorCode: string
  fullName: string
  departmentId: number
  departmentName: string
  qualification: string
  experienceYears: number
  consultationFee: number
  availableDays: string | null
  mobile: string | null
  email: string | null
  digitalSignatureUrl: string | null
  branchId: number
  isActive: boolean
  hasLogin: boolean
}

export interface DepartmentDto {
  id: number
  branchId: number
  name: string
  description: string | null
  isActive: boolean
}

export interface AppointmentDto {
  id: number
  patientId: number
  patientName: string
  doctorId: number
  doctorName: string
  departmentId: number
  departmentName: string
  appointmentDate: string
  timeSlot: string
  tokenNumber: number
  type: AppointmentType
  status: AppointmentStatus
  cancellationReason: string | null
  branchId: number
}

export interface DoctorSlotAvailabilityDto {
  timeSlot: string
  isBooked: boolean
}

export interface OpdVisitDto {
  id: number
  opdVisitNumber: string
  appointmentId: number
  patientId: number
  patientName: string
  doctorId: number
  doctorName: string
  consultationFee: number
  isFreeFollowUp: boolean
  symptoms: string | null
  diagnosis: string | null
  clinicalNotes: string | null
  doctorNotes: string | null
  admissionRecommended: boolean
  referredToDepartmentId: number | null
  transferNotes: string | null
  visitDateTime: string
}

export interface PrescriptionItemDto {
  medicineId: number
  medicineName: string
  dosage: string
  frequency: string
  durationDays: number
  instructions: string | null
}

export interface PrescriptionDto {
  id: number
  patientId: number
  patientName: string
  doctorId: number
  doctorName: string
  opdVisitId: number | null
  ipdAdmissionId: number | null
  prescribedDate: string
  status: PrescriptionStatus
  digitalSignature: string | null
  items: PrescriptionItemDto[]
}

export interface MedicineDto {
  id: number
  medicineName: string
  genericName: string
  batchNumber: string
  expiryDate: string
  manufacturer: string
  purchasePrice: number
  sellingPrice: number
  stock: number
  reorderLevel: number
  branchId: number
}

export interface PharmacySaleItemDto {
  medicineId: number
  medicineName: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface PharmacySaleDto {
  id: number
  invoiceNumber: string
  patientId: number
  patientName: string
  totalAmount: number
  saleDate: string
  items: PharmacySaleItemDto[]
}

export interface BillItemDto {
  description: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface BillDto {
  id: number
  billNumber: string
  patientId: number
  patientName: string
  type: BillType
  subTotal: number
  gstAmount: number
  discountAmount: number
  totalAmount: number
  paidAmount: number
  status: BillStatus
  billDate: string
  items: BillItemDto[]
}

export interface WardDto { id: number; name: string; type: RoomType; branchId: number }
export interface RoomDto { id: number; wardId: number; roomNumber: string; type: RoomType; dailyCharge: number }
export interface BedDto { id: number; roomId: number; roomNumber: string; roomType: RoomType; bedNumber: string; status: BedStatus; isIcu: boolean }
export interface BedOccupancySummaryDto { totalBeds: number; occupiedBeds: number; availableBeds: number; icuBeds: number; icuOccupied: number }

export interface IpdAdmissionDto {
  id: number
  admissionNumber: string
  patientId: number
  patientName: string
  doctorId: number
  doctorName: string
  nurseUserId: number | null
  nurseName: string | null
  bedId: number
  bedNumber: string
  roomNumber: string
  roomType: RoomType
  admissionDate: string
  admissionType: AdmissionType
  status: AdmissionStatus
  reasonForAdmission: string | null
  dischargeDate: string | null
  branchId: number
}

export interface NursingChartDto {
  id: number
  ipdAdmissionId: number
  nurseUserId: number
  nurseName: string
  recordedAt: string
  temperature: number | null
  pulse: number | null
  bloodPressure: string | null
  oxygen: number | null
  weight: number | null
  sugarLevel: number | null
  medicationSchedule: string | null
  dailyNotes: string | null
  patientMonitoring: string | null
}

export interface HospitalDto {
  id: number
  name: string
  registrationNumber: string
  address: string
  contactNumber: string
  email: string | null
  logoUrl: string | null
}

export interface BranchDto {
  id: number
  hospitalId: number
  name: string
  address: string
  city: string
  contactNumber: string
  isActive: boolean
}

export interface RazorpayOrderResponseDto {
  razorpayOrderId: string
  amountInPaise: number
  currency: string
  razorpayKeyId: string
  billId: number
}

export interface DashboardSummaryDto {
  todaysPatients: number
  todaysRevenue: number
  bedOccupancyPercent: number
  pendingBillsCount: number
  availableDoctorsCount: number
  todaysSurgeriesCount: number
  pharmacyStockAlerts: { medicineId: number; medicineName: string; stock: number; reorderLevel: number }[]
}
