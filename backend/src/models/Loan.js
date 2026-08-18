// Loan Model - File-Based JSON Storage
const fs = require('fs');
const path = require('path');

const STORE_DIR = process.env.TALA_EXTRA_MODEL_STORE_DIR || path.resolve(__dirname, '../../data');
const STORE_FILE = path.join(STORE_DIR, 'loans.json');

const ensureStore = () => {
  try {
    fs.mkdirSync(STORE_DIR, { recursive: true });
    if (!fs.existsSync(STORE_FILE)) {
      fs.writeFileSync(STORE_FILE, JSON.stringify({ loans: [] }, null, 2));
    }
  } catch (error) {
    console.error('[Loan] Error ensuring store:', error.message);
  }
};

const readStore = () => {
  try {
    ensureStore();
    const raw = fs.readFileSync(STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.loans) ? parsed.loans : [];
  } catch (error) {
    console.error('[Loan] Error reading store:', error.message);
    return [];
  }
};

const writeStore = (loans) => {
  try {
    ensureStore();
    fs.writeFileSync(STORE_FILE, JSON.stringify({ loans }, null, 2));
  } catch (error) {
    console.error('[Loan] Error writing store:', error.message);
  }
};

const loansFromStore = () => {
  return readStore().map((loan) => ({
    ...loan,
    createdAt: loan.createdAt ? new Date(loan.createdAt) : new Date(),
    updatedAt: loan.updatedAt ? new Date(loan.updatedAt) : new Date(),
    disbursedAt: loan.disbursedAt ? new Date(loan.disbursedAt) : null,
    repaymentDueDate: loan.repaymentDueDate ? new Date(loan.repaymentDueDate) : null,
  }));
};

const persistLoans = (loanList) => {
  writeStore(
    loanList.map((loan) => ({
      ...loan,
      createdAt: loan.createdAt instanceof Date ? loan.createdAt.toISOString() : loan.createdAt,
      updatedAt: loan.updatedAt instanceof Date ? loan.updatedAt.toISOString() : loan.updatedAt,
      disbursedAt: loan.disbursedAt instanceof Date ? loan.disbursedAt.toISOString() : loan.disbursedAt,
      repaymentDueDate: loan.repaymentDueDate instanceof Date ? loan.repaymentDueDate.toISOString() : loan.repaymentDueDate,
    }))
  );
};

class Loan {
  constructor(data) {
    this.id = data.id;
    this.userId = data.userId;
    this.amount = data.amount;
    this.processingFee = data.processingFee;
    this.interestRate = data.interestRate;
    this.termDays = data.termDays;
    this.status = data.status || 'pending';
    this.paymentStatus = data.paymentStatus || 'unpaid';
    this.mpesaReference = data.mpesaReference || null;
    this.disbursedAt = null;
    this.repaymentDueDate = null;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  static async create(data) {
    try {
      const loanList = loansFromStore();
      const loan = new Loan({
        ...data,
        id: `LOAN-${Date.now()}`,
      });
      loanList.push(loan);
      persistLoans(loanList);
      console.log(`[Loan] Created loan ${loan.id}`);
      return loan;
    } catch (error) {
      console.error('[Loan.create] Error:', error.message);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const loanList = loansFromStore();
      return loanList.find((loan) => loan.id === id) || null;
    } catch (error) {
      console.error('[Loan.findById] Error:', error.message);
      return null;
    }
  }

  static async findByUserId(userId) {
    try {
      const loanList = loansFromStore();
      return loanList.filter((loan) => loan.userId === userId);
    } catch (error) {
      console.error('[Loan.findByUserId] Error:', error.message);
      return [];
    }
  }

  static async updateStatus(loanId, status, paymentReference) {
    try {
      const loanList = loansFromStore();
      const loan = loanList.find((item) => item.id === loanId);
      if (loan) {
        loan.status = status;
        loan.paymentStatus = 'completed';
        loan.mpesaReference = paymentReference;
        loan.updatedAt = new Date();
        if (status === 'approved') {
          loan.disbursedAt = new Date();
          loan.repaymentDueDate = new Date(Date.now() + loan.termDays * 24 * 60 * 60 * 1000);
        }
        persistLoans(loanList);
      }
      return loan || null;
    } catch (error) {
      console.error('[Loan.updateStatus] Error:', error.message);
      return null;
    }
  }
}

module.exports = Loan;
