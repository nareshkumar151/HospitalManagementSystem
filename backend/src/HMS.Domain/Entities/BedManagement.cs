using HMS.Domain.Common;
using HMS.Domain.Enums;

namespace HMS.Domain.Entities;

/// <summary> Module 6: Bed Management. </summary>
public class Ward : BaseEntity
{
    public string Name { get; set; } = default!;
    public RoomType Type { get; set; }
    public int BranchId { get; set; }
}

public class Room : BaseEntity
{
    public int WardId { get; set; }
    public string RoomNumber { get; set; } = default!;
    public RoomType Type { get; set; }
    public decimal DailyCharge { get; set; }
}

public class Bed : BaseEntity
{
    public int RoomId { get; set; }
    public string BedNumber { get; set; } = default!;
    public BedStatus Status { get; set; } = BedStatus.Available;
    public bool IsIcu { get; set; }
}
