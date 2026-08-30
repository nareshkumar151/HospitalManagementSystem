using HMS.Application.Common.Exceptions;
using HMS.Application.Common.Interfaces;
using HMS.Application.Common.Models;
using HMS.Application.Features.Patients;
using HMS.Domain.Enums;

namespace HMS.Infrastructure.Services;

public class PatientService : IPatientService
{
    private readonly ISqlDataAccess _db;
    private readonly IAuditService _auditService;

    public PatientService(ISqlDataAccess db, IAuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    public async Task<PagedResult<PatientDto>> SearchAsync(PagedRequest request)
    {
        var (items, counts) = await _db.QueryMultipleAsync<PatientDto, int>("sp_Patient_Search", new
        {
            request.PageNumber,
            request.PageSize,
            request.Search
        });

        return new PagedResult<PatientDto>
        {
            Items = items,
            TotalCount = counts.FirstOrDefault(),
            PageNumber = request.PageNumber,
            PageSize = request.PageSize
        };
    }

    public async Task<PatientDto> GetByIdAsync(int id)
    {
        return await _db.QuerySingleOrDefaultAsync<PatientDto>("sp_Patient_GetById", new { Id = id })
            ?? throw new NotFoundException(nameof(Domain.Entities.Patient), id);
    }

    public Task<PatientDto?> GetByUhidAsync(string uhid)
    {
        return _db.QuerySingleOrDefaultAsync<PatientDto>("sp_Patient_GetByUhid", new { UHID = uhid });
    }

    public async Task<PatientDto> CreateAsync(UpsertPatientRequest request)
    {
        var uhid = await _db.ExecuteScalarAsync<string>("sp_Patient_NextUhid");

        var newId = await _db.QuerySingleAsync<int>("sp_Patient_Insert", new
        {
            UHID = uhid,
            request.AadhaarNumber,
            request.FullName,
            Gender = request.Gender.ToString(),
            request.DateOfBirth,
            request.Age,
            request.Mobile,
            request.Email,
            request.Address,
            BloodGroup = request.BloodGroup.ToString(),
            request.EmergencyContactName,
            request.EmergencyContactNumber,
            request.ReferredByDoctorName,
            request.ReferralHospital,
            request.ReferralNotes,
            request.InsuranceCompany,
            request.InsurancePolicyNumber,
            request.Allergies,
            request.BranchId
        });

        await _auditService.LogAsync("PatientRegistered", "Patient", newId.ToString(), uhid);
        return await GetByIdAsync(newId);
    }

    public async Task UpdateAsync(int id, UpsertPatientRequest request)
    {
        await GetByIdAsync(id); // 404 if missing

        await _db.ExecuteAsync("sp_Patient_Update", new
        {
            Id = id,
            request.AadhaarNumber,
            request.FullName,
            Gender = request.Gender.ToString(),
            request.DateOfBirth,
            request.Age,
            request.Mobile,
            request.Email,
            request.Address,
            BloodGroup = request.BloodGroup.ToString(),
            request.EmergencyContactName,
            request.EmergencyContactNumber,
            request.ReferredByDoctorName,
            request.ReferralHospital,
            request.ReferralNotes,
            request.InsuranceCompany,
            request.InsurancePolicyNumber,
            request.Allergies
        });

        await _auditService.LogAsync("PatientUpdated", "Patient", id.ToString());
    }

    public async Task DeleteAsync(int id)
    {
        await GetByIdAsync(id);
        await _db.ExecuteAsync("sp_Patient_Delete", new { Id = id });
        await _auditService.LogAsync("PatientDeleted", "Patient", id.ToString());
    }

    public async Task<PatientHistoryDto> GetHistoryAsync(int id)
    {
        var patient = await GetByIdAsync(id);
        var opdVisits = await _db.QueryAsync<dynamic>("sp_OpdVisit_GetByPatient", new { PatientId = id });
        var (prescriptions, _) = await _db.QueryMultipleAsync<dynamic, dynamic>("sp_Prescription_GetByPatient", new { PatientId = id });
        var admissions = await _db.QueryAsync<dynamic>("sp_IpdAdmission_GetByPatient", new { PatientId = id });
        var labReports = await _db.QueryAsync<dynamic>("sp_LabTestOrder_GetByPatient", new { PatientId = id });

        return new PatientHistoryDto(
            patient,
            opdVisits.Cast<object>().ToList(),
            prescriptions.Cast<object>().ToList(),
            admissions.Cast<object>().ToList(),
            labReports.Cast<object>().ToList());
    }
}
