using HMS.Application.Common.Models;
using HMS.Domain.Enums;

namespace HMS.Application.Features.Appointments;

public record AppointmentDto(
    int Id, int PatientId, string PatientName, int DoctorId, string DoctorName, int DepartmentId, string DepartmentName,
    DateTime AppointmentDate, string TimeSlot, int TokenNumber, AppointmentType Type, AppointmentStatus Status,
    string? CancellationReason, int BranchId);

public record BookAppointmentRequest(
    int PatientId, int DoctorId, int DepartmentId, DateTime AppointmentDate, string TimeSlot,
    AppointmentType Type, int BranchId);

public record RescheduleAppointmentRequest(DateTime NewDate, string NewTimeSlot);
public record CancelAppointmentRequest(string Reason);

public record DoctorSlotAvailabilityDto(string TimeSlot, bool IsBooked);

public interface IAppointmentService
{
    Task<PagedResult<AppointmentDto>> SearchAsync(PagedRequest request, int? doctorId = null, int? patientId = null, DateTime? date = null);
    Task<AppointmentDto> GetByIdAsync(int id);
    Task<AppointmentDto> BookAsync(BookAppointmentRequest request);
    Task<AppointmentDto> RescheduleAsync(int id, RescheduleAppointmentRequest request);
    Task<AppointmentDto> CancelAsync(int id, CancelAppointmentRequest request);
    Task<AppointmentDto> MarkCompletedAsync(int id);
    Task<IReadOnlyList<DoctorSlotAvailabilityDto>> GetAvailableSlotsAsync(int doctorId, DateTime date);
}
