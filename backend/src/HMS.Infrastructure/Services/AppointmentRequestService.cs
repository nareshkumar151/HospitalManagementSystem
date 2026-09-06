using HMS.Application.Common.Exceptions;
using HMS.Application.Common.Interfaces;
using HMS.Application.Features.Appointments;

namespace HMS.Infrastructure.Services;

public class AppointmentRequestService : IAppointmentRequestService
{
    private readonly ISqlDataAccess _db;
    private readonly IAppointmentService _appointmentService;
    private readonly IAuditService _auditService;

    public AppointmentRequestService(ISqlDataAccess db, IAppointmentService appointmentService, IAuditService auditService)
    {
        _db = db;
        _appointmentService = appointmentService;
        _auditService = auditService;
    }

    public async Task<AppointmentRequestDto> CreateAsync(int appointmentId, CreateAppointmentActionRequest request, int doctorId)
    {
        // A doctor may only request action on their own appointments, not one booked with a colleague -
        // the shared Appointments list shows every doctor's slots for the day, so this isn't implied by the UI.
        var appointment = await _appointmentService.GetByIdAsync(appointmentId);
        if (appointment.DoctorId != doctorId)
            throw new ForbiddenAccessException("You can only request action on your own appointments.");

        var newId = await _db.QuerySingleAsync<int>("sp_AppointmentRequest_Insert", new
        {
            AppointmentId = appointmentId,
            RequestedByDoctorId = doctorId,
            request.RequestType,
            request.Reason,
        });
        await _auditService.LogAsync("AppointmentActionRequested", "Appointment", appointmentId.ToString(), request.RequestType);
        return await _db.QuerySingleOrDefaultAsync<AppointmentRequestDto>("sp_AppointmentRequest_GetById", new { Id = newId })
            ?? throw new NotFoundException("AppointmentRequest", newId);
    }

    public Task<IReadOnlyList<AppointmentRequestDto>> GetPendingAsync(int branchId)
        => _db.QueryAsync<AppointmentRequestDto>("sp_AppointmentRequest_GetPending", new { BranchId = branchId });

    public async Task ResolveAsync(int id, ResolveAppointmentActionRequest request, int resolvedByUserId)
    {
        var appointmentId = await _db.QuerySingleAsync<int>("sp_AppointmentRequest_Resolve", new
        {
            Id = id,
            request.Status,
            ResolvedByUserId = resolvedByUserId,
            request.ResolutionNotes,
        });

        // Approving any request type (Cancel/Transfer/Refer) frees the original slot - reception re-books
        // the patient elsewhere manually for a Transfer/Refer, same as they would without this workflow.
        if (request.Status == "Approved")
        {
            await _appointmentService.CancelAsync(appointmentId, new CancelAppointmentRequest(request.ResolutionNotes ?? "Approved by front desk"));
        }

        await _auditService.LogAsync("AppointmentRequestResolved", "AppointmentRequest", id.ToString(), request.Status);
    }
}
