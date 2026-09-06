using HMS.Application.Common.Models;
using HMS.Application.Features.Appointments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

public class AppointmentsController : ApiControllerBase
{
    private readonly IAppointmentService _appointmentService;
    private readonly IAppointmentRequestService _appointmentRequestService;

    public AppointmentsController(IAppointmentService appointmentService, IAppointmentRequestService appointmentRequestService)
    {
        _appointmentService = appointmentService;
        _appointmentRequestService = appointmentRequestService;
    }

    [HttpGet]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Receptionist + "," + RoleNames.Doctor)]
    public async Task<ActionResult<PagedResult<AppointmentDto>>> Search(
        [FromQuery] PagedRequest request, [FromQuery] int? doctorId, [FromQuery] int? patientId, [FromQuery] DateTime? date)
        => Ok(await _appointmentService.SearchAsync(request, CurrentBranchId, doctorId, patientId, date));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AppointmentDto>> GetById(int id)
    {
        var appointment = await _appointmentService.GetByIdAsync(id);
        if (User.IsInRole(RoleNames.Patient))
        {
            if (CurrentLinkedProfileId != appointment.PatientId) return Forbid();
        }
        else if (CurrentBranchIdOrNull is { } branchId && appointment.BranchId != branchId)
        {
            return Forbid();
        }
        return Ok(appointment);
    }

    [HttpGet("my")]
    [Authorize(Roles = RoleNames.Patient)]
    public async Task<ActionResult<PagedResult<AppointmentDto>>> GetMine([FromQuery] PagedRequest request)
        => Ok(await _appointmentService.SearchAsync(request, patientId: CurrentLinkedProfileId));

    [HttpGet("doctor/{doctorId:int}/slots")]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<DoctorSlotAvailabilityDto>>> GetSlots(int doctorId, [FromQuery] DateTime date)
        => Ok(await _appointmentService.GetAvailableSlotsAsync(doctorId, date));

    [HttpPost]
    [Authorize(Roles = RoleNames.FrontDesk + "," + RoleNames.Patient)]
    public async Task<ActionResult<AppointmentDto>> Book(BookAppointmentRequest request)
    {
        // Only attribute the booking to a front-desk user, not to a patient booking their own appointment.
        var bookedByUserId = User.IsInRole(RoleNames.Patient) ? null : (int?)CurrentUserId;
        var created = await _appointmentService.BookAsync(request, bookedByUserId);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}/reschedule")]
    [Authorize(Roles = RoleNames.FrontDesk + "," + RoleNames.Patient)]
    public async Task<ActionResult<AppointmentDto>> Reschedule(int id, RescheduleAppointmentRequest request)
        => Ok(await _appointmentService.RescheduleAsync(id, request));

    [HttpPut("{id:int}/cancel")]
    [Authorize(Roles = RoleNames.FrontDesk + "," + RoleNames.Patient)]
    public async Task<ActionResult<AppointmentDto>> Cancel(int id, CancelAppointmentRequest request)
        => Ok(await _appointmentService.CancelAsync(id, request));

    [HttpPut("{id:int}/complete")]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Doctor)]
    public async Task<ActionResult<AppointmentDto>> Complete(int id) => Ok(await _appointmentService.MarkCompletedAsync(id));

    // --- Appointment Action Requests: doctors request Cancel/Transfer/Refer instead of cancelling directly ---

    [HttpPost("{id:int}/request-action")]
    [Authorize(Roles = RoleNames.Doctor)]
    public async Task<ActionResult<AppointmentRequestDto>> RequestAction(int id, CreateAppointmentActionRequest request)
        => Ok(await _appointmentRequestService.CreateAsync(id, request, CurrentLinkedProfileId!.Value));

    [HttpGet("requests/pending")]
    [Authorize(Roles = RoleNames.AdminOnly + "," + RoleNames.Receptionist)]
    public async Task<ActionResult<IReadOnlyList<AppointmentRequestDto>>> GetPendingRequests()
        => Ok(await _appointmentRequestService.GetPendingAsync(CurrentBranchId));

    [HttpPut("requests/{id:int}/resolve")]
    [Authorize(Roles = RoleNames.AdminOnly + "," + RoleNames.Receptionist)]
    public async Task<IActionResult> ResolveRequest(int id, ResolveAppointmentActionRequest request)
    {
        await _appointmentRequestService.ResolveAsync(id, request, CurrentUserId);
        return NoContent();
    }
}
