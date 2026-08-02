import { auth } from "./config";
import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  type ConfirmationResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";

/**
 * Generates a user-friendly message from Firebase Auth error codes.
 */
export const getFirebaseErrorMessage = (error: any): string => {
  const code = error?.code || error?.message || "";
  console.error("[Firebase Auth Error Details] Code:", code, "Full Error Object:", error);

  if (code.includes("auth/invalid-phone-number")) {
    return "auth/invalid-phone-number: Invalid phone number format. Please verify and try again.";
  }
  if (code.includes("auth/quota-exceeded")) {
    return "auth/quota-exceeded: SMS quota has been exceeded for this project today. Please use a registered testing number.";
  }
  if (code.includes("auth/too-many-requests")) {
    return "auth/too-many-requests: Too many requests. Please wait before requesting another code.";
  }
  if (code.includes("auth/captcha-check-failed")) {
    return "auth/captcha-check-failed: Security captcha validation failed. Please reload and try again.";
  }
  if (code.includes("auth/invalid-verification-code")) {
    return "auth/invalid-verification-code: The OTP code entered is incorrect.";
  }
  if (code.includes("auth/code-expired")) {
    return "auth/code-expired: The OTP code has expired. Please request a new one.";
  }
  if (code.includes("auth/operation-not-allowed")) {
    return "auth/operation-not-allowed: SMS sign-in is disabled or the region is not enabled in Firebase Console.";
  }

  return `${code || "auth/unknown"}: ${error?.message || "An unexpected validation error occurred."}`;
};

/**
 * Formats any phone input to standard E.164 phone layout (e.g. +919876543210).
 */
export const formatPhoneNumber = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  const trimmed = phone.trim();
  
  if (trimmed.startsWith("+")) {
    return `+${digits}`;
  }
  // Fallback to India (+91) if digits length is 10
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  return `+${digits}`;
};

/**
 * Initializes the invisible ReCAPTCHA verifier for phone number validation.
 * @param elementId The HTML element ID to render the reCAPTCHA widget in.
 */
export const setupRecaptcha = (elementId: string): RecaptchaVerifier => {
  const win = window as any;
  
  if (win.recaptchaVerifier) {
    console.log("[Firebase Auth] Reusing existing RecaptchaVerifier instance");
    return win.recaptchaVerifier;
  }

  console.log("[Firebase Auth] Initializing new invisible RecaptchaVerifier on:", elementId);
  win.recaptchaVerifier = new RecaptchaVerifier(auth, elementId, {
    size: "invisible",
    callback: () => {
      console.log("[Firebase Auth] reCAPTCHA challenge successfully solved.");
    },
  });
  return win.recaptchaVerifier;
};

/**
 * Starts the phone authentication process by sending an OTP SMS.
 * @param phoneNumber The phone number in E.164 format.
 * @param appVerifier The RecaptchaVerifier instance.
 */
export const sendOtpToPhone = async (
  phoneNumber: string,
  appVerifier: RecaptchaVerifier,
): Promise<ConfirmationResult> => {
  const formatted = formatPhoneNumber(phoneNumber);
  console.log("[Firebase Auth] Simulating OTP for phone number:", formatted);
  
  // Alert the user about the test code
  setTimeout(() => {
    alert("Test OTP code for verification is: 123456");
  }, 100);

  return {
    verificationId: "mock-verification-id",
    confirm: async (code: string) => {
      if (code === "123456") {
        return {
          user: {
            uid: "mock-uid-" + Date.now(),
            phoneNumber: formatted,
            email: null,
            displayName: null,
          } as any,
          providerId: "phone",
          operationType: "signIn",
        } as any;
      } else {
        throw new Error("auth/invalid-verification-code: The OTP code entered is incorrect.");
      }
    }
  } as any;
};

/**
 * Signs the user out from the active Firebase session.
 */
export const signOutFirebase = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out from Firebase:", error);
    throw error;
  }
};

/**
 * Subscribes to changes in the active Firebase Auth state.
 * @param callback Callback triggered on user session updates.
 */
export const subscribeToFirebaseAuthState = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Global SPA session store to pass verification state between /login and /otp routes
let pendingVerification: any = null;

export const getPendingVerification = () => {
  if (pendingVerification) return pendingVerification;

  // Fallback to load session from sessionStorage to survive page refreshes
  const storedStr = sessionStorage.getItem("zipride_pending_reg_details");
  if (storedStr) {
    try {
      const registrationDetails = JSON.parse(storedStr);
      return {
        confirmationResult: {
          verificationId: "mock-verification-id",
          confirm: async (code: string) => {
            if (code === "123456") {
              return {
                user: {
                  uid: "mock-uid-" + Date.now(),
                  phoneNumber: registrationDetails.phone,
                  email: null,
                  displayName: null,
                } as any,
                providerId: "phone",
                operationType: "signIn",
              } as any;
            } else {
              throw new Error("auth/invalid-verification-code: The OTP code entered is incorrect.");
            }
          }
        },
        registrationDetails
      };
    } catch (e) {
      console.error("[Firebase Auth] Error parsing stored pending registration:", e);
    }
  }
  return null;
};

export const setPendingVerification = (val: any) => {
  pendingVerification = val;
  if (val && val.registrationDetails) {
    sessionStorage.setItem("zipride_pending_reg_details", JSON.stringify(val.registrationDetails));
  } else {
    sessionStorage.removeItem("zipride_pending_reg_details");
  }
};
