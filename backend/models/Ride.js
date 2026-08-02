export class Ride {
  constructor(data = {}) {
    this.id = data.id || null;
    this.riderId = data.rider_id || null;
    this.driverId = data.driver_id || null;
    this.pickupAddress = data.pickup_address || '';
    this.pickupLatitude = data.pickup_latitude || null;
    this.pickupLongitude = data.pickup_longitude || null;
    this.dropoffAddress = data.dropoff_address || '';
    this.dropoffLatitude = data.dropoff_latitude || null;
    this.dropoffLongitude = data.dropoff_longitude || null;
    this.fare = data.fare || 0.00;
    this.distance = data.distance || 0.00;
    this.duration = data.duration || 0;
    this.status = data.status || 'searching'; // 'searching', 'accepted', 'arriving', 'in_progress', 'completed', 'cancelled'
    this.otp = data.otp || null;
    this.paymentMethod = data.payment_method || 'cash'; // 'cash', 'wallet', 'razorpay'
    this.paymentStatus = data.payment_status || 'pending'; // 'pending', 'completed', 'refunded'
    this.createdAt = data.created_at || null;
    this.completedAt = data.completed_at || null;
  }
}
export default Ride;
