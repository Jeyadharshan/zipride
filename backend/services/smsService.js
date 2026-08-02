export const SmsService = {
  async sendSms(phoneNumber, message) {
    // In production, you would configure an SMS Gateway provider (e.g. Twilio, MSG91)
    console.log(`[SMS Service Logs] Sending SMS to ${phoneNumber} -> "${message}"`);
    return { success: true, messageId: `msg-${Date.now()}` };
  },

  async sendOtpSms(phoneNumber, otpCode) {
    const msg = `Your ZipRide verification OTP code is: ${otpCode}. It is valid for 5 minutes.`;
    return this.sendSms(phoneNumber, msg);
  }
};
export default SmsService;
