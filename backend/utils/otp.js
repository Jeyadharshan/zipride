export const generateOtp = (length = 4) => {
  if (length === 4) {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const verifyOtpCode = (submittedCode, actualCode) => {
  if (!actualCode) return false;
  return submittedCode.toString() === actualCode.toString();
};
