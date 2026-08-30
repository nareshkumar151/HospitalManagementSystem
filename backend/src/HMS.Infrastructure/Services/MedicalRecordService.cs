using HMS.Application.Common.Interfaces;
using HMS.Application.Features.MedicalRecords;

namespace HMS.Infrastructure.Services;

public class MedicalRecordService : IMedicalRecordService
{
    private readonly ISqlDataAccess _db;

    public MedicalRecordService(ISqlDataAccess db) => _db = db;

    public async Task<MedicalRecordDto> AddAsync(CreateMedicalRecordRequest request)
    {
        var newId = await _db.QuerySingleAsync<int>("sp_MedicalRecord_Insert", request);
        var records = await GetByPatientAsync(request.PatientId);
        return records.First(r => r.Id == newId);
    }

    public Task<IReadOnlyList<MedicalRecordDto>> GetByPatientAsync(int patientId, string? recordType = null)
        => _db.QueryAsync<MedicalRecordDto>("sp_MedicalRecord_GetByPatient", new { PatientId = patientId, RecordType = recordType });

    public Task<IReadOnlyList<IpPatientListRowDto>> GetIpPatientListAsync()
        => _db.QueryAsync<IpPatientListRowDto>("sp_MedicalRecord_GetIpPatientList");

    public Task DeleteAsync(int id) => _db.ExecuteAsync("sp_MedicalRecord_Delete", new { Id = id });
}
