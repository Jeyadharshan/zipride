export class Vehicle {
  constructor(data = {}) {
    this.id = data.id || null;
    this.driverId = data.driver_id || null;
    this.make = data.make || '';
    this.model = data.model || '';
    this.year = data.year || null;
    this.color = data.color || '';
    this.licensePlate = data.license_plate || '';
    this.vehicleType = data.vehicle_type || 'Economy'; // 'Economy', 'Sedan', 'SUV', 'Taxi'
    this.isActive = data.is_active !== undefined ? data.is_active : 1;
    this.createdAt = data.created_at || null;
  }
}
export default Vehicle;
