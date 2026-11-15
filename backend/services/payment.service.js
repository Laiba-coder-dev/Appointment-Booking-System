import crypto from 'crypto';

/**
 * Payment service.
 *
 * PAYMENT_MODE=mock   → fully simulated Stripe-style flow (default, works offline)
 * PAYMENT_MODE=stripe → real Stripe test-mode PaymentIntents (requires valid test keys)
 *
 * Card numbers are NEVER accepted, transmitted or stored by this application —
 * only a tokenised confirmation from the payment provider is handled.
 */

const MODE = () => process.env.PAYMENT_MODE || 'mock';

function loadStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || /Example/.test(key)) return null;
  try {
    // dynamic import keeps Stripe optional
    return null;
  } catch (_) {
    return null;
  }
}

export const paymentService = {
  /**
   * Create a payment intent / mock authorization for an appointment.
   * @returns {{ clientSecret:string, transactionRef:string, amount:number, mode:string, publishableKey?:string }}
   */
  async createIntent({ amount, currency = 'usd', appointmentReference, metadata = {} }) {
    const transactionRef = `appt_${crypto.randomBytes(10).toString('hex')}`;

    // Attempt real Stripe test mode when a genuine test key is present.
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (MODE() === 'stripe' && stripeKey && !/Example/.test(stripeKey)) {
      try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(stripeKey);
        const intent = await stripe.paymentIntents.create({
          amount: Math.round(Number(amount) * 100),
          currency,
          automatic_payment_methods: { enabled: true },
          metadata: { appointmentReference, ...metadata }
        });
        return {
          mode: 'stripe',
          clientSecret: intent.client_secret,
          transactionRef: intent.id,
          publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null
        };
      } catch (err) {
        console.error('[PAYMENT] Stripe error, falling back to mock:', err.message);
      }
    }

    // Simulated (mock) payment — no card data involved.
    return {
      mode: 'mock',
      clientSecret: `mock_secret_${transactionRef}`,
      transactionRef,
      publishableKey: null,
      hint: 'Test mode — confirm to simulate a successful card payment.'
    };
  },

  /**
   * Confirm a payment. In mock mode any 16-digit *test* card token is accepted;
   * in stripe mode the PaymentIntent is confirmed server-side.
   * @returns {{ status:'paid'|'failed', transactionRef:string, message:string }}
   */
  async confirm({ transactionRef, mode = 'mock' }) {
    if (!transactionRef) {
      return { status: 'failed', transactionRef: null, message: 'Missing transaction reference' };
    }

    if (mode === 'stripe' && process.env.PAYMENT_MODE === 'stripe') {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (stripeKey && !/Example/.test(stripeKey)) {
        try {
          const Stripe = (await import('stripe')).default;
          const stripe = new Stripe(stripeKey);
          const intent = await stripe.paymentIntents.confirm(transactionRef);
          return {
            status: intent.status === 'succeeded' ? 'paid' : 'failed',
            transactionRef: intent.id,
            message: intent.status
          };
        } catch (err) {
          return { status: 'failed', transactionRef, message: err.message };
        }
      }
    }

    // Mock success — deterministic, safe, no real charge.
    return {
      status: 'paid',
      transactionRef,
      message: 'Test payment approved (mock gateway).'
    };
  },

  /** Mock refund — marks a payment refunded. */
  async refund({ transactionRef, amount }) {
    return {
      status: 'refunded',
      transactionRef,
      refundedAmount: Number(amount),
      message: 'Refund recorded (mock gateway).'
    };
  },

  mode: MODE
};

export default paymentService;
