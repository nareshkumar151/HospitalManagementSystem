using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Serialization;
using HMS.Application.Common.Exceptions;
using Microsoft.Extensions.Options;

namespace HMS.Infrastructure.Payments;

public record RazorpayOrder(string Id, int Amount, string Currency);

/// <summary>
/// Thin wrapper over Razorpay's Orders API (https://razorpay.com/docs/api/orders/) - deliberately not a
/// third-party SDK dependency, since the two calls we need (create order, verify signature) are a handful
/// of lines each. Card/UPI/NetBanking are all handled by Razorpay's own Checkout widget on the frontend;
/// this class never sees card details - only the order id and, after payment, the signed confirmation.
/// </summary>
public interface IRazorpayGateway
{
    string PublicKeyId { get; }
    Task<RazorpayOrder> CreateOrderAsync(decimal amountInRupees, string receipt);
    bool VerifySignature(string orderId, string paymentId, string signature);
}

public class RazorpayGateway : IRazorpayGateway
{
    private readonly HttpClient _httpClient;
    private readonly RazorpaySettings _settings;

    public RazorpayGateway(HttpClient httpClient, IOptions<RazorpaySettings> settings)
    {
        _settings = settings.Value;
        httpClient.BaseAddress = new Uri("https://api.razorpay.com/v1/");
        var basicAuth = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_settings.KeyId}:{_settings.KeySecret}"));
        httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", basicAuth);
        _httpClient = httpClient;
    }

    public string PublicKeyId => _settings.KeyId;

    public async Task<RazorpayOrder> CreateOrderAsync(decimal amountInRupees, string receipt)
    {
        // Razorpay amounts are always the smallest currency unit - paise, not rupees.
        var amountInPaise = (int)Math.Round(amountInRupees * 100m, MidpointRounding.AwayFromZero);

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.PostAsJsonAsync("orders", new
            {
                amount = amountInPaise,
                currency = "INR",
                receipt,
                payment_capture = 1
            });
        }
        catch (HttpRequestException ex)
        {
            throw new ValidationAppException($"Could not reach the Razorpay payment gateway right now. Please use Cash instead, or try again shortly. ({ex.Message})");
        }

        if (!response.IsSuccessStatusCode)
        {
            // 401 here almost always means the KeyId/KeySecret in appsettings.json are still placeholders.
            throw new ValidationAppException(
                response.StatusCode == System.Net.HttpStatusCode.Unauthorized
                    ? "Online payment is not configured yet (Razorpay credentials missing or invalid). Please use Cash instead."
                    : "The payment gateway rejected this request. Please use Cash instead, or try again shortly.");
        }

        var body = await response.Content.ReadFromJsonAsync<RazorpayOrderResponse>()
            ?? throw new ValidationAppException("Razorpay returned an unexpected empty response. Please try again.");

        return new RazorpayOrder(body.Id, body.Amount, body.Currency);
    }

    /// <summary> HMAC-SHA256("{orderId}|{paymentId}", keySecret) must equal the signature Razorpay's Checkout returned to the client. </summary>
    public bool VerifySignature(string orderId, string paymentId, string signature)
    {
        var payload = $"{orderId}|{paymentId}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_settings.KeySecret));
        var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        var computedSignature = Convert.ToHexString(computedHash).ToLowerInvariant();
        return CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(computedSignature), Encoding.UTF8.GetBytes(signature.ToLowerInvariant()));
    }

    private record RazorpayOrderResponse(
        [property: JsonPropertyName("id")] string Id,
        [property: JsonPropertyName("amount")] int Amount,
        [property: JsonPropertyName("currency")] string Currency);
}
