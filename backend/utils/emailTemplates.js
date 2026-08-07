// backend/utils/emailTemplates.js
// Reusable HTML email templates for all transactional emails

export const EmailTemplates = {
  welcome(data) {
    return {
      subject: 'Welcome to ZipRide! 🚗',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#f9f9f9;padding:30px;border-radius:10px">
          <div style="background:#6C63FF;padding:20px;border-radius:8px;text-align:center">
            <h1 style="color:#fff;margin:0">ZipRide</h1>
          </div>
          <div style="padding:30px 0">
            <h2>Welcome, ${data.fullName}! 👋</h2>
            <p>Your account has been created successfully. You can now book rides, track drivers in real time, and pay effortlessly with our secure wallet.</p>
            <p><strong>Username:</strong> ${data.username}</p>
            <a href="${process.env.APP_URL || 'http://localhost:5173'}/login" style="display:inline-block;background:#6C63FF;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin-top:16px">Get Started →</a>
          </div>
          <p style="color:#999;font-size:12px;margin-top:20px">ZipRide Pvt. Ltd. | support@zipride.com</p>
        </div>
      `,
    };
  },

  otp(data) {
    return {
      subject: 'Your ZipRide OTP Code',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px">
          <h2>OTP Verification</h2>
          <p>Use the code below to verify your phone number. This code expires in <strong>5 minutes</strong>.</p>
          <div style="background:#f0f0f0;padding:20px;border-radius:8px;text-align:center;margin:20px 0">
            <span style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#6C63FF">${data.otp}</span>
          </div>
          <p style="color:#999;font-size:12px">Do not share this code with anyone. ZipRide will never ask for your OTP.</p>
        </div>
      `,
    };
  },

  rideBooked(data) {
    return {
      subject: `Ride Booked — ${data.rideId}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px">
          <h2>Your ride has been booked! 🚕</h2>
          <table style="width:100%;border-collapse:collapse;margin-top:16px">
            <tr><td style="padding:8px;background:#f5f5f5"><strong>Pickup</strong></td><td style="padding:8px">${data.pickup}</td></tr>
            <tr><td style="padding:8px;background:#f5f5f5"><strong>Dropoff</strong></td><td style="padding:8px">${data.dropoff}</td></tr>
            <tr><td style="padding:8px;background:#f5f5f5"><strong>Fare</strong></td><td style="padding:8px">₹${data.fare}</td></tr>
            <tr><td style="padding:8px;background:#f5f5f5"><strong>OTP</strong></td><td style="padding:8px;font-size:20px;font-weight:bold;color:#6C63FF">${data.otp}</td></tr>
          </table>
          <p style="margin-top:16px">Share this OTP with the driver when they arrive. Have a safe trip!</p>
        </div>
      `,
    };
  },

  rideCancelled(data) {
    return {
      subject: `Ride Cancelled — ${data.rideId}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px">
          <h2>Your ride has been cancelled.</h2>
          <p>Your ride from <strong>${data.pickup}</strong> to <strong>${data.dropoff}</strong> has been cancelled.</p>
          ${data.refundAmount ? `<p>A refund of <strong>₹${data.refundAmount}</strong> has been credited to your ZipRide wallet.</p>` : ''}
          <p>We apologise for the inconvenience. Please try booking again.</p>
        </div>
      `,
    };
  },

  rideCompleted(data) {
    return {
      subject: `Trip Completed — ₹${data.fare} charged`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px">
          <h2>Trip Completed! 🎉</h2>
          <p>Thank you for riding with ZipRide. Here's your trip summary:</p>
          <table style="width:100%;border-collapse:collapse;margin-top:16px">
            <tr><td style="padding:8px;background:#f5f5f5"><strong>From</strong></td><td style="padding:8px">${data.pickup}</td></tr>
            <tr><td style="padding:8px;background:#f5f5f5"><strong>To</strong></td><td style="padding:8px">${data.dropoff}</td></tr>
            <tr><td style="padding:8px;background:#f5f5f5"><strong>Distance</strong></td><td style="padding:8px">${data.distance} km</td></tr>
            <tr><td style="padding:8px;background:#f5f5f5"><strong>Duration</strong></td><td style="padding:8px">${data.duration} min</td></tr>
            <tr><td style="padding:8px;background:#f5f5f5"><strong>Fare</strong></td><td style="padding:8px"><strong>₹${data.fare}</strong></td></tr>
          </table>
        </div>
      `,
    };
  },

  paymentSuccess(data) {
    return {
      subject: `Payment Successful — ₹${data.amount}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px">
          <h2>Payment Received ✅</h2>
          <p>Your payment of <strong>₹${data.amount}</strong> was processed successfully.</p>
          <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
          <p><strong>Method:</strong> ${data.method}</p>
        </div>
      `,
    };
  },

  withdrawalSuccess(data) {
    return {
      subject: `Withdrawal Processed — ₹${data.amount}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px">
          <h2>Withdrawal Successful 💸</h2>
          <p>₹<strong>${data.amount}</strong> has been transferred to your bank account.</p>
          <p>It typically takes 1–3 business days to reflect in your account.</p>
        </div>
      `,
    };
  },

  driverApproved(data) {
    return {
      subject: 'Your Driver Account Has Been Approved! ✅',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px">
          <h2>Congratulations, ${data.fullName}! 🎉</h2>
          <p>Your ZipRide driver account has been approved. You can now go online and start accepting rides.</p>
          <a href="${process.env.APP_URL || 'http://localhost:5173'}/driver/login" style="display:inline-block;background:#6C63FF;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin-top:16px">Go Online Now →</a>
        </div>
      `,
    };
  },

  driverRejected(data) {
    return {
      subject: 'ZipRide Driver Application — Update Required',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px">
          <h2>Application Update Required</h2>
          <p>Dear ${data.fullName},</p>
          <p>We were unable to approve your driver application at this time. This could be due to incomplete or unclear documents.</p>
          <p><strong>Reason:</strong> ${data.reason || 'Document verification failed.'}</p>
          <p>Please re-submit your documents or contact our support team at support@zipride.com.</p>
        </div>
      `,
    };
  },
};

export default EmailTemplates;
