// M-Pesa Transaction Model - MongoDB
const mongoose = require('mongoose');

const mpesaTransactionSchema = new mongoose.Schema(
  {
    checkoutRequestId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    merchantRequestId: String,
    userId: {
      type: String,
      index: true,
    },
    phone: String,
    loanAmount: Number,
    termDays: {
      type: Number,
      default: 60,
    },
    amount: Number,
    accountReference: String,
    status: {
      type: String,
      enum: ['initiated', 'completed', 'failed', 'cancelled', 'expired'],
      default: 'initiated',
      index: true,
    },
    resultCode: String,
    resultDescription: String,
    mpesaReceiptNumber: String,
    callbackData: mongoose.Schema.Types.Mixed,
    loanId: String,
    loanCreatedAt: Date,
    rawRequest: mongoose.Schema.Types.Mixed,
    rawResponse: mongoose.Schema.Types.Mixed,
    lastStatusQueryAt: Date,
    completedAt: Date,
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 5 * 60 * 1000),
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index to auto-delete expired transactions after 30 minutes in terminal state
mpesaTransactionSchema.index(
  { completedAt: 1 },
  {
    expireAfterSeconds: 1800,
    partialFilterExpression: {
      status: { $in: ['completed', 'failed', 'cancelled', 'expired'] },
    },
  }
);

// Register model once
let MpesaTransactionModel = null;

const getModel = () => {
  if (!MpesaTransactionModel) {
    if (mongoose.models.MpesaTransaction) {
      MpesaTransactionModel = mongoose.models.MpesaTransaction;
    } else {
      MpesaTransactionModel = mongoose.model('MpesaTransaction', mpesaTransactionSchema);
    }
  }
  return MpesaTransactionModel;
};

class MpesaTransaction {
  static async create(data) {
    try {
      const model = getModel();
      const transaction = new model(data);
      return await transaction.save();
    } catch (error) {
      console.error('[MpesaTransaction.create] Error:', error.message);
      throw error;
    }
  }

  static async findByCheckoutRequestId(checkoutRequestId) {
    try {
      if (!checkoutRequestId) return null;
      const model = getModel();
      const transaction = await model.findOne({ checkoutRequestId });
      return transaction ? this.expireIfPending(transaction) : null;
    } catch (error) {
      console.error('[MpesaTransaction.findByCheckoutRequestId] Error:', error.message);
      return null;
    }
  }

  static async updateByCheckoutRequestId(checkoutRequestId, patch) {
    try {
      if (!checkoutRequestId) return null;
      const model = getModel();

      const transaction = await model.findOne({ checkoutRequestId });
      if (!transaction) return null;

      if (transaction.status === 'expired') {
        return transaction;
      }

      Object.assign(transaction, patch);
      transaction.updatedAt = new Date();

      if (patch.status && ['completed', 'failed', 'cancelled', 'expired'].includes(patch.status)) {
        transaction.completedAt = new Date();
      }

      return await transaction.save();
    } catch (error) {
      console.error('[MpesaTransaction.updateByCheckoutRequestId] Error:', error.message);
      return null;
    }
  }

  static async findLastByUserId(userId) {
    try {
      if (!userId) return null;
      const model = getModel();
      const transaction = await model.findOne({ userId }).sort({ createdAt: -1 });

      return transaction ? this.expireIfPending(transaction) : null;
    } catch (error) {
      console.error('[MpesaTransaction.findLastByUserId] Error:', error.message);
      return null;
    }
  }

  static async getAllByUserId(userId) {
    try {
      if (!userId) return [];
      const model = getModel();
      return await model.find({ userId }).sort({ createdAt: -1 });
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
      transaction.save().catch(err => console.error('Error saving expired transaction:', err));
    }

    return transaction;
  }

  static async purgeStaleTransactions() {
    try {
      const model = mongoose.model('MpesaTransaction', mpesaTransactionSchema);
      const TERMINAL_RETENTION_MS = 30 * 60 * 1000;
      const cutoffDate = new Date(Date.now() - TERMINAL_RETENTION_MS);

      await model.deleteMany({
        status: { $in: ['completed', 'failed', 'cancelled', 'expired'] },
        completedAt: { $lt: cutoffDate },
      });
    } catch (error) {
      console.error('[MpesaTransaction.purgeStaleTransactions] Error:', error.message);
    }
  }
}

module.exports = MpesaTransaction;
