using HMS.Application.Common.Exceptions;
using HMS.Application.Common.Interfaces;
using HMS.Application.Common.Models;
using HMS.Application.Features.Appointments;

namespace HMS.Infrastructure.Services;

public class AppointmentService : IAppointmentService
{
    private static readonly string[] DefaultSlots =
    {
        "09:00-09:20", "09:20-09:40", "09:40-10:00", "10:00-10:20", "10:20-10:40",
        "11:00-11:20", "11:20-11:40", "11:40-12:00", "14:00-14:20", "14:20-14:40",
        "14:40-15:00", "15:00-15:20", "15:20-15:40", "16:00-16:20", "16:20-16:40"
    };

    private readonly ISqlDataAccess _db;
    private readonly IAuditService _auditService;

    public AppointmentService(ISqlDataAccess db, IAuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    public async Task<PagedResult<AppointmentDto>> SearchAsync(PagedRequest request, int? doctorId = null, int? patientId = null, DateTime? date = null)
    {
        var (items, counts) = await _db.QueryMultipleAsync<AppointmentDto, int>("sp_Appointment_Search", new
        {
            request.PageNumber,
            request.PageSize,
            DoctorId = doctorId,
            PatientId = patientId,
            Date = date?.Date
        });

        return new PagedResult<AppointmentDto>
        {
            Items = items,
            TotalCount = counts.FirstOrDefault(),
            PageNumber = request.PageNumber,
            PageSize = request.PageSize
        };
    }

    public async Task<AppointmentDto> GetByIdAsync(int id)
        => await _db.QuerySingleOrDefaultAsync<AppointmentDto>("sp_Appointment_GetById", new { Id = id })
           ?? throw new NotFoundException(nameof(Domain.Entities.Appointment), id);

    public async Task<AppointmentDto> BookAsync(BookAppointmentRequest request)
    {
        var slotTaken = await _db.ExecuteScalarAsync<int>("sp_Appointment_CheckSlotTaken", new
        {
            request.DoctorId,
            AppointmentDate = request.AppointmentDate.Date,
            request.TimeSlot
        });
        if (slotTaken > 0)
            throw new ConflictException("This time slot is already booked for the selected doctor.");

        var token = await _db.ExecuteScalarAsync<int>("sp_Appointment_NextTokenNumber", new
        {
            request.DoctorId,
            AppointmentDate = request.AppointmentDate.Date
        });

        var newId = await _db.QuerySingleAsync<int>("sp_Appointment_Insert", new
        {
            request.PatientId,
            request.DoctorId,
            request.DepartmentId,
            AppointmentDate = request.AppointmentDate.Date,
            request.TimeSlot,
            TokenNumber = token,
            Type = request.Type.ToString(),
            request.BranchId
        });

        await _auditService.LogAsync("AppointmentBooked", "Appointment", newId.ToString());
        return await GetByIdAsync(newId);
    }

    public async Task<AppointmentDto> RescheduleAsync(int id, RescheduleAppointmentRequest request)
    {
        var existing = await GetByIdAsync(id);

        var slotTaken = await _db.ExecuteScalarAsync<int>("sp_Appointment_CheckSlotTaken", new
        {
            existing.DoctorId,
            AppointmentDate = request.NewDate.Date,
            TimeSlot = request.NewTimeSlot
        });
        if (slotTaken > 0)
            throw new ConflictException("This time slot is already booked for the selected doctor.");

        await _db.ExecuteAsync("sp_Appointment_Reschedule", new
        {
            Id = id,
            NewDate = request.NewDate.Date,
            request.NewTimeSlot,
            OldTimeSlot = existing.TimeSlot
        });

        await _auditService.LogAsync("AppointmentRescheduled", "Appointment", id.ToString());
        return await GetByIdAsync(id);
    }

    public async Task<AppointmentDto> CancelAsync(int id, CancelAppointmentRequest request)
    {
        await GetByIdAsync(id);
        await _db.ExecuteAsync("sp_Appointment_Cancel", new { Id = id, request.Reason });
        await _auditService.LogAsync("AppointmentCancelled", "Appointment", id.ToString(), request.Reason);
        return await GetByIdAsync(id);
    }

    public async Task<AppointmentDto> MarkCompletedAsync(int id)
    {
        await GetByIdAsync(id);
        await _db.ExecuteAsync("sp_Appointment_MarkCompleted", new { Id = id });
        return await GetByIdAsync(id);
    }

    public async Task<IReadOnlyList<DoctorSlotAvailabilityDto>> GetAvailableSlotsAsync(int doctorId, DateTime date)
    {
        var booked = await _db.QueryAsync<string>("sp_Appointment_GetBookedSlots", new { DoctorId = doctorId, Date = date.Date });
        var bookedSet = booked.ToHashSet();
        return DefaultSlots.Select(slot => new DoctorSlotAvailabilityDto(slot, bookedSet.Contains(slot))).ToList();
    }
}
