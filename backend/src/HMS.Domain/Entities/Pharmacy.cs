using HMS.Domain.Common;

namespace HMS.Domain.Entities;

/// <summary> Module 10: Pharmacy - Medicine Master. </summary>
public class Medicine : BaseEntity
{
    public string MedicineName { get; set; } = default!;
    public string GenericName { get; set; } = default!;
    public string BatchNumber { get; set; } = default!;
    public DateTime ExpiryDate { get; set; }
    public string Manufacturer { get; set; } = default!;
    public decimal PurchasePrice { get; set; }
    public decimal SellingPrice { get; set; }
    public int Stock { get; set; }
    public int ReorderLevel { get; set; } = 10;
    public int BranchId { get; set; }
}

public class PharmacySale : BaseEntity
{
    public string InvoiceNumber { get; set; } = default!;
    public int PatientId { get; set; }
    public int? PrescriptionId { get; set; }
    public int DispensedByUserId { get; set; }
    public decimal TotalAmount { get; set; }
    public DateTime SaleDate { get; set; } = DateTime.UtcNow;
}

public class PharmacySaleItem
{
    public int Id { get; set; }
    public int PharmacySaleId { get; set; }
    public int MedicineId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
}

/// <summary> Purchase / Sales / Return / Stock Adjustment operations on Medicine.Stock. </summary>
public class MedicineStockTransaction : BaseEntity
{
    public int MedicineId { get; set; }
    public string TransactionType { get; set; } = default!; // Purchase | Sale | Return | Adjustment
    public int Quantity { get; set; }
    public string? Reason { get; set; }
    public int PerformedByUserId { get; set; }
}
