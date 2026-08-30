using HMS.Application.Common.Interfaces;
using HMS.Application.Features.Beds;
using HMS.Domain.Enums;

namespace HMS.Infrastructure.Services;

public class BedService : IBedService
{
    private readonly ISqlDataAccess _db;

    public BedService(ISqlDataAccess db) => _db = db;

    public Task<IReadOnlyList<WardDto>> GetWardsAsync(int branchId)
        => _db.QueryAsync<WardDto>("sp_Ward_GetAll", new { BranchId = branchId });

    public async Task<WardDto> CreateWardAsync(UpsertWardRequest request)
    {
        var newId = await _db.QuerySingleAsync<int>("sp_Ward_Insert", new { request.Name, Type = request.Type.ToString(), request.BranchId });
        var wards = await GetWardsAsync(request.BranchId);
        return wards.First(w => w.Id == newId);
    }

    public Task<IReadOnlyList<RoomDto>> GetRoomsAsync(int? wardId = null)
        => _db.QueryAsync<RoomDto>("sp_Room_GetAll", new { WardId = wardId });

    public async Task<RoomDto> CreateRoomAsync(UpsertRoomRequest request)
    {
        var newId = await _db.QuerySingleAsync<int>("sp_Room_Insert", new { request.WardId, request.RoomNumber, Type = request.Type.ToString(), request.DailyCharge });
        var rooms = await GetRoomsAsync(request.WardId);
        return rooms.First(r => r.Id == newId);
    }

    public Task<IReadOnlyList<BedDto>> GetBedsAsync(BedStatus? status = null, RoomType? roomType = null)
        => _db.QueryAsync<BedDto>("sp_Bed_GetAll", new { Status = status?.ToString(), RoomType = roomType?.ToString() });

    public async Task<BedDto> CreateBedAsync(UpsertBedRequest request)
    {
        var newId = await _db.QuerySingleAsync<int>("sp_Bed_Insert", new { request.RoomId, request.BedNumber, request.IsIcu });
        var beds = await GetBedsAsync();
        return beds.First(b => b.Id == newId);
    }

    public Task<BedOccupancySummaryDto> GetOccupancySummaryAsync(int branchId)
        => _db.QuerySingleAsync<BedOccupancySummaryDto>("sp_Bed_GetOccupancySummary", new { BranchId = branchId });
}
