using HMS.Application.Common.Exceptions;
using HMS.Application.Common.Interfaces;
using HMS.Application.Common.Models;
using HMS.Application.Features.Notifications;
using HMS.Application.Features.Pharmacy;
using HMS.Domain.Enums;

namespace HMS.Infrastructure.Services;

public class PharmacyService : IPharmacyService
{
    private readonly ISqlDataAccess _db;
    private readonly IAuditService _auditService;
    private readonly INotificationService _notificationService;

    public PharmacyService(ISqlDataAccess db, IAuditService auditService, INotificationService notificationService)
    {
        _db = db;
        _auditService = auditService;
        _notificationService = notificationService;
    }

    public async Task<PagedResult<MedicineDto>> SearchAsync(PagedRequest request)
    {
        var (items, counts) = await _db.QueryMultipleAsync<MedicineDto, int>("sp_Medicine_Search", new
        {
            request.PageNumber,
            request.PageSize,
            request.Search,
            BranchId = (int?)null
        });

        return new PagedResult<MedicineDto>
        {
            Items = items,
            TotalCount = counts.FirstOrDefault(),
            PageNumber = request.PageNumber,
            PageSize = request.PageSize
        };
    }

    public Task<IReadOnlyList<MedicineDto>> GetLowStockAsync() => _db.QueryAsync<MedicineDto>("sp_Medicine_GetLowStock");

    public Task<IReadOnlyList<MedicineDto>> GetExpiringSoonAsync(int withinDays = 30)
        => _db.QueryAsync<MedicineDto>("sp_Medicine_GetExpiringSoon", new { WithinDays = withinDays });

    public async Task<MedicineDto> CreateAsync(UpsertMedicineRequest request)
    {
        var newId = await _db.QuerySingleAsync<int>("sp_Medicine_Insert", request);
        await _auditService.LogAsync("MedicineCreated", "Medicine", newId.ToString());
        return await GetByIdInternalAsync(newId);
    }

    public async Task UpdateAsync(int id, UpsertMedicineRequest request)
    {
        await _db.ExecuteAsync("sp_Medicine_Update", new
        {
            Id = id,
            request.MedicineName,
            request.GenericName,
            request.BatchNumber,
            request.ExpiryDate,
            request.Manufacturer,
            request.PurchasePrice,
            request.SellingPrice,
            request.ReorderLevel
        });
    }

    public async Task PurchaseAsync(PurchaseMedicineRequest request, int userId)
    {
        await _db.ExecuteAsync("sp_Medicine_Purchase", new { request.MedicineId, request.Quantity, request.UnitCost, UserId = userId });
        await _auditService.LogAsync("MedicinePurchased", "Medicine", request.MedicineId.ToString(), $"Qty={request.Quantity}");
    }

    public async Task AdjustStockAsync(AdjustStockRequest request, int userId)
    {
        await _db.ExecuteAsync("sp_Medicine_AdjustStock", new { request.MedicineId, request.Quantity, request.Reason, UserId = userId });
        await _auditService.LogAsync("MedicineStockAdjusted", "Medicine", request.MedicineId.ToString(), request.Reason);
        await NotifyPharmacistsIfOutOfStockAsync(request.MedicineId);
    }

