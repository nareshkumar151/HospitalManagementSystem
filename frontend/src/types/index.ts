// Mirrors HMS.Domain.Enums / Application DTOs on the backend. Kept hand-written (no codegen) for a small,
// readable surface - extend alongside the matching C# record when a new field is added.

export type RoleName =
  | 'SuperAdmin' | 'Administrator' | 'Receptionist' | 'Doctor' | 'Nurse' | 'Pharmacist' | 'LabTechnician' | 'HR' | 'Patient'

export type Gender = 'Male' | 'Female' | 'Other'
export type BloodGroup = 'Unknown' | 'APositive' | 'ANegative' | 'BPositive' | 'BNegative' | 'ABPositive' | 'ABNegative' | 'OPositive' | 'ONegative'
export type AppointmentType = 'Online' | 'WalkIn'
export type AppointmentStatus = 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled' | 'Rescheduled'
export type AdmissionType =
  | 'GeneralMedical' | 'GeneralSurgical' | 'Emergency' // legacy values, kept for existing records
  | 'MedicalManagement' | 'SurgicalManagement' | 'PostOpCare' | 'Observation' | 'Daycare'
  | 'ICU' | 'NICU' | 'Delivery' | 'PICU'
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

export interface LeaveBalanceDto {
  employeeId: number
  employeeName: string
  year: number
  entitledDays: number
  usedDays: number
  remainingDays: number
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
  hospitalId: number | null
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
  uhid: string
  patientMobile: string
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

export interface AppointmentRequestDto {
  id: number
  appointmentId: number
  patientName: string
  doctorName: string
  appointmentDate: string
  timeSlot: string
  requestType: 'Cancel' | 'Transfer' | 'Refer'
  reason: string
  status: 'Pending' | 'Approved' | 'Rejected'
  createdAt: string
}

export interface DoctorSlotAvailabilityDto {
  timeSlot: string
  isBooked: boolean
  isPast: boolean
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

export type BillCategory = 'OPD' | 'IPD'

export interface BillDto {
  id: number
  billNumber: string
  patientId: number
  patientName: string
  type: BillType
  category: BillCategory
  opdVisitId: number | null
  ipdAdmissionId: number | null
  subTotal: number
  gstAmount: number
  discountAmount: number
  totalAmount: number
  paidAmount: number
  status: BillStatus
  billDate: string
  items: BillItemDto[]
}

export interface PaymentHistoryDto {
  id: number
  billId: number
  billNumber: string
  patientId: number
  patientName: string
  uhid: string
  amount: number
  mode: PaymentMode
  transactionReference: string | null
  isRefund: boolean
  paidAt: string
  receivedByName: string
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
  uhid: string
  doctorId: number
  doctorName: string
  departmentName: string
  insuranceCompany: string | null
  insurancePolicyNumber: string | null
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
  ipdAdmissionId: number | null
  appointmentId: number | null
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
  respiratoryRate: number | null
  painScore: number | null
  consciousness: string | null
  earlyWarningScore: number | null
}

export type ConsentCategory = 'Registration' | 'Surgery' | 'Anesthesia' | 'Transfusion' | 'LAMA' | 'Procedure'
export type ConsentContext = 'Registration' | 'OPD' | 'IPD' | 'Surgery'
export type ConsentDecision = 'Accepted' | 'Refused'

export interface ConsentTemplateDto {
  id: number
  code: string
  title: string
  category: ConsentCategory
  bodyText: string
  isActive: boolean
}

export interface ConsentRecordDto {
  id: number
  patientId: number
  patientName: string
  templateId: number
  templateTitle: string
  templateBodyText: string
  category: ConsentCategory
  context: ConsentContext
  contextId: number | null
  procedureName: string | null
  decision: ConsentDecision
  signedByName: string
  relationToPatient: string | null
  witnessName: string | null
  witnessUserName: string | null
  refusalReason: string | null
  notes: string | null
  recordedByName: string
  signedAt: string
}

export interface ChecklistItemDto {
  label: string
  checked: boolean
  remarks: string | null
}

export interface SurgeryChecklistDto {
  id: number
  surgeryId: number
  checklistType: string
  items: ChecklistItemDto[]
  remarks: string | null
  completedByName: string
  completedAt: string
}

export interface SurgeryAnesthesiaRecordDto {
  id: number
  surgeryId: number
  recordedAt: string
  recordedByName: string
  anesthesiaType: string | null
  bloodPressure: string | null
  pulseRate: number | null
  spO2: number | null
  temperature: number | null
  remarks: string | null
}

export interface SurgeryRecoveryRecordDto {
  id: number
  surgeryId: number
  recordedAt: string
  recordedByName: string
  activity: number
  respiration: number
  circulation: number
  consciousness: number
  oxygenSaturation: number
  aldreteTotal: number
  bloodPressure: string | null
  pulse: number | null
  spO2: number | null
  remarks: string | null
  dischargedFromRecoveryAt: string | null
}

export interface SurgeryNursingNoteDto {
  id: number
  surgeryId: number
  recordedAt: string
  recordedByName: string
  noteText: string
}

export interface ErVisitDto {
  id: number
  patientId: number
  patientName: string
  uhid: string
  arrivalTime: string
  modeOfArrival: string | null
  broughtBy: string | null
  chiefComplaint: string
  triageCategory: 'Red' | 'Yellow' | 'Green'
  status: string
  registeredByName: string
}

export interface ErNurseAssessmentDto {
  id: number
  erVisitId: number
  assessedAt: string
  nurseName: string
  bloodPressure: string | null
  pulse: number | null
  temperature: number | null
  respiratoryRate: number | null
  spO2: number | null
  painScore: number | null
  gcsTotal: number | null
  initialActions: string | null
  remarks: string | null
}

export interface ErDoctorAssessmentDto {
  id: number
  erVisitId: number
  assessedAt: string
  doctorName: string
  historyOfPresentIllness: string | null
  examinationFindings: string | null
  provisionalDiagnosis: string | null
  treatmentGiven: string | null
  disposition: string
  remarks: string | null
}

export interface TransfusionReactionDto {
  id: number
  patientId: number
  patientName: string
  ipdAdmissionId: number | null
  bloodGroup: string | null
  componentTransfused: string
  unitsTransfused: number | null
  reactionType: string
  symptoms: string | null
  onsetTime: string
  actionTaken: string | null
  outcome: string
  remarks: string | null
  reportedByName: string
}

export interface DialysisSessionDto {
  id: number
  patientId: number
  patientName: string
  ipdAdmissionId: number | null
  sessionDate: string
  dialysisType: string
  durationMinutes: number | null
  preWeight: number | null
  postWeight: number | null
  preBloodPressure: string | null
  postBloodPressure: string | null
  dialyzerType: string | null
  bloodFlowRate: number | null
  ufGoal: number | null
  ufAchieved: number | null
  complications: string | null
  remarks: string | null
  performedByName: string
}

export interface NutritionAssessmentDto {
  id: number
  patientId: number
  patientName: string
  ipdAdmissionId: number | null
  assessedAt: string
  heightCm: number | null
  weightKg: number | null
  bmi: number | null
  dietType: string
  nutritionalRisk: 'Low' | 'Medium' | 'High'
  dietaryHistory: string | null
  allergies: string | null
  recommendations: string | null
  reassessmentDate: string | null
  assessedByName: string
}

export interface HospitalDto {
  id: number
  name: string
  registrationNumber: string
  address: string
  contactNumber: string
  email: string | null
  logoUrl: string | null
  themeColor: string | null
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
  todaysOpdRevenue: number
  todaysIpdRevenue: number
  ipdPatientsCount: number
  bedOccupancyPercent: number
  pendingBillsCount: number
  availableDoctorsCount: number
  todaysSurgeriesCount: number
  dischargedTodayCount: number
  insurancePatientsCount: number
  doctorTodaysAppointments: number
  doctorIpPatientsCount: number
  doctorPlannedDischargesCount: number
  doctorTodaysSurgeriesCount: number
  doctorTomorrowAppointmentsCount: number
  doctorInsurancePatientsCount: number
  pharmacyStockAlerts: { medicineId: number; medicineName: string; stock: number; reorderLevel: number }[]
}

export interface HospitalBreakdownDto {
  hospitalId: number
  hospitalName: string
  themeColor: string | null
  branchCount: number
  doctorCount: number
  patientCount: number
}

export interface PlatformSummaryDto {
  totalHospitals: number
  totalBranches: number
  totalDoctors: number
  totalPatients: number
  totalEmployees: number
  todaysAppointments: number
  todaysRevenue: number
  pendingBillsCount: number
  hospitals: HospitalBreakdownDto[]
}
