using HMS.Application.Common.Models;
using HMS.Domain.Enums;

namespace HMS.Application.Features.Insurance;

public record InsuranceClaimDto(
    int Id, int PatientId, string PatientName, int? BillId, string InsuranceCompany, string PolicyNumber,
    decimal CoverageAmount, decimal? ApprovedAmount, ClaimStatus Status, DateTime SubmittedAt, string? Remarks);

public record SubmitClaimRequest(int PatientId, int? BillId, string InsuranceCompany, string PolicyNumber, decimal CoverageAmount);
public record UpdateClaimStatusRequest(ClaimStatus Status, decimal? ApprovedAmount, string? Remarks);

public interface IInsuranceService
{
    Task<InsuranceClaimDto> SubmitAsync(SubmitClaimRequest request);
    Task<InsuranceClaimDto> UpdateStatusAsync(int id, UpdateClaimStatusRequest request);
    Task<IReadOnlyList<InsuranceClaimDto>> GetByPatientAsync(int patientId);
    Task<PagedResult<InsuranceClaimDto>> GetAllAsync(int branchId, PagedRequest request, ClaimStatus? status = null);
}
