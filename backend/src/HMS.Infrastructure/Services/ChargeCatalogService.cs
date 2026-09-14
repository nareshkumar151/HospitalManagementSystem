using HMS.Application.Common.Interfaces;
using HMS.Application.Features.ChargeCatalog;

namespace HMS.Infrastructure.Services;

public class ChargeCatalogService : IChargeCatalogService
{
    private readonly ISqlDataAccess _db;

    public ChargeCatalogService(ISqlDataAccess db) => _db = db;

    public Task<IReadOnlyList<ChargeCatalogItemDto>> GetAllAsync(string? category = null, bool includeInactive = false)
        => _db.QueryAsync<ChargeCatalogItemDto>("sp_ChargeCatalog_GetAll", new { Category = category, IncludeInactive = includeInactive });

    public async Task<ChargeCatalogItemDto> AddAsync(UpsertChargeCatalogItemRequest request)
    {
        var newId = await _db.QuerySingleAsync<int>("sp_ChargeCatalog_Insert", request);
        var all = await GetAllAsync(includeInactive: true);
        return all.First(c => c.Id == newId);
    }

    public Task UpdateAsync(int id, UpsertChargeCatalogItemRequest request)
        => _db.ExecuteAsync("sp_ChargeCatalog_Update", new { Id = id, request.Category, request.ItemName, request.Rate, request.IsActive });

    public Task DeleteAsync(int id) => _db.ExecuteAsync("sp_ChargeCatalog_Delete", new { Id = id });
}
