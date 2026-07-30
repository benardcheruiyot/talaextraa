// Loan Model
const fs = require('fs');
const path = require('path');

const STORE_DIR = process.env.TALA_EXTRA_MODEL_STORE_DIR || path.resolve(__dirname, '../../data');
const STORE_FILE = path.join(STORE_DIR, 'loans.json');

const ensureStore = () => {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  if (!fs.existsSync(STORE_FILE)) {
    fs.writeFileSync(STORE_FILE, JSON.stringify({ loans: [] }, null, 2));
  }
};

const readStore = () => {
  ensureStore();
  const raw = fs.readFileSync(STORE_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.loans) ? parsed.loans : [];
  } catch {
    return [];
  }
};

const writeStore = (loans) => {
  ensureStore();
  fs.writeFileSync(STORE_FILE, JSON.stringify({ loans }, null, 2));
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
  writeStore(loanList.map((loan) => ({
    ...loan,
    createdAt: loan.createdAt instanceof Date ? loan.createdAt.toISOString() : loan.createdAt,
    updatedAt: loan.updatedAt instanceof Date ? loan.updatedAt.toISOString() : loan.updatedAt,
    disbursedAt: loan.disbursedAt instanceof Date ? loan.disbursedAt.toISOString() : loan.disbursedAt,
    repaymentDueDate: loan.repaymentDueDate instanceof Date ? loan.repaymentDueDate.toISOString() : loan.repaymentDueDate,
  })));
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
    const loanList = loansFromStore();
    const loan = new Loan({
      ...data,
      id: `LOAN-${Date.now()}`,
    });
    loanList.push(loan);
    persistLoans(loanList);
    return loan;
  }

  static async findById(id) {
    const loanList = loansFromStore();
    return loanList.find((loan) => loan.id === id) || null;
  }

  static async findByUserId(userId) {
    const loanList = loansFromStore();
    return loanList.filter((loan) => loan.userId === userId);
  }

  static async updateStatus(loanId, status, paymentReference) {
    const loanList = loansFromStore();
    const loan = loanList.find((item) => item.id === loanId);
    if (loan) {
      loan.status = status;
      loan.paymentStatus = 'completed';
      loan.mpesaReference = paymentReference;
      loan.updatedAt = new Date();
      if (status === 'approved') {
        loan.disbursedAt = new Date();
        loan.repaymentDueDate = new Date(
          Date.now() + loan.termDays * 24 * 60 * 60 * 1000
        );
      }
      persistLoans(loanList);
    }
    return loan;
  }
}

module.exports = Loan;
