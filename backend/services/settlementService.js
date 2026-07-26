import { SettlementRepository } from '../repositories/settlementRepository.js';
import { WalletRepository } from '../repositories/walletRepository.js';
import { NotificationService } from './notificationService.js';
import { sendToUser, broadcastToAdmins } from '../socket/socket.js';
import db from '../config/db.js';

export const SettlementService = {
  async getDriverSettlementSummary(profileId) {
    const driverWallet = await WalletRepository.getDriverWallet(profileId);
    const history = await SettlementRepository.getDriverSettlements(profileId);

    const pendingBalance = Number(driverWallet?.pending_settlement || 0);
    const settledTotal = history
      .filter((h) => h.status === 'Approved' || h.status === 'Settled')
      .reduce((sum, h) => sum + Number(h.amount || 0), 0);

    return {
      wallet_balance: Number(driverWallet?.wallet_balance || 0),
      total_earnings: Number(driverWallet?.total_earnings || 0),
      pending_balance: pendingBalance,
      settled_balance: settledTotal,
      settlement_history: history
    };
  },

  async requestSettlement(profileId, { amount, paymentMethod = 'Bank Transfer', bankDetails = '', notes = '' }) {
    const [[driverRow]] = await db.execute(
      `SELECT id FROM driver_profiles WHERE profile_id = ? LIMIT 1`,
      [profileId]
    );
    const driverId = driverRow?.id || 0;

    const requestAmt = Number(amount);
    if (!requestAmt || requestAmt <= 0) {
      throw new Error('Please enter a valid settlement amount greater than 0.');
    }

    const insertId = await SettlementRepository.createRequest({
      driverId,
      profileId,
      amount: requestAmt,
      paymentMethod,
      bankDetails,
      notes
    });

    // Broadcast to Admin and emit driver wallet event
    broadcastToAdmins('driver-settlement-requested', {
      settlementId: insertId,
      profileId,
      driverId,
      amount: requestAmt
    });

    sendToUser(profileId, 'driver-wallet-updated', {
      message: 'Settlement request submitted successfully.'
    });

    await NotificationService.sendPushNotification(
      profileId,
      'Settlement Requested ✓',
      `Your payout request for ₹${requestAmt} has been submitted for admin review.`
    );

    return { success: true, settlementId: insertId, amount: requestAmt };
  },

  async getAllSettlements(filters) {
    return SettlementRepository.getAllSettlements(filters);
  },

  async approveSettlement(settlementId, notes = 'Approved by Admin') {
    const updated = await SettlementRepository.updateStatus(settlementId, 'Approved', notes);
    if (updated?.profile_id) {
      sendToUser(updated.profile_id, 'driver-wallet-updated', {
        settlementId,
        status: 'Approved',
        amount: updated.amount
      });
      await NotificationService.sendPushNotification(
        updated.profile_id,
        'Payout Approved & Settled ✓',
        `Your settlement request #${settlementId} for ₹${updated.amount} has been approved and transferred!`
      );
    }
    return { success: true, settlement: updated };
  },

  async rejectSettlement(settlementId, reason = 'Rejected by Admin') {
    const updated = await SettlementRepository.updateStatus(settlementId, 'Rejected', reason);
    if (updated?.profile_id) {
      sendToUser(updated.profile_id, 'driver-wallet-updated', {
        settlementId,
        status: 'Rejected',
        amount: updated.amount
      });
      await NotificationService.sendPushNotification(
        updated.profile_id,
        'Settlement Request Declined',
        `Your settlement request #${settlementId} was declined: ${reason}`
      );
    }
    return { success: true, settlement: updated };
  }
};

export default SettlementService;
