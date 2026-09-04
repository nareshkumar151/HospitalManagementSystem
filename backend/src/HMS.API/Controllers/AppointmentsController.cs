using HMS.Application.Common.Models;
using HMS.Application.Features.Appointments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

public class AppointmentsController : ApiControllerBase
{
    private readonly IAppointmentService _appointmentService;

    public AppointmentsController(IAppointmentService appointmentService) => _appointmentService = appointmentService;

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
}
