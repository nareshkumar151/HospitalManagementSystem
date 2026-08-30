using HMS.Domain.Enums;

namespace HMS.Application.Features.Beds;

public record WardDto(int Id, string Name, RoomType Type, int BranchId);
public record UpsertWardRequest(string Name, RoomType Type, int BranchId);

public record RoomDto(int Id, int WardId, string RoomNumber, RoomType Type, decimal DailyCharge);
public record UpsertRoomRequest(int WardId, string RoomNumber, RoomType Type, decimal DailyCharge);

public record BedDto(int Id, int RoomId, string RoomNumber, RoomType RoomType, string BedNumber, BedStatus Status, bool IsIcu);
public record UpsertBedRequest(int RoomId, string BedNumber, bool IsIcu);

public record BedOccupancySummaryDto(int TotalBeds, int OccupiedBeds, int AvailableBeds, int IcuBeds, int IcuOccupied);

public interface IBedService
{
    Task<IReadOnlyList<WardDto>> GetWardsAsync(int branchId);
    Task<WardDto> CreateWardAsync(UpsertWardRequest request);

    Task<IReadOnlyList<RoomDto>> GetRoomsAsync(int? wardId = null);
    Task<RoomDto> CreateRoomAsync(UpsertRoomRequest request);

    Task<IReadOnlyList<BedDto>> GetBedsAsync(BedStatus? status = null, RoomType? roomType = null);
    Task<BedDto> CreateBedAsync(UpsertBedRequest request);
    Task<BedOccupancySummaryDto> GetOccupancySummaryAsync(int branchId);
}
