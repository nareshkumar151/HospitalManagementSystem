// Minimal typings for the bits of Razorpay's Checkout widget this app actually uses.
interface RazorpaySuccessResponse {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

interface RazorpayCheckoutOptions {
  key: string
  amount: number
  currency: string
  name: string
  image?: string
  description?: string
  order_id: string
  prefill?: { name?: string; email?: string; contact?: string }
  theme?: { color?: string }
  handler: (response: RazorpaySuccessResponse) => void
  modal?: { ondismiss?: () => void }
}

interface RazorpayCheckoutInstance {
  open: () => void
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance
  }
}

let scriptLoadPromise: Promise<void> | null = null

/** Loads https://checkout.razorpay.com/v1/checkout.js exactly once, however many times this is called. */
function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve()
  scriptLoadPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load the Razorpay Checkout script - check your internet connection.'))
    document.body.appendChild(script)
  })
  return scriptLoadPromise
}

/**
 * Opens Razorpay's hosted Checkout widget for a previously-created order. Resolves with the signed
 * success payload once the user completes payment; rejects if they close the widget or the script fails
 * to load. The caller is responsible for sending the payload to /billing/razorpay/verify - this function
 * never talks to our backend, only to Razorpay's own widget.
 */
export async function openRazorpayCheckout(options: {
  keyId: string
  amountInPaise: number
  currency: string
  orderId: string
  patientName?: string
  patientEmail?: string
  patientPhone?: string
}): Promise<RazorpaySuccessResponse> {
  await loadRazorpayScript()

  return new Promise((resolve, reject) => {
    if (!window.Razorpay) {
      reject(new Error('Razorpay Checkout failed to initialize.'))
      return
    }

    const checkout = new window.Razorpay({
      key: options.keyId,
      amount: options.amountInPaise,
      currency: options.currency,
      name: 'Effisys Group',
      image: `${window.location.origin}/logo-icon.png`,
      description: 'Hospital bill payment',
      order_id: options.orderId,
      prefill: { name: options.patientName, email: options.patientEmail, contact: options.patientPhone },
      theme: { color: '#16a08a' },
      handler: (response) => resolve(response),
      modal: { ondismiss: () => reject(new Error('Payment window closed before completing payment.')) },
    })

    checkout.open()
  })
}
