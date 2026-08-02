import { NotificationService } from './notificationService.js';
import { SmsService } from './smsService.js';

class BackgroundQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  // Push new task to queue
  enqueue(taskFn, description = 'Background Job') {
    this.queue.push({ taskFn, description, enqueuedAt: new Date() });
    console.log(`[Queue Service] Enqueued job: "${description}". Current size: ${this.queue.length}`);
    this.processNext();
  }

  // Sequentially process tasks
  async processNext() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    const { taskFn, description } = this.queue.shift();
    try {
      console.log(`[Queue Service] Starting background job: "${description}"`);
      await taskFn();
      console.log(`[Queue Service] Finished job: "${description}" successfully.`);
    } catch (err) {
      console.error(`[Queue Service] Error in job: "${description}":`, err.message);
    } finally {
      this.isProcessing = false;
      this.processNext();
    }
  }
}

const backgroundQueue = new BackgroundQueue();

export const QueueService = {
  // Asynchronous notification dispatcher
  pushNotification(userId, title, body) {
    backgroundQueue.enqueue(
      () => NotificationService.sendPushNotification(userId, title, body),
      `Push notification to user: ${userId}`
    );
  },

  // Asynchronous SMS OTP sender
  pushOtpSms(phone, code) {
    backgroundQueue.enqueue(
      () => SmsService.sendOtpSms(phone, code),
      `SMS OTP dispatch to phone: ${phone}`
    );
  },

  // Asynchronous generic background process
  runBackgroundJob(jobFn, description) {
    backgroundQueue.enqueue(jobFn, description);
  }
};
export default QueueService;
