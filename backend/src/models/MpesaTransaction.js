const fs = require('fs');
const path = require('path');

const STORE_DIR = process.env.TALA_EXTRA_MODEL_STORE_DIR || path.resolve(__dirname, '../../data');
const STORE_FILE = path.join(STORE_DIR, 'mpesa-transactions.json');
const PENDING_EXPIRY_MS = 5 * 60 * 1000;
const TERMINAL_RETENTION_MS = 30 * 60 * 1000;

const ensureStore = () => {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  if (!fs.existsSync(STORE_FILE)) {
    fs.writeFileSync(STORE_FILE, JSON.stringify({ transactions: [] }, null, 2));
  }
};

const readStore = () => {
  ensureStore();
  const raw = fs.readFileSync(STORE_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.transactions) ? parsed.transactions : [];
  } catch {
    return [];
  }
};

const writeStore = (transactions) => {
  ensureStore();
  fs.writeFileSync(STORE_FILE, JSON.stringify({ transactions }, null, 2));
};

const transactionList = () => {
  return readStore().map((transaction) => ({
    ...transaction,
    createdAt: transaction.createdAt ? new Date(transaction.createdAt) : new Date(),
    updatedAt: transaction.updatedAt ? new Date(transaction.updatedAt) : new Date(),
    completedAt: transaction.completedAt ? new Date(transaction.completedAt) : null,
    loanCreatedAt: transaction.loanCreatedAt ? new Date(transaction.loanCreatedAt) : null,
    expiresAt: transaction.expiresAt ? new Date(transaction.expiresAt) : new Date(),
  }));
};

class MpesaTransaction {
  constructor(data) {
    this.id = data.id;
    this.checkoutRequestId = data.checkoutRequestId || null;
    this.merchantRequestId = data.merchantRequestId || null;
    this.phone = data.phone || null;
    this.userId = data.userId || null;
    this.loanAmount = data.loanAmount || null;
    this.termDays = data.termDays || 60;
    this.amount = data.amount || null;
    this.accountReference = data.accountReference || null;
    this.status = data.status || 'initiated';
    this.resultCode = data.resultCode || null;
    this.resultDescription = data.resultDescription || null;
    this.mpesaReceiptNumber = data.mpesaReceiptNumber || null;
    this.callbackData = data.callbackData || null;
    this.loanId = data.loanId || null;
    this.loanCreatedAt = data.loanCreatedAt || null;
    this.rawRequest = data.rawRequest || null;
    this.rawResponse = data.rawResponse || null;
    this.lastStatusQueryAt = data.lastStatusQueryAt || null;
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.completedAt = null;
    this.expiresAt = new Date(this.createdAt.getTime() + PENDING_EXPIRY_MS);
  }

  static purgeStaleTransactions() {
    const now = Date.now();
    const transactions = transactionList();
    const activeTransactions = [];

    for (const transaction of transactions) {
      if (!transaction) {
        continue;
      }

      const terminal = ['completed', 'failed', 'cancelled', 'expired'].includes(transaction.status);
      if (terminal) {
        const terminalAt = transaction.completedAt
          ? new Date(transaction.completedAt).getTime()
          : new Date(transaction.updatedAt || transaction.createdAt).getTime();

        if (now - terminalAt > TERMINAL_RETENTION_MS) {
          continue;
        }
      }

      activeTransactions.push(transaction);
    }

    writeStore(activeTransactions);
  }

  static expireIfPending(transaction) {
    if (!transaction) return null;

    if (['completed', 'failed', 'cancelled', 'expired'].includes(transaction.status)) {
      return transaction;
    }

    const createdAtMs = new Date(transaction.createdAt).getTime();
    if (Date.now() - createdAtMs >= PENDING_EXPIRY_MS) {
      transaction.status = 'expired';
      transaction.resultCode = transaction.resultCode || 'TIMEOUT';
      transaction.resultDescription =
        transaction.resultDescription || 'Transaction expired after 5 minutes without confirmation.';
      transaction.updatedAt = new Date();
      transaction.completedAt = new Date();
    }

    return transaction;
  }

  static async create(data) {
    MpesaTransaction.purgeStaleTransactions();

    const transaction = new MpesaTransaction({
      ...data,
      id: `MPESA-${Date.now()}`,
    });

    const transactions = transactionList();
    transactions.push(transaction);
    writeStore(transactions);
    return transaction;
  }

  static async findByCheckoutRequestId(checkoutRequestId) {
    if (!checkoutRequestId) return null;
    MpesaTransaction.purgeStaleTransactions();

    const transaction = transactionList().find((item) => item.checkoutRequestId === checkoutRequestId) || null;
    return transaction ? MpesaTransaction.expireIfPending(transaction) : null;
  }

  static async updateByCheckoutRequestId(checkoutRequestId, patch) {
    MpesaTransaction.purgeStaleTransactions();

    const transactions = transactionList();
    const target = transactions.find((item) => item.checkoutRequestId === checkoutRequestId);
    if (!target) return null;

    if (target.status === 'expired') {
      return target;
    }

    Object.assign(target, patch);
    target.updatedAt = new Date();

    if (patch.status && ['completed', 'failed', 'cancelled', 'expired'].includes(patch.status)) {
      target.completedAt = new Date();
    }

    writeStore(transactions);
    return target;
  }

  static async findLastByUserId(userId) {
    if (!userId) return null;
    MpesaTransaction.purgeStaleTransactions();

    const transactions = transactionList();
    let lastTransaction = null;
    let latestTime = 0;

    for (const transaction of transactions) {
      if (transaction && transaction.userId === userId) {
        const txTime = new Date(transaction.createdAt).getTime();
        if (txTime > latestTime) {
          latestTime = txTime;
          lastTransaction = transaction;
        }
      }
    }

    return lastTransaction ? MpesaTransaction.expireIfPending(lastTransaction) : null;
  }

  static async getAllByUserId(userId) {
    if (!userId) return [];
    MpesaTransaction.purgeStaleTransactions();

    const userTransactions = transactionList().filter((transaction) => transaction && transaction.userId === userId);

    return userTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

module.exports = MpesaTransaction;
