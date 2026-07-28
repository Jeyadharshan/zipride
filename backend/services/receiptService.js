import db from '../config/db.js';

export const ReceiptService = {
  async getRideReceipt(rideId) {
    const [[ride]] = await db.execute(
      `SELECT r.*,
              rp.full_name AS rider_name, rp.email AS rider_email, rp.phone AS rider_phone,
              dp.full_name AS driver_name, dp.phone AS driver_phone,
              wt.amount AS wallet_paid, wt.payment_id AS wallet_txn_id,
              rt.amount AS tip_amount
       FROM rides r
       LEFT JOIN profiles rp ON r.rider_id = rp.id
       LEFT JOIN profiles dp ON r.driver_id = dp.id
       LEFT JOIN wallet_transactions wt ON r.id = wt.ride_id AND wt.type = 'Debit'
       LEFT JOIN ride_tips rt ON r.id = rt.ride_id
       WHERE r.id = ?
       LIMIT 1`,
      [rideId]
    );

    if (!ride) {
      throw new Error('Ride receipt not found for ID: ' + rideId);
    }

    const fareAmt = Number(ride.fare || ride.final_fare || ride.estimated_fare || 0);
    const tipAmt = Number(ride.tip_amount || 0);
    const gstAmt = Number((fareAmt * 0.05).toFixed(2));
    const grandTotal = Number((fareAmt + gstAmt + tipAmt).toFixed(2));

    const receipt = {
      receipt_id: `ZR-REC-${String(ride.id).slice(0, 8)}`,
      ride_id: ride.id,
      date: ride.created_at || ride.booking_time || new Date(),
      rider_name: ride.rider_name || 'Valued Rider',
      rider_phone: ride.rider_phone || 'N/A',
      driver_name: ride.driver_name || 'ZipRide Partner Driver',
      driver_phone: ride.driver_phone || 'N/A',
      pickup_address: ride.pickup_address || 'Pickup Point',
      dropoff_address: ride.dropoff_address || 'Destination',
      distance_km: ride.distance || 0,
      duration_mins: ride.duration || 0,
      fare: fareAmt,
      gst_5_percent: gstAmt,
      tip_amount: tipAmt,
      grand_total: grandTotal,
      payment_method: ride.payment_method || 'Wallet',
      payment_status: ride.payment_status || 'Paid',
      transaction_id: ride.wallet_txn_id || ride.razorpay_payment_id || `TXN-ZIP-${ride.id}`
    };

    return receipt;
  },

  generateReceiptHtml(receipt) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>ZipRide Official Receipt - ${receipt.receipt_id}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; color: #0f172a; line-height: 1.5; }
          .logo { font-size: 28px; font-weight: 800; color: #0284c7; }
          .badge { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
          .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
          .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #f1f5f9; font-size: 14px; }
          .total { display: flex; justify-content: space-between; padding: 16px 0; font-size: 20px; font-weight: 800; border-top: 2px solid #0f172a; margin-top: 16px; color: #0284c7; }
          .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">⚡ ZipRide</div>
            <div style="font-size: 12px; color: #64748b; font-weight: 600; margin-top: 4px;">Verified Tax Invoice & Receipt</div>
          </div>
          <div class="badge">Paid ✓</div>
        </div>

        <div class="row"><span>Receipt ID:</span> <strong>${receipt.receipt_id}</strong></div>
        <div class="row"><span>Ride ID:</span> <strong>#${receipt.ride_id}</strong></div>
        <div class="row"><span>Date & Time:</span> <span>${new Date(receipt.date).toLocaleString()}</span></div>
        <div class="row"><span>Rider:</span> <span>${receipt.rider_name} (${receipt.rider_phone})</span></div>
        <div class="row"><span>Driver:</span> <span>${receipt.driver_name} (${receipt.driver_phone})</span></div>
        <div class="row"><span>Pickup:</span> <span>${receipt.pickup_address}</span></div>
        <div class="row"><span>Dropoff:</span> <span>${receipt.dropoff_address}</span></div>
        <div class="row"><span>Distance & Duration:</span> <span>${receipt.distance_km} km (${receipt.duration_mins} mins)</span></div>
        <div class="row"><span>Payment Method:</span> <strong>${receipt.payment_method}</strong></div>
        <div class="row"><span>Transaction ID:</span> <span style="font-family: monospace;">${receipt.transaction_id}</span></div>

        <div style="margin-top: 24px; font-weight: 700; font-size: 14px; text-transform: uppercase; color: #64748b;">Itemized Charges</div>
        <div class="row"><span>Base Fare:</span> <span>₹${receipt.fare.toFixed(2)}</span></div>
        <div class="row"><span>GST (5%):</span> <span>₹${receipt.gst_5_percent.toFixed(2)}</span></div>
        <div class="row"><span>Driver Tip:</span> <span>₹${receipt.tip_amount.toFixed(2)}</span></div>
        
        <div class="total">
          <span>Total Amount Paid:</span>
          <span>₹${receipt.grand_total.toFixed(2)}</span>
        </div>

        <div class="footer">
          <p>Thank you for riding with ZipRide!</p>
          <p>This is a computer-generated tax receipt. No signature required.</p>
        </div>
      </body>
      </html>
    `;
  }
};

export default ReceiptService;
