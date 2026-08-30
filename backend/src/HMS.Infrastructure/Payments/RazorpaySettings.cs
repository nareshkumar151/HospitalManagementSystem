namespace HMS.Infrastructure.Payments;

/// <summary>
/// Bound from appsettings.json "Razorpay" section. Get real test-mode keys from
/// https://dashboard.razorpay.com/app/keys - the placeholders here will authenticate-fail loudly rather
/// than silently pretending to work, so a misconfigured deployment is obvious immediately.
/// </summary>
public class RazorpaySettings
{
    public string KeyId { get; set; } = default!;
    public string KeySecret { get; set; } = default!;
}
