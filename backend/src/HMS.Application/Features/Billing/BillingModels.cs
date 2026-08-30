using HMS.Application.Common.Models;
using HMS.Domain.Enums;

namespace HMS.Application.Features.Billing;

public record BillItemDto(string Description, int Quantity, decimal UnitPrice, decimal LineTotal);

public record BillDto(
    int Id, string BillNumber, int PatientId, string PatientName, BillType Type,
    decimal SubTotal, decimal GstAmount, decimal DiscountAmount, decimal TotalAmount,
    decimal PaidAmount, BillStatus Status, DateTime BillDate, IReadOnlyList<BillItemDto> Items);

public record BillItemRequest(string Description, int Quantity, decimal UnitPrice);

public record CreateBillRequest(
    int PatientId, int? OpdVisitId, int? IpdAdmissionId, BillType Type,
    IReadOnlyList<BillItemRequest> Items, decimal DiscountAmount, decimal GstPercent, int BranchId);

public record CollectPaymentRequest(int BillId, decimal Amount, PaymentMode Mode, string? TransactionReference);
public record RefundPaymentRequest(int BillId, decimal Amount, string Reason);

public record PaymentDto(int Id, int BillId, decimal Amount, PaymentMode Mode, string? TransactionReference, bool IsRefund, DateTime PaidAt);

/// <summary> Handed to the frontend so it can open Razorpay's Checkout widget - never includes the key secret. </summary>
public record RazorpayOrderResponseDto(string RazorpayOrderId, int AmountInPaise, string Currency, string RazorpayKeyId, int BillId);

/// <summary> What Razorpay Checkout's success callback returns to the client - forwarded here for server-side signature verification. </summary>
public record VerifyRazorpayPaymentRequest(int BillId, string RazorpayOrderId, string RazorpayPaymentId, string RazorpaySignature);

public interface IBillingService
{
    Task<BillDto> CreateBillAsync(CreateBillRequest request, int userId);
    Task<BillDto> GetByIdAsync(int id);
    Task<PagedResult<BillDto>> SearchAsync(PagedRequest request, BillStatus? status = null);
    Task<IReadOnlyList<BillDto>> GetByPatientAsync(int patientId);
    /// <summary> Cash (or any manually-recorded mode) payment collection - no gateway involved. </summary>
    Task<PaymentDto> CollectPaymentAsync(CollectPaymentRequest request, int userId);
    Task<PaymentDto> RefundAsync(RefundPaymentRequest request, int userId);
    Task<IReadOnlyList<BillDto>> GetPendingBillsAsync();

    /// <summary> Step 1 of online payment: creates a Razorpay order for the bill's outstanding balance. </summary>
    Task<RazorpayOrderResponseDto> CreateRazorpayOrderAsync(int billId);
    /// <summary> Step 2: verifies Razorpay's signature server-side, then records the payment exactly like a manual collection. </summary>
    Task<PaymentDto> VerifyAndCollectRazorpayPaymentAsync(VerifyRazorpayPaymentRequest request, int userId);
}
