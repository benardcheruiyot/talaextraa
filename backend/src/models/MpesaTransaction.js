// M-Pesa Transaction Model - File-Based JSON Storage
const fs = require('fs');
const path = require('path');

const STORE_DIR = process.env.TALA_EXTRA_MODEL_STORE_DIR || path.resolve(__dirname, '../../data');
const STORE_FILE = path.join(STORE_DIR, 'payment-transactions.json');

const ensureStore = () => {
  try {
    fs.mkdirSync(STORE_DIR, { recursive: true });
    if (!fs.existsSync(STORE_FILE)) {
      fs.writeFileSync(STORE_FILE, JSON.stringify({ transactions: [] }, null, 2));
    }
  } catch (error) {
    console.error('[MpesaTransaction] Error ensuring store:', error.message);
  }
};

const readStore = () => {
  try {
    ensureStore();
    const raw = fs.readFileSync(STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.transactions) ? parsed.transactions : [];
  } catch (error) {
    console.error('[MpesaTransaction] Error reading store:', error.message);
    return [];
  }
};

const writeStore = (transactions) => {
  try {
    ensureStore();
    fs.writeFileSync(STORE_FILE, JSON.stringify({ transactions }, null, 2));
  } catch (error) {
    console.error('[MpesaTransaction] Error writing store:', error.message);
  }
};

const transactionsFromStore = () => {
  return readStore().map((txn) => ({
    ...txn,
    createdAt: txn.createdAt ? new Date(txn.createdAt) : new Date(),
    updatedAt: txn.updatedAt ? new Date(txn.updatedAt) : new Date(),
    completedAt: txn.completedAt ? new Date(txn.completedAt) : null,
    expiresAt: txn.expiresAt ? new Date(txn.expiresAt) : null,
  }));
};

const persistTransactions = (txnList) => {
  writeStore(
    txnList.map((txn) => ({
      ...txn,
      createdAt: txn.createdAt instanceof Date ? txn.createdAt.toISOString() : txn.createdAt,
      updatedAt: txn.updatedAt instanceof Date ? txn.updatedAt.toISOString() : txn.updatedAt,
      completedAt: txn.completedAt instanceof Date ? txn.completedAt.toISOString() : txn.completedAt,
      expiresAt: txn.expiresAt instanceof Date ? txn.expiresAt.toISOString() : txn.expiresAt,
    }))
  );
};

class MpesaTransaction {
  constructor(data) {
    this.id = data.id;
    this.checkoutRequestId = data.checkoutRequestId;
    this.merchantRequestId = data.merchantRequestId;
    this.userId = data.userId;
    this.phone = data.phone;
    this.loanAmount = data.loanAmount;
    this.termDays = data.termDays || 60;
    this.amount = data.amount;
    this.accountReference = data.accountReference;
    this.status = data.status || 'initiated';
    this.resultCode = data.resultCode || null;
    this.resultDescription = data.resultDescription || null;
    this.mpesaReceiptNumber = data.mpesaReceiptNumber || null;
    this.callbackData = data.callbackData || null;
    this.loanId = data.loanId || null;
    this.rawRequest = data.rawRequest || null;
    this.rawResponse = data.rawResponse || null;
    this.lastStatusQueryAt = data.lastStatusQueryAt || null;
    this.completedAt = null;
    this.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  static async create(data) {
    try {
      const txnList = transactionsFromStore();
      const transaction = new MpesaTransaction({
        ...data,
        id: `TXN-${Date.now()}`,
      });
      txnList.push(transaction);
      persistTransactions(txnList);
      console.log(`[MpesaTransaction] Created transaction ${transaction.checkoutRequestId}`);
      return transaction;
    } catch (error) {
      console.error('[MpesaTransaction.create] Error:', error.message);
      throw error;
    }
  }

  static async findByCheckoutRequestId(checkoutRequestId) {
    try {
      if (!checkoutRequestId) return null;
      const txnList = transactionsFromStore();
      const transaction = txnList.find((t) => t.checkoutRequestId === checkoutRequestId);
      return transaction ? this.expireIfPending(transaction) : null;
    } catch (error) {
      console.error('[MpesaTransaction.findByCheckoutRequestId] Error:', error.message);
      return null;
    }
  }

  static async updateByCheckoutRequestId(checkoutRequestId, patch) {
    try {
      if (!checkoutRequestId) return null;
      const txnList = transactionsFromStore();
      const transaction = txnList.find((t) => t.checkoutRequestId === checkoutRequestId);

      if (!transaction) return null;

      if (transaction.status === 'expired') {
        return transaction;
      }

      Object.assign(transaction, patch);
      transaction.updatedAt = new Date();

      if (patch.status && ['completed', 'failed', 'cancelled', 'expired'].includes(patch.status)) {
        transaction.completedAt = new Date();
      }

      persistTransactions(txnList);
      return transaction;
    } catch (error) {
      console.error('[MpesaTransaction.updateByCheckoutRequestId] Error:', error.message);
      return null;
    }
  }

  static async findLastByUserId(userId) {
    try {
      if (!userId) return null;
      const txnList = transactionsFromStore();
      const transaction = txnList
        .filter((t) => t.userId === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

      return transaction ? this.expireIfPending(transaction) : null;
    } catch (error) {
      console.error('[MpesaTransaction.findLastByUserId] Error:', error.message);
      return null;
    }
  }

  static async getAllByUserId(userId) {
    try {
      if (!userId) return [];
      const txnList = transactionsFromStore();
      return txnList
        .filter((t) => t.userId === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      console.error('[MpesaTransaction.getAllByUserId] Error:', error.message);
      return [];
    }
  }

  static expireIfPending(transaction) {
    if (!transaction) return null;

    if (['completed', 'failed', 'cancelled', 'expired'].includes(transaction.status)) {
      return transaction;
    }

    const PENDING_EXPIRY_MS = 5 * 60 * 1000;
    const createdAtMs = new Date(transaction.createdAt).getTime();

    if (Date.now() - createdAtMs >= PENDING_EXPIRY_MS) {
      transaction.status = 'expired';
      transaction.resultCode = transaction.resultCode || 'TIMEOUT';
      transaction.resultDescription =
        transaction.resultDescription || 'Transaction expired after 5 minutes without confirmation.';
      transaction.completedAt = new Date();
      this.updateByCheckoutRequestId(transaction.checkoutRequestId, {
        status: 'expired',
        resultCode: transaction.resultCode,
        resultDescription: transaction.resultDescription,
      }).catch((err) => console.error('[MpesaTransaction] Error saving expired transaction:', err.message));
    }

    return transaction;
  }

  static async purgeStaleTransactions() {
    try {
      const txnList = transactionsFromStore();
      const TERMINAL_RETENTION_MS = 30 * 60 * 1000;
      const cutoffDate = new Date(Date.now() - TERMINAL_RETENTION_MS);

      const filtered = txnList.filter((txn) => {
        if (['completed', 'failed', 'cancelled', 'expired'].includes(txn.status)) {
          const completedAt = new Date(txn.completedAt);
          return completedAt > cutoffDate;
        }
        return true;
      });

      persistTransactions(filtered);
      console.log(`[MpesaTransaction] Purged stale transactions`);
    } catch (error) {
      console.error('[MpesaTransaction.purgeStaleTransactions] Error:', error.message);
    }
  }
}

module.exports = MpesaTransaction;
