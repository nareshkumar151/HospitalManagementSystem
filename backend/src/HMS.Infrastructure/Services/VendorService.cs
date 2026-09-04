using HMS.Application.Common.Exceptions;
using HMS.Application.Common.Interfaces;
using HMS.Application.Common.Models;
using HMS.Application.Features.Vendors;

namespace HMS.Infrastructure.Services;

public class VendorService : IVendorService
{
    private readonly ISqlDataAccess _db;

    public VendorService(ISqlDataAccess db) => _db = db;

    public async Task<PagedResult<VendorDto>> GetAllAsync(PagedRequest request)
    {
        var (items, counts) = await _db.QueryMultipleAsync<VendorDto, int>("sp_Vendor_GetAll", new
        {
            request.PageNumber,
            request.PageSize,
            request.Search
        });

        return new PagedResult<VendorDto>
        {
            Items = items,
            TotalCount = counts.FirstOrDefault(),
            PageNumber = request.PageNumber,
            PageSize = request.PageSize
        };
    }

    public async Task<VendorDto> GetByIdAsync(int id)
        => await _db.QuerySingleOrDefaultAsync<VendorDto>("sp_Vendor_GetById", new { Id = id })
           ?? throw new NotFoundException(nameof(Domain.Entities.Vendor), id);

    public async Task<VendorDto> CreateAsync(UpsertVendorRequest request)
    {
        var newId = await _db.QuerySingleAsync<int>("sp_Vendor_Insert", request);
        return await GetByIdAsync(newId);
    }

    public Task UpdateAsync(int id, UpsertVendorRequest request)
        => _db.ExecuteAsync("sp_Vendor_Update", new { Id = id, request.Name, request.GstNumber, request.Contact, request.Address });

    public async Task<PurchaseOrderDto> CreatePurchaseOrderAsync(CreatePurchaseOrderRequest request)
    {
        var poNumber = await _db.ExecuteScalarAsync<string>("sp_PurchaseOrder_NextNumber");
        var total = request.Items.Sum(i => i.Quantity * i.UnitPrice);

        var poId = await _db.QuerySingleAsync<int>("sp_PurchaseOrder_Insert", new { PoNumber = poNumber, request.VendorId, TotalAmount = total });

        foreach (var item in request.Items)
        {
            await _db.ExecuteAsync("sp_PurchaseOrderItem_Insert", new
            {
                PurchaseOrderId = poId,
                item.ItemDescription,
                item.Quantity,
                item.UnitPrice
            });
        }

        var orders = await GetPurchaseOrdersAsync(request.VendorId);
        return orders.First(o => o.Id == poId);
    }

    public Task MarkReceivedAsync(int purchaseOrderId) => _db.ExecuteAsync("sp_PurchaseOrder_MarkReceived", new { Id = purchaseOrderId });

    public Task MarkPaidAsync(int purchaseOrderId) => _db.ExecuteAsync("sp_PurchaseOrder_MarkPaid", new { Id = purchaseOrderId });

    public async Task<IReadOnlyList<PurchaseOrderDto>> GetPurchaseOrdersAsync(int? vendorId = null)
    {
        var (headers, items) = await _db.QueryMultipleAsync<PurchaseOrderHeaderRow, PurchaseOrderItemRow>("sp_PurchaseOrder_GetAll", new { VendorId = vendorId });
        return headers.Select(h => new PurchaseOrderDto(
            h.Id, h.PoNumber, h.VendorId, h.VendorName, h.OrderDate, h.TotalAmount, h.Status, h.PaymentDone,
            items.Where(i => i.PurchaseOrderId == h.Id).Select(i => new PurchaseOrderItemDto(i.ItemDescription, i.Quantity, i.UnitPrice)).ToList()
        )).ToList();
    }

    internal record PurchaseOrderHeaderRow(int Id, string PoNumber, int VendorId, string VendorName, DateTime OrderDate, decimal TotalAmount, string Status, bool PaymentDone);
    internal record PurchaseOrderItemRow(int PurchaseOrderId, string ItemDescription, int Quantity, decimal UnitPrice);
}
