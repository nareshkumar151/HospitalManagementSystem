namespace HMS.Application.Features.ChargeCatalog;

/// <summary> Rate master for the charge categories that had no admin-editable source of truth before Room
/// Tariff (Rooms.DailyCharge), Consultation (Doctors.ConsultationFee) and Investigation (LabTestCatalog) all
/// already existed. Generate Bill uses this to prefill a line item's description/rate for Nurse Charges,
/// General Service, and Others. </summary>
public record ChargeCatalogItemDto(int Id, string Category, string ItemName, decimal Rate, bool IsActive);

public record UpsertChargeCatalogItemRequest(string Category, string ItemName, decimal Rate, bool IsActive = true);

public interface IChargeCatalogService
{
    Task<IReadOnlyList<ChargeCatalogItemDto>> GetAllAsync(string? category = null, bool includeInactive = false);
    Task<ChargeCatalogItemDto> AddAsync(UpsertChargeCatalogItemRequest request);
    Task UpdateAsync(int id, UpsertChargeCatalogItemRequest request);
    Task DeleteAsync(int id);
}
