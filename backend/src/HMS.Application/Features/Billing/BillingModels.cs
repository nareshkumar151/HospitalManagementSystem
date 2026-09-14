using HMS.Application.Common.Models;
using HMS.Domain.Enums;

namespace HMS.Application.Features.Billing;

/// <summary> Section: RoomTariff | Consultation | Investigation | GeneralService | Others - which printed
/// section of the provisional bill this line belongs to (null prints under "Others" - see PdfService).
/// ItemDate: the date this specific charge was incurred - null falls back to the bill's own BillDate when
/// printed, since one bill can carry charges dated across several days of a stay. </summary>
public record BillItemDto(string Description, int Quantity, decimal UnitPrice, decimal LineTotal, string? Section, DateTime? ItemDate);

public record BillDto(
    int Id, string BillNumber, int PatientId, string PatientName, BillType Type, BillCategory Category,
    int? OpdVisitId, int? IpdAdmissionId,
    decimal SubTotal, decimal GstAmount, decimal DiscountAmount, decimal TotalAmount,
    decimal PaidAmount, BillStatus Status, DateTime BillDate, IReadOnlyList<BillItemDto> Items, int BranchId);

public record BillItemRequest(string Description, int Quantity, decimal UnitPrice, string? Section = null, DateTime? ItemDate = null);

public record CreateBillRequest(
    int PatientId, int? OpdVisitId, int? IpdAdmissionId, BillType Type,
    IReadOnlyList<BillItemRequest> Items, decimal DiscountAmount, decimal GstPercent, int BranchId);

/// <summary> Edit Bill - only the charges (line items, discount, GST) can change; patient, category, and
/// bill type are fixed once generated. Refused (see UpdateBillAsync) once any payment has been collected. </summary>
public record UpdateBillRequest(IReadOnlyList<BillItemRequest> Items, decimal DiscountAmount, decimal GstPercent);

public record CollectPaymentRequest(int BillId, decimal Amount, PaymentMode Mode, string? TransactionReference);
public record RefundPaymentRequest(int BillId, decimal Amount, string Reason);

public record PaymentDto(int Id, int BillId, decimal Amount, PaymentMode Mode, string? TransactionReference, bool IsRefund, DateTime PaidAt);

/// <summary> One row of the Billing section's Payment History - every payment/refund ever collected,
/// independent of the underlying bill's own date (see sp_Payment_GetHistory). </summary>
public record PaymentHistoryDto(
    int Id, int BillId, string BillNumber, int PatientId, string PatientName, string Uhid,
    decimal Amount, PaymentMode Mode, string? TransactionReference, bool IsRefund, DateTime PaidAt, string ReceivedByName);

public record BillReceiptPaymentDto(string ReceiptNumber, DateTime PaidAt, decimal Amount, PaymentMode Mode, bool IsRefund);

/// <summary> Everything the printable "Provisional Bill" needs beyond BillDto - patient/doctor/admission
/// header details and the branch's own letterhead info, plus the receipt/payment history. Fetched only for
/// the PDF/print view (see sp_Bill_GetReceiptDetails), not the day-to-day billing list screens. </summary>
public record BillReceiptDto(
    BillDto Bill, string PatientUhid, int? PatientAge, string PatientGender, bool HasInsurance,
    string? DoctorName, string? AdmissionNumber, DateTime? AdmissionDate,
    string GeneratedByName, string BranchName, string BranchAddress, string BranchContactNumber,
    IReadOnlyList<BillReceiptPaymentDto> Payments);

/// <summary> Handed to the frontend so it can open Razorpay's Checkout widget - never includes the key secret. </summary>
public record RazorpayOrderResponseDto(string RazorpayOrderId, int AmountInPaise, string Currency, string RazorpayKeyId, int BillId);

/// <summary> What Razorpay Checkout's success callback returns to the client - forwarded here for server-side signature verification. </summary>
public record VerifyRazorpayPaymentRequest(int BillId, string RazorpayOrderId, string RazorpayPaymentId, string RazorpaySignature);

public interface IBillingService
{
    Task<BillDto> CreateBillAsync(CreateBillRequest request, int userId);
    /// <summary> Edit Bill - refuses (ValidationAppException) once the bill has collected any payment, so an
    /// already-reconciled amount can never silently disagree with the charges backing it. </summary>
    Task<BillDto> UpdateBillAsync(int id, UpdateBillRequest request);
    Task<BillDto> GetByIdAsync(int id);
    /// <summary> For the printable Provisional Bill only - see BillReceiptDto. </summary>
    Task<BillReceiptDto> GetReceiptDetailsAsync(int id);
    Task<PagedResult<BillDto>> SearchAsync(PagedRequest request, int branchId, BillStatus? status = null, BillCategory? category = null);
    /// <summary> Pass `branchId` to scope to one branch's bills for this patient (front-desk/staff use);
    /// pass null for every bill this patient has ever been issued, across every branch (their own view). </summary>
    Task<IReadOnlyList<BillDto>> GetByPatientAsync(int patientId, int? branchId = null);
    /// <summary> Cash (or any manually-recorded mode) payment collection - no gateway involved. </summary>
    Task<PaymentDto> CollectPaymentAsync(CollectPaymentRequest request, int userId);
    Task<PaymentDto> RefundAsync(RefundPaymentRequest request, int userId);
    Task<IReadOnlyList<BillDto>> GetPendingBillsAsync(int branchId, BillCategory? category = null);

    /// <summary> Step 1 of online payment: creates a Razorpay order for the bill's outstanding balance. </summary>
    Task<RazorpayOrderResponseDto> CreateRazorpayOrderAsync(int billId);
    /// <summary> Step 2: verifies Razorpay's signature server-side, then records the payment exactly like a manual collection. </summary>
    Task<PaymentDto> VerifyAndCollectRazorpayPaymentAsync(VerifyRazorpayPaymentRequest request, int userId);

    /// <summary> Billing section's Payment History - every payment/refund collected in this branch, keyed
    /// off the payment's own date (not the bill's), optionally narrowed to a date range, OPD/IPD category
    /// (via the underlying bill), and/or search text (patient name, UHID, or bill number). </summary>
    Task<PagedResult<PaymentHistoryDto>> GetPaymentHistoryAsync(int branchId, PagedRequest request, DateTime? fromDate = null, DateTime? toDate = null, BillCategory? category = null);
}
