export class Payment {
  constructor(data = {}) {
    this.id = data.id || null;
    this.rideId = data.ride_id || null;
    this.amount = data.amount || 0.00;
    this.status = data.status || 'pending'; // 'pending', 'completed', 'failed', 'refunded'
    this.paymentMethod = data.payment_method || 'cash';
    this.transactionReference = data.transaction_reference || '';
    this.createdAt = data.created_at || null;
    this.updatedAt = data.updated_at || null;
  }
}
export default Payment;
