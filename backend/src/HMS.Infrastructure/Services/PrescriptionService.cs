using HMS.Application.Common.Exceptions;
using HMS.Application.Common.Interfaces;
using HMS.Application.Features.Prescriptions;

namespace HMS.Infrastructure.Services;

public class PrescriptionService : IPrescriptionService
{
    private readonly ISqlDataAccess _db;
    private readonly IAuditService _auditService;

    public PrescriptionService(ISqlDataAccess db, IAuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    public async Task<PrescriptionDto> CreateAsync(CreatePrescriptionRequest request, int doctorId)
    {
        var newId = await _db.QuerySingleAsync<int>("sp_Prescription_Insert", new
        {
            request.PatientId,
            DoctorId = doctorId,
            request.OpdVisitId,
            request.IpdAdmissionId,
            request.DigitalSignature
        });

        foreach (var item in request.Items)
        {
            await _db.ExecuteAsync("sp_PrescriptionItem_Insert", new
            {
                PrescriptionId = newId,
                item.MedicineId,
                item.Dosage,
                item.Frequency,
                item.DurationDays,
                item.Instructions
            });
        }

        await _auditService.LogAsync("PrescriptionCreated", "Prescription", newId.ToString());
        return await GetByIdAsync(newId);
    }

    public async Task<PrescriptionDto> GetByIdAsync(int id)
    {
        var (headers, items) = await _db.QueryMultipleAsync<PrescriptionHeaderRow, PrescriptionItemDto>("sp_Prescription_GetById", new { Id = id });
        var header = headers.FirstOrDefault() ?? throw new NotFoundException(nameof(Domain.Entities.Prescription), id);
        return Map(header, items);
    }

    public async Task<IReadOnlyList<PrescriptionDto>> GetByPatientAsync(int patientId)
    {
        var (headers, items) = await _db.QueryMultipleAsync<PrescriptionHeaderRow, PrescriptionItemRow>("sp_Prescription_GetByPatient", new { PatientId = patientId });
        return headers.Select(h => Map(h, items.Where(i => i.PrescriptionId == h.Id).Select(i => new PrescriptionItemDto(i.MedicineId, i.MedicineName, i.Dosage, i.Frequency, i.DurationDays, i.Instructions))))
            .ToList();
    }

    public Task MarkDispensedAsync(int id) => _db.ExecuteAsync("sp_Prescription_UpdateStatus", new { Id = id, Status = "Dispensed" });

    public Task CancelAsync(int id) => _db.ExecuteAsync("sp_Prescription_UpdateStatus", new { Id = id, Status = "Cancelled" });

    private static PrescriptionDto Map(PrescriptionHeaderRow header, IEnumerable<PrescriptionItemDto> items) =>
        new(header.Id, header.PatientId, header.PatientName, header.DoctorId, header.DoctorName, header.OpdVisitId,
            header.IpdAdmissionId, header.PrescribedDate, Enum.Parse<Domain.Enums.PrescriptionStatus>(header.Status),
            header.DigitalSignature, items.ToList());

    internal record PrescriptionHeaderRow(
        int Id, int PatientId, string PatientName, int DoctorId, string DoctorName, int? OpdVisitId,
        int? IpdAdmissionId, DateTime PrescribedDate, string Status, string? DigitalSignature);

    internal record PrescriptionItemRow(int PrescriptionId, int MedicineId, string MedicineName, string Dosage, string Frequency, int DurationDays, string? Instructions);
}
