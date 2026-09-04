export interface RevenueReportRow { date: string; consultation: number; pharmacy: number; lab: number; admission: number; opd: number; ipd: number; total: number }
export interface DepartmentRevenueRow { departmentName: string; revenue: number }
export interface BedOccupancyRow { wardName: string; totalBeds: number; occupied: number; available: number }
export interface DoctorPerformanceRow { doctorId: number; doctorName: string; consultationCount: number; revenueGenerated: number }
export interface PatientRegisterRow { uhid: string; fullName: string; mobile: string; registeredOn: string }
export interface DailyVisitsRow { date: string; opdCount: number; ipdCount: number }
