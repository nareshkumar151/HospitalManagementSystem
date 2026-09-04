using HMS.Application.Common.Exceptions;
using HMS.Application.Common.Interfaces;
using HMS.Application.Common.Models;
using HMS.Application.Features.Appointments;
using HMS.Application.Features.Notifications;
using HMS.Domain.Enums;

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
    private readonly INotificationService _notificationService;

    public AppointmentService(ISqlDataAccess db, IAuditService auditService, INotificationService notificationService)
    {
        _db = db;
        _auditService = auditService;
        _notificationService = notificationService;
    }

    public async Task<PagedResult<AppointmentDto>> SearchAsync(PagedRequest request, int? branchId = null, int? doctorId = null, int? patientId = null, DateTime? date = null)
    {
        var (items, counts) = await _db.QueryMultipleAsync<AppointmentDto, int>("sp_Appointment_Search", new
        {
            request.PageNumber,
            request.PageSize,
            BranchId = branchId,
            DoctorId = doctorId,
            PatientId = patientId,
            Date = date?.Date,
            request.Search
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

    public async Task<AppointmentDto> BookAsync(BookAppointmentRequest request, int? bookedByUserId = null)
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
            request.BranchId,
            BookedByUserId = bookedByUserId
        });

        await _auditService.LogAsync("AppointmentBooked", "Appointment", newId.ToString());
        var booked = await GetByIdAsync(newId);
        await NotifyAppointmentBookedAsync(booked);
        return booked;
    }

    /// <summary> Best-effort in-app alert to whoever can log in as this doctor, plus every Administrator at
    /// the branch (so the front office has visibility too) - a missing/broken login must never fail the
    /// booking itself, so failures here are swallowed rather than surfaced to the caller. </summary>
    private async Task NotifyAppointmentBookedAsync(AppointmentDto appointment)
    {
        try
        {
            var doctorUserId = await _db.QuerySingleOrDefaultAsync<int?>("sp_User_GetIdByLinkedProfile",
                new { LinkedProfileId = appointment.DoctorId, RoleName = "Doctor" });
            var adminUserIds = await _db.QueryAsync<int>("sp_User_GetIdsByRole", new { RoleName = "Administrator", appointment.BranchId });

            var doctorMessage = $"New appointment booked: {appointment.PatientName} on {appointment.AppointmentDate:dd MMM yyyy} at {appointment.TimeSlot} (Token #{appointment.TokenNumber}).";
            // DoctorName in the roster isn't consistently stored with a "Dr." prefix - print it as-is rather
            // than risk doubling up (e.g. "Dr. Dr. Aditi Sharma").
            var adminMessage = $"New appointment booked: {appointment.PatientName} with {appointment.DoctorName} on {appointment.AppointmentDate:dd MMM yyyy} at {appointment.TimeSlot} (Token #{appointment.TokenNumber}).";

            if (doctorUserId.HasValue)
            {
                await _notificationService.QueueAsync(new SendNotificationRequest(
                    doctorUserId.Value, null, NotificationChannel.Push, NotificationCategory.Appointment, doctorMessage));
            }
            foreach (var adminUserId in adminUserIds)
            {
                await _notificationService.QueueAsync(new SendNotificationRequest(
                    adminUserId, null, NotificationChannel.Push, NotificationCategory.Appointment, adminMessage));
            }
        }
        catch
        {
            // Notification delivery is a courtesy, not part of the booking contract - never let it break booking.
        }
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
