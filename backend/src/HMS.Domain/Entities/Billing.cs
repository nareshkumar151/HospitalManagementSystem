using HMS.Domain.Common;
using HMS.Domain.Enums;

namespace HMS.Domain.Entities;

/// <summary> Module 11: Billing. </summary>
public class Bill : BaseEntity
{
    public string BillNumber { get; set; } = default!;
    public int PatientId { get; set; }
    public int? OpdVisitId { get; set; }
    public int? IpdAdmissionId { get; set; }
    public BillType Type { get; set; }
    public decimal SubTotal { get; set; }
    public decimal GstAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public BillStatus Status { get; set; } = BillStatus.Pending;
    public int GeneratedByUserId { get; set; }
    public DateTime BillDate { get; set; } = DateTime.UtcNow;
    public int BranchId { get; set; }
}

public class BillItem
{
    public int Id { get; set; }
    public int BillId { get; set; }
    public string Description { get; set; } = default!;
    public int Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
}

public class Payment : BaseEntity
{
    public int BillId { get; set; }
    public decimal Amount { get; set; }
    public PaymentMode Mode { get; set; }
    public string? TransactionReference { get; set; }
    public bool IsRefund { get; set; }
    public DateTime PaidAt { get; set; } = DateTime.UtcNow;
    public int ReceivedByUserId { get; set; }
}
