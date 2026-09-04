using HMS.Application.Common.Exceptions;
using HMS.Application.Common.Interfaces;
using HMS.Application.Common.Models;
using HMS.Application.Features.Billing;
using HMS.Domain.Enums;
using HMS.Infrastructure.Payments;

namespace HMS.Infrastructure.Services;

public class BillingService : IBillingService
{
    private readonly ISqlDataAccess _db;
    private readonly IAuditService _auditService;
    private readonly IRazorpayGateway _razorpayGateway;

    public BillingService(ISqlDataAccess db, IAuditService auditService, IRazorpayGateway razorpayGateway)
    {
        _db = db;
        _auditService = auditService;
        _razorpayGateway = razorpayGateway;
    }

    public async Task<BillDto> CreateBillAsync(CreateBillRequest request, int userId)
    {
        if (request.Items.Count == 0)
            throw new ValidationAppException("A bill must contain at least one line item.");

        var subTotal = request.Items.Sum(i => i.Quantity * i.UnitPrice);
        var gstAmount = Math.Round(subTotal * request.GstPercent / 100m, 2);
        var totalAmount = subTotal + gstAmount - request.DiscountAmount;
        var billNumber = await _db.ExecuteScalarAsync<string>("sp_Bill_NextNumber");

        var billId = await _db.QuerySingleAsync<int>("sp_Bill_Insert", new
        {
            BillNumber = billNumber,
            request.PatientId,
            request.OpdVisitId,
            request.IpdAdmissionId,
            Type = request.Type.ToString(),
            SubTotal = subTotal,
            GstAmount = gstAmount,
            request.DiscountAmount,
            TotalAmount = totalAmount,
            GeneratedByUserId = userId,
            request.BranchId
        });

        foreach (var item in request.Items)
        {
            await _db.ExecuteAsync("sp_BillItem_Insert", new
            {
                BillId = billId,
                item.Description,
                item.Quantity,
                item.UnitPrice,
                LineTotal = item.Quantity * item.UnitPrice
            });
        }

        await _auditService.LogAsync("BillGenerated", "Bill", billId.ToString(), billNumber);
        return await GetByIdAsync(billId);
    }

    public async Task<BillDto> GetByIdAsync(int id)
    {
        var (headers, items) = await _db.QueryMultipleAsync<BillHeaderRow, BillItemDto>("sp_Bill_GetById", new { Id = id });
        var header = headers.FirstOrDefault() ?? throw new NotFoundException(nameof(Domain.Entities.Bill), id);
        return Map(header, items);
    }

    public async Task<PagedResult<BillDto>> SearchAsync(PagedRequest request, int branchId, BillStatus? status = null, BillCategory? category = null)
    {
        var (headers, counts) = await _db.QueryMultipleAsync<BillHeaderRow, int>("sp_Bill_Search", new
        {
            BranchId = branchId,
            request.PageNumber,
            request.PageSize,
            Status = status?.ToString(),
            Category = category?.ToString()
        });

        return new PagedResult<BillDto>
        {
            Items = headers.Select(h => Map(h, Array.Empty<BillItemDto>())).ToList(),
            TotalCount = counts.FirstOrDefault(),
            PageNumber = request.PageNumber,
            PageSize = request.PageSize
        };
    }

    public async Task<IReadOnlyList<BillDto>> GetByPatientAsync(int patientId, int? branchId = null)
    {
        var headers = await _db.QueryAsync<BillHeaderRow>("sp_Bill_GetByPatient", new { PatientId = patientId, BranchId = branchId });
        return headers.Select(h => Map(h, Array.Empty<BillItemDto>())).ToList();
    }

    public async Task<PaymentDto> CollectPaymentAsync(CollectPaymentRequest request, int userId)
    {
        var bill = await GetByIdAsync(request.BillId);
        var remaining = bill.TotalAmount - bill.PaidAmount;
        if (request.Amount <= 0 || request.Amount > remaining + 0.01m)
            throw new ValidationAppException($"Payment amount must be between 0 and the remaining balance of {remaining:C}.");

        var paymentId = await _db.QuerySingleAsync<int>("sp_Payment_Collect", new
        {
            request.BillId,
            request.Amount,
            Mode = request.Mode.ToString(),
            request.TransactionReference,
            IsRefund = false,
            ReceivedByUserId = userId
        });

        await _auditService.LogAsync("PaymentCollected", "Bill", request.BillId.ToString(), $"Amount={request.Amount}");
        return new PaymentDto(paymentId, request.BillId, request.Amount, request.Mode, request.TransactionReference, false, DateTime.UtcNow);
    }

    public async Task<PaymentDto> RefundAsync(RefundPaymentRequest request, int userId)
    {
        var paymentId = await _db.QuerySingleAsync<int>("sp_Payment_Collect", new
        {
            request.BillId,
            request.Amount,
            Mode = PaymentMode.Cash.ToString(),
            TransactionReference = (string?)null,
            IsRefund = true,
            ReceivedByUserId = userId
        });

        await _auditService.LogAsync("PaymentRefunded", "Bill", request.BillId.ToString(), request.Reason);
        return new PaymentDto(paymentId, request.BillId, request.Amount, PaymentMode.Cash, null, true, DateTime.UtcNow);
    }