    public async Task<PharmacySaleDto> DispenseAsync(DispenseSaleRequest request, int pharmacistUserId)
    {
        if (request.Items.Count == 0)
            throw new ValidationAppException("At least one medicine item is required to dispense a sale.");

        var invoiceNumber = await _db.ExecuteScalarAsync<string>("sp_PharmacySale_NextInvoiceNumber");

        // Price each line at the medicine's current selling price and total the sale before persisting the header.
        decimal total = 0;
        var priced = new List<(int MedicineId, int Quantity, decimal UnitPrice)>();
        foreach (var item in request.Items)
        {
            var medicine = await GetByIdInternalAsync(item.MedicineId);
            priced.Add((item.MedicineId, item.Quantity, medicine.SellingPrice));
            total += item.Quantity * medicine.SellingPrice;
        }

        var saleId = await _db.QuerySingleAsync<int>("sp_PharmacySale_Insert", new
        {
            InvoiceNumber = invoiceNumber,
            request.PatientId,
            request.PrescriptionId,
            DispensedByUserId = pharmacistUserId,
            TotalAmount = total
        });

        foreach (var (medicineId, quantity, unitPrice) in priced)
        {
            await _db.ExecuteAsync("sp_PharmacySale_DispenseItem", new
            {
                PharmacySaleId = saleId,
                MedicineId = medicineId,
                Quantity = quantity,
                UnitPrice = unitPrice,
                UserId = pharmacistUserId
            });
            await NotifyPharmacistsIfOutOfStockAsync(medicineId);
        }

        if (request.PrescriptionId.HasValue)
            await _db.ExecuteAsync("sp_Prescription_UpdateStatus", new { Id = request.PrescriptionId.Value, Status = "Dispensed" });

        await _auditService.LogAsync("PharmacySaleDispensed", "PharmacySale", saleId.ToString(), invoiceNumber);
        return await GetSaleByIdAsync(saleId);
    }

    public async Task ReturnAsync(ReturnSaleItemRequest request, int userId)
    {
        await _db.ExecuteAsync("sp_PharmacySale_Return", new { request.SaleId, request.MedicineId, request.Quantity, UserId = userId });
        await _auditService.LogAsync("PharmacySaleReturned", "PharmacySale", request.SaleId.ToString());
    }

    public async Task<PharmacySaleDto> GetSaleByIdAsync(int id)
    {
        var (headers, items) = await _db.QueryMultipleAsync<SaleHeaderRow, PharmacySaleItemDto>("sp_PharmacySale_GetById", new { Id = id });
        var header = headers.FirstOrDefault() ?? throw new NotFoundException("PharmacySale", id);
        return new PharmacySaleDto(header.Id, header.InvoiceNumber, header.PatientId, header.PatientName, header.TotalAmount, header.SaleDate, items.ToList());
    }

    private async Task<MedicineDto> GetByIdInternalAsync(int id)
        => await _db.QuerySingleOrDefaultAsync<MedicineDto>("sp_Medicine_GetById", new { Id = id })
           ?? throw new NotFoundException(nameof(Domain.Entities.Medicine), id);

    /// <summary> Fans an in-app alert out to every pharmacist AND administrator at this medicine's branch the
    /// moment a sale or stock adjustment drains it to zero. Best-effort: a notification failure must never
    /// break dispensing or stock adjustment, so failures here are swallowed rather than surfaced to the caller. </summary>
    private async Task NotifyPharmacistsIfOutOfStockAsync(int medicineId)
    {
        try
        {
            var medicine = await GetByIdInternalAsync(medicineId);
            if (medicine.Stock > 0) return;

            var pharmacistUserIds = await _db.QueryAsync<int>("sp_User_GetIdsByRole", new { RoleName = "Pharmacist", medicine.BranchId });
            var adminUserIds = await _db.QueryAsync<int>("sp_User_GetIdsByRole", new { RoleName = "Administrator", medicine.BranchId });
            var message = $"Out of stock: {medicine.MedicineName} (Batch {medicine.BatchNumber}). Please reorder.";

            foreach (var userId in pharmacistUserIds.Concat(adminUserIds))
            {
                await _notificationService.QueueAsync(new SendNotificationRequest(
                    userId, null, NotificationChannel.Push, NotificationCategory.Medicine, message));
            }
        }
        catch
        {
            // Notification delivery is a courtesy, not part of the dispense/adjustment contract.
        }
    }

    internal record SaleHeaderRow(int Id, string InvoiceNumber, int PatientId, string PatientName, decimal TotalAmount, DateTime SaleDate);
}
