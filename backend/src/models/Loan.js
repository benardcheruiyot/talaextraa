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

// Register model once
let LoanModel = null;

const getModel = () => {
  // Check if connection is ready
  if (mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB not connected. Connection state: ' + mongoose.connection.readyState);
  }
  
  if (!LoanModel) {
    if (mongoose.models.Loan) {
      LoanModel = mongoose.models.Loan;
    } else {
      LoanModel = mongoose.model('Loan', loanSchema);
    }
  }
  return LoanModel;
};

class Loan {
  static async create(data) {
    try {
      const model = getModel();
      const loan = new model(data);
      return await loan.save();
    } catch (error) {
      console.error('[Loan.create] Error:', error.message);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const model = getModel();
      return await model.findById(id);
    } catch (error) {
      console.error('[Loan.findById] Error:', error.message);
      throw error;
    }
  }

  static async findByUserId(userId) {
    try {
      if (!userId) return [];
      const model = getModel();
      return await model.find({ userId });
    } catch (error) {
      console.error('[Loan.findByUserId] Error:', error.message);
      throw error;
    }
  }

  static async updateStatus(loanId, status, paymentReference) {
    try {
      const model = getModel();
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
      throw error;
    }
  }
}

module.exports = Loan;
