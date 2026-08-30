using HMS.Domain.Common;
using HMS.Domain.Enums;

namespace HMS.Domain.Entities;

/// <summary> Module 19: Inventory (non-medicine items - equipment/surgical/consumables). </summary>
public class InventoryItem : BaseEntity
{
    public string ItemName { get; set; } = default!;
    public InventoryItemType Type { get; set; }
    public string Unit { get; set; } = default!;
    public int Stock { get; set; }
    public int ReorderLevel { get; set; } = 5;
    public DateTime? ExpiryDate { get; set; }
    public int? VendorId { get; set; }
    public int BranchId { get; set; }
}

public class InventoryTransaction : BaseEntity
{
    public int InventoryItemId { get; set; }
    public StockMovementType MovementType { get; set; }
    public int Quantity { get; set; }
    public string? Reason { get; set; }
    public int PerformedByUserId { get; set; }
}

/// <summary> Module 20: Vendor Management. </summary>
public class Vendor : BaseEntity
{
    public string Name { get; set; } = default!;
    public string GstNumber { get; set; } = default!;
    public string Contact { get; set; } = default!;
    public string? Address { get; set; }
    public bool IsActive { get; set; } = true;
}

public class PurchaseOrder : BaseEntity
{
    public string PoNumber { get; set; } = default!;
    public int VendorId { get; set; }
    public DateTime OrderDate { get; set; } = DateTime.UtcNow;
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = "Pending"; // Pending | Received | Cancelled
    public bool PaymentDone { get; set; }
}

public class PurchaseOrderItem
{
    public int Id { get; set; }
    public int PurchaseOrderId { get; set; }
    public string ItemDescription { get; set; } = default!;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}
