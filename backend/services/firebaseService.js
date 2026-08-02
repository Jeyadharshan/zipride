import { verifyFirebaseOtpToken } from '../config/firebase.js';

export const FirebaseService = {
  async verifyOtpToken(idToken) {
    try {
      const payload = await verifyFirebaseOtpToken(idToken);
      if (!payload || !payload.phone_verified) {
        throw new Error('OTP Token validation failed.');
      }
      return payload;
    } catch (err) {
      console.error('[Firebase Service] Error:', err.message);
      throw err;
    }
  }
};
export default FirebaseService;
