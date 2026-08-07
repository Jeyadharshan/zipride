import Razorpay from 'razorpay';
import dotenv from 'dotenv';
dotenv.config();

let razorpay = null;

try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log('✅ Razorpay Initialized');
  } else {
    console.warn('[Razorpay Config] ⚠️  RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set — Razorpay features disabled.');
  }
} catch (err) {
  console.error('[Razorpay Config] ❌ Failed to initialize Razorpay:', err.message);
  razorpay = null;
}

export { razorpay };

export const razorpayConfig = {
  keyId: process.env.RAZORPAY_KEY_ID || '',
  keySecret: process.env.RAZORPAY_KEY_SECRET || '',
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
};

export default razorpay;
