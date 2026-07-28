import Razorpay from 'razorpay';
import dotenv from 'dotenv';

dotenv.config();

let hasWarned = false;

export function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    if (!hasWarned) {
      console.warn('[Razorpay Config] ⚠️ RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing. Razorpay payment functionality will be disabled.');
      hasWarned = true;
    }
    return null;
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

export const razorpayConfig = {
  get keyId() {
    return process.env.RAZORPAY_KEY_ID || '';
  },
  get keySecret() {
    return process.env.RAZORPAY_KEY_SECRET || '';
  },
  get webhookSecret() {
    return process.env.RAZORPAY_WEBHOOK_SECRET || '';
  },
};

export default getRazorpay;
