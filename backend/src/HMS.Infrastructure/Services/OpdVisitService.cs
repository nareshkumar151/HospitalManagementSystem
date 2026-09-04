using HMS.Application.Common.Exceptions;
using HMS.Application.Common.Interfaces;
using HMS.Application.Features.Appointments;
using HMS.Application.Features.OpdVisits;

namespace HMS.Infrastructure.Services;

public class OpdVisitService : IOpdVisitService
{
    private readonly ISqlDataAccess _db;
    private readonly IAuditService _auditService;

    public OpdVisitService(ISqlDataAccess db, IAuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    public async Task<OpdVisitDto> StartConsultationAsync(StartConsultationRequest request, int doctorId)
    {
        var appointment = await _db.QuerySingleOrDefaultAsync<AppointmentDto>("sp_Appointment_GetById", new { Id = request.AppointmentId })
            ?? throw new NotFoundException(nameof(Domain.Entities.Appointment), request.AppointmentId);

        var isFreeFollowUp = await IsFreeFollowUpEligibleAsync(appointment.PatientId, doctorId);
        var doctor = await _db.QuerySingleAsync<dynamic>("sp_Doctor_GetById", new { Id = doctorId });
        decimal fee = isFreeFollowUp ? 0 : (decimal)doctor.ConsultationFee;

        var visitNumber = await _db.ExecuteScalarAsync<string>("sp_OpdVisit_NextNumber");
        var newId = await _db.QuerySingleAsync<int>("sp_OpdVisit_Insert", new
        {
            OpdVisitNumber = visitNumber,
            request.AppointmentId,
            appointment.PatientId,
            DoctorId = doctorId,
            ConsultationFee = fee,
            IsFreeFollowUp = isFreeFollowUp
        });

        await _db.ExecuteAsync("sp_Appointment_MarkCompleted", new { Id = request.AppointmentId });
        return await GetByIdAsync(newId);
    }

    public async Task<OpdVisitDto> CompleteConsultationAsync(int opdVisitId, CompleteConsultationRequest request)
    {
        await GetByIdAsync(opdVisitId);
        await _db.ExecuteAsync("sp_OpdVisit_CompleteConsultation", new
        {
            Id = opdVisitId,
            request.Symptoms,
            request.Diagnosis,
            request.ClinicalNotes,
            request.DoctorNotes,
            request.AdmissionRecommended,
            request.ReferredToDepartmentId,
            request.TransferNotes
        });
        await _auditService.LogAsync("OpdConsultationCompleted", "OpdVisit", opdVisitId.ToString());
        return await GetByIdAsync(opdVisitId);
    }

    public async Task<OpdVisitDto> GetByIdAsync(int id)
        => await _db.QuerySingleOrDefaultAsync<OpdVisitDto>("sp_OpdVisit_GetById", new { Id = id })
           ?? throw new NotFoundException(nameof(Domain.Entities.OpdVisit), id);

    public Task<IReadOnlyList<OpdVisitDto>> GetByPatientAsync(int patientId, int branchId)
        => _db.QueryAsync<OpdVisitDto>("sp_OpdVisit_GetByPatient", new { PatientId = patientId, BranchId = branchId });

    public Task<IReadOnlyList<OpdVisitDto>> GetByDoctorAsync(int doctorId, int branchId, DateTime? date = null)
        => _db.QueryAsync<OpdVisitDto>("sp_OpdVisit_GetByDoctor", new { DoctorId = doctorId, BranchId = branchId, Date = date?.Date });

    public Task AddNursingNoteAsync(int opdVisitId, OpdNursingNoteRequest request, int nurseUserId)
        => _db.ExecuteAsync("sp_OpdNursingNote_Insert", new
        {
            OpdVisitId = opdVisitId,
            NurseUserId = nurseUserId,
            request.Temperature,
            request.Pulse,
            request.BloodPressure,
            request.Oxygen,
            request.Weight,
            request.SugarLevel,
            request.Notes
        });

    /// <summary> Module 4: OPD Management - "free follow up upto 3 days" with the same doctor. </summary>
    public async Task<bool> IsFreeFollowUpEligibleAsync(int patientId, int doctorId)
    {
        var since = DateTime.UtcNow.AddDays(-3);
        var count = await _db.ExecuteScalarAsync<int>("sp_OpdVisit_CountFollowUpsSince", new { PatientId = patientId, DoctorId = doctorId, SinceDate = since });
        return count > 0;
    }
}