    public async Task<IReadOnlyList<BillDto>> GetPendingBillsAsync(int branchId, BillCategory? category = null)
    {
        var headers = await _db.QueryAsync<BillHeaderRow>("sp_Bill_GetPending", new { BranchId = branchId, Category = category?.ToString() });
        return headers.Select(h => Map(h, Array.Empty<BillItemDto>())).ToList();
    }

    public async Task<RazorpayOrderResponseDto> CreateRazorpayOrderAsync(int billId)
    {
        var bill = await GetByIdAsync(billId);
        var remaining = bill.TotalAmount - bill.PaidAmount;
        if (remaining <= 0)
            throw new ValidationAppException("This bill has no outstanding balance to pay online.");

        var order = await _razorpayGateway.CreateOrderAsync(remaining, receipt: bill.BillNumber);
        await _db.ExecuteAsync("sp_RazorpayOrder_Insert", new { BillId = billId, RazorpayOrderId = order.Id, AmountInPaise = order.Amount });

        return new RazorpayOrderResponseDto(order.Id, order.Amount, order.Currency, _razorpayGateway.PublicKeyId, billId);
    }

    public async Task<PaymentDto> VerifyAndCollectRazorpayPaymentAsync(VerifyRazorpayPaymentRequest request, int userId)
    {
        var order = await _db.QuerySingleOrDefaultAsync<RazorpayOrderRow>("sp_RazorpayOrder_GetByOrderId", new { request.RazorpayOrderId })
            ?? throw new ValidationAppException("Unknown Razorpay order - it may have expired or was never created by this system.");

        if (order.BillId != request.BillId)
            throw new ValidationAppException("This Razorpay order does not belong to the specified bill.");

        // Idempotent: a Checkout success handler firing twice (page refresh, network retry) returns the
        // already-recorded payment instead of erroring or double-crediting the bill.
        if (order.Status == "Paid")
        {
            var existing = await _db.QuerySingleOrDefaultAsync<PaymentRow>("sp_Payment_GetByTransactionReference", new { TransactionReference = request.RazorpayPaymentId });
            if (existing is not null)
                return new PaymentDto(existing.Id, existing.BillId, existing.Amount, Enum.Parse<PaymentMode>(existing.Mode), existing.TransactionReference, existing.IsRefund, existing.PaidAt);
        }

        if (!_razorpayGateway.VerifySignature(request.RazorpayOrderId, request.RazorpayPaymentId, request.RazorpaySignature))
            throw new ValidationAppException("Payment signature verification failed - this payment could not be confirmed as genuine.");

        var amount = order.AmountInPaise / 100m;

        var paymentId = await _db.QuerySingleAsync<int>("sp_Payment_Collect", new
        {
            request.BillId,
            Amount = amount,
            Mode = PaymentMode.Card.ToString(),
            TransactionReference = request.RazorpayPaymentId,
            IsRefund = false,
            ReceivedByUserId = userId
        });

        await _db.ExecuteAsync("sp_RazorpayOrder_MarkPaid", new { request.RazorpayOrderId, request.RazorpayPaymentId });
        await _auditService.LogAsync("RazorpayPaymentCollected", "Bill", request.BillId.ToString(), $"Amount={amount};PaymentId={request.RazorpayPaymentId}");

        return new PaymentDto(paymentId, request.BillId, amount, PaymentMode.Card, request.RazorpayPaymentId, false, DateTime.UtcNow);
    }

    private static BillDto Map(BillHeaderRow h, IEnumerable<BillItemDto> items) =>
        new(h.Id, h.BillNumber, h.PatientId, h.PatientName, Enum.Parse<BillType>(h.Type),
            h.IpdAdmissionId is not null ? BillCategory.IPD : BillCategory.OPD, h.OpdVisitId, h.IpdAdmissionId,
            h.SubTotal, h.GstAmount, h.DiscountAmount, h.TotalAmount, h.PaidAmount, Enum.Parse<BillStatus>(h.Status), h.BillDate, items.ToList(), h.BranchId);

    internal record BillHeaderRow(
        int Id, string BillNumber, int PatientId, string PatientName, string Type, int? OpdVisitId, int? IpdAdmissionId,
        decimal SubTotal, decimal GstAmount, decimal DiscountAmount, decimal TotalAmount, decimal PaidAmount, string Status, DateTime BillDate, int BranchId);

    internal record RazorpayOrderRow(int Id, int BillId, string RazorpayOrderId, string? RazorpayPaymentId, int AmountInPaise, string Status, DateTime CreatedAt, DateTime? PaidAt);

    internal record PaymentRow(int Id, int BillId, decimal Amount, string Mode, string? TransactionReference, bool IsRefund, DateTime PaidAt);
}
