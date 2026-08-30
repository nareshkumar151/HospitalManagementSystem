using HMS.Application.Features.Beds;
using HMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

[Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Receptionist + "," + RoleNames.Nurse + "," + RoleNames.Doctor)]
public class BedsController : ApiControllerBase
{
    private readonly IBedService _bedService;

    public BedsController(IBedService bedService) => _bedService = bedService;

    [HttpGet("wards")]
    public async Task<ActionResult<IReadOnlyList<WardDto>>> GetWards([FromQuery] int branchId) => Ok(await _bedService.GetWardsAsync(branchId));

    [HttpPost("wards")]
    [Authorize(Roles = RoleNames.AdminOnly)]
    public async Task<ActionResult<WardDto>> CreateWard(UpsertWardRequest request) => Ok(await _bedService.CreateWardAsync(request));

    [HttpGet("rooms")]
    public async Task<ActionResult<IReadOnlyList<RoomDto>>> GetRooms([FromQuery] int? wardId) => Ok(await _bedService.GetRoomsAsync(wardId));

    [HttpPost("rooms")]
    [Authorize(Roles = RoleNames.AdminOnly)]
    public async Task<ActionResult<RoomDto>> CreateRoom(UpsertRoomRequest request) => Ok(await _bedService.CreateRoomAsync(request));

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<BedDto>>> GetBeds([FromQuery] BedStatus? status, [FromQuery] RoomType? roomType)
        => Ok(await _bedService.GetBedsAsync(status, roomType));

    [HttpPost]
    [Authorize(Roles = RoleNames.AdminOnly)]
    public async Task<ActionResult<BedDto>> CreateBed(UpsertBedRequest request) => Ok(await _bedService.CreateBedAsync(request));

    [HttpGet("occupancy-summary")]
    public async Task<ActionResult<BedOccupancySummaryDto>> GetOccupancySummary([FromQuery] int branchId)
        => Ok(await _bedService.GetOccupancySummaryAsync(branchId));
}
