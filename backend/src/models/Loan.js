// Loan Model - MongoDB
const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    processingFee: {
      type: Number,
      default: 0,
    },
    interestRate: {
      type: Number,
      default: 0.1,
    },
    termDays: {
      type: Number,
      default: 30,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'disbursed'],
      default: 'pending',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'completed', 'overdue'],
      default: 'unpaid',
    },
    mpesaReference: String,
    disbursedAt: Date,
    repaymentDueDate: Date,
  },
  {
    timestamps: true,
  }
);

class Loan {
  static async create(data) {
    try {
      const model = mongoose.model('Loan', loanSchema);
      const loan = new model(data);
      return await loan.save();
    } catch (error) {
      console.error('[Loan.create] Error:', error.message);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const model = mongoose.model('Loan', loanSchema);
      return await model.findById(id);
    } catch (error) {
      console.error('[Loan.findById] Error:', error.message);
      return null;
    }
  }

  static async findByUserId(userId) {
    try {
      if (!userId) return [];
      const model = mongoose.model('Loan', loanSchema);
      return await model.find({ userId });
    } catch (error) {
      console.error('[Loan.findByUserId] Error:', error.message);
      return [];
    }
  }

  static async updateStatus(loanId, status, paymentReference) {
    try {
      const model = mongoose.model('Loan', loanSchema);
      const loan = await model.findById(loanId);

      if (!loan) return null;

      loan.status = status;
      loan.paymentStatus = 'completed';
      loan.mpesaReference = paymentReference;

      if (status === 'approved') {
        loan.disbursedAt = new Date();
        loan.repaymentDueDate = new Date(Date.now() + loan.termDays * 24 * 60 * 60 * 1000);
      }

      return await loan.save();
    } catch (error) {
      console.error('[Loan.updateStatus] Error:', error.message);
      return null;
    }
  }
}

module.exports = Loan;
