// backend/config/sms.js
import dotenv from 'dotenv';
dotenv.config();

export const smsConfig = {
  provider: process.env.SMS_PROVIDER || 'console', // 'twilio' | 'msg91' | 'console'
  // Twilio
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER || '',
  // MSG91
  msg91AuthKey: process.env.MSG91_AUTH_KEY || '',
  msg91SenderId: process.env.MSG91_SENDER_ID || 'ZIPRDE',
};

if (smsConfig.provider === 'console') {
  console.warn('[SMS Config] ⚠️  SMS_PROVIDER not configured. SMS messages will be logged to console only.');
}

export default smsConfig;
