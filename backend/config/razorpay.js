import Razorpay from 'razorpay';
import dotenv from 'dotenv';
dotenv.config();

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const razorpayConfig = {
  keyId: process.env.RAZORPAY_KEY_ID || '',
  keySecret: process.env.RAZORPAY_KEY_SECRET || '',
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
};

if (!razorpayConfig.keyId || !razorpayConfig.keySecret) {
  console.warn('[Razorpay Config] ⚠️  RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set in environment.');
}

export default razorpay;
