using HMS.Application.Common.Interfaces;
using HMS.Application.Common.Models;
using HMS.Application.Features.Billing;
using HMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

public class BillingController : ApiControllerBase
{
    private readonly IBillingService _billingService;
    private readonly IPdfService _pdfService;

    public BillingController(IBillingService billingService, IPdfService pdfService)
    {
        _billingService = billingService;
        _pdfService = pdfService;
    }

    [HttpPost]
    [Authorize(Roles = RoleNames.FrontDesk)]
    public async Task<ActionResult<BillDto>> Create(CreateBillRequest request)
    {
        // BranchId is always the caller's own branch, server-derived; SuperAdmin (no single branch of
        // their own) is the only case that falls back to the client-supplied value.
        var created = await _billingService.CreateBillAsync(request with { BranchId = CurrentBranchIdOrNull ?? request.BranchId }, CurrentUserId);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<BillDto>> GetById(int id)
    {
        var bill = await _billingService.GetByIdAsync(id);
        if (User.IsInRole(RoleNames.Patient))
        {
            if (CurrentLinkedProfileId != bill.PatientId) return Forbid();
        }
        else if (CurrentBranchIdOrNull is { } branchId && bill.BranchId != branchId)
        {
            return Forbid();
        }
        return Ok(bill);
    }

    [HttpGet]
    [Authorize(Roles = RoleNames.FrontDesk)]
    public async Task<ActionResult<PagedResult<BillDto>>> Search([FromQuery] PagedRequest request, [FromQuery] BillStatus? status, [FromQuery] BillCategory? category)
        => Ok(await _billingService.SearchAsync(request, CurrentBranchId, status, category));

    [HttpGet("patient/{patientId:int}")]
    public async Task<ActionResult<IReadOnlyList<BillDto>>> GetByPatient(int patientId)
    {
        if (User.IsInRole(RoleNames.Patient))
        {
            if (CurrentLinkedProfileId != patientId) return Forbid();
            return Ok(await _billingService.GetByPatientAsync(patientId));
        }
        return Ok(await _billingService.GetByPatientAsync(patientId, CurrentBranchId));
    }

    [HttpGet("pending")]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Receptionist)]
    public async Task<ActionResult<IReadOnlyList<BillDto>>> GetPending([FromQuery] BillCategory? category) => Ok(await _billingService.GetPendingBillsAsync(CurrentBranchId, category));

    /// <summary> Manually-recorded payment - Cash, or Card/UPI/Insurance settled outside the online gateway. </summary>
    [HttpPost("payments")]
    [Authorize(Roles = RoleNames.FrontDesk)]
    public async Task<ActionResult<PaymentDto>> CollectPayment(CollectPaymentRequest request)
        => Ok(await _billingService.CollectPaymentAsync(request, CurrentUserId));

    [HttpPost("payments/refund")]
    [Authorize(Roles = RoleNames.AdminOnly)]
    public async Task<ActionResult<PaymentDto>> Refund(RefundPaymentRequest request)
        => Ok(await _billingService.RefundAsync(request, CurrentUserId));

    // ---------- Razorpay online payment (Card/UPI/NetBanking via Razorpay Checkout) ----------

    [HttpPost("{id:int}/razorpay/create-order")]
    [Authorize(Roles = RoleNames.FrontDesk + "," + RoleNames.Patient)]
    public async Task<ActionResult<RazorpayOrderResponseDto>> CreateRazorpayOrder(int id)
    {
        if (User.IsInRole(RoleNames.Patient))
        {
            var bill = await _billingService.GetByIdAsync(id);
            if (CurrentLinkedProfileId != bill.PatientId) return Forbid();
        }
        return Ok(await _billingService.CreateRazorpayOrderAsync(id));
    }

    [HttpPost("razorpay/verify")]
    [Authorize(Roles = RoleNames.FrontDesk + "," + RoleNames.Patient)]
    public async Task<ActionResult<PaymentDto>> VerifyRazorpayPayment(VerifyRazorpayPaymentRequest request)
    {
        if (User.IsInRole(RoleNames.Patient))
        {
            var bill = await _billingService.GetByIdAsync(request.BillId);
            if (CurrentLinkedProfileId != bill.PatientId) return Forbid();
        }
        return Ok(await _billingService.VerifyAndCollectRazorpayPaymentAsync(request, CurrentUserId));
    }

    // ---------- PDF ----------

    [HttpGet("{id:int}/pdf")]
    public async Task<IActionResult> DownloadReceipt(int id)
    {
        var bill = await _billingService.GetByIdAsync(id);
        if (User.IsInRole(RoleNames.Patient) && CurrentLinkedProfileId != bill.PatientId) return Forbid();

        var pdfBytes = _pdfService.GenerateBillReceiptPdf(bill);
        return File(pdfBytes, "application/pdf", $"Receipt-{bill.BillNumber}.pdf");
    }
}
