export class Wallet {
  constructor(data = {}) {
    this.id = data.id || null; // same as User ID
    this.balance = data.balance || 0.00;
    this.createdAt = data.created_at || null;
    this.updatedAt = data.updated_at || null;
  }
}

export class WalletTransaction {
  constructor(data = {}) {
    this.id = data.id || null;
    this.walletId = data.wallet_id || null;
    this.amount = data.amount || 0.00;
    this.type = data.type || 'deposit'; // 'deposit', 'withdrawal', 'ride_payment', 'ride_earnings', 'refund'
    this.description = data.description || '';
    this.createdAt = data.created_at || null;
  }
}
