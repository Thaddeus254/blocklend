const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  borrower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  loanType: {
    type: String,
    enum: ['personal', 'business', 'mortgage', 'auto', 'student'],
    required: true
  },
  amount: {
    type: Number,
    required: [true, 'Loan amount is required'],
    min: [100, 'Minimum loan amount is 100'],
    max: [1000000, 'Maximum loan amount is 1,000,000']
  },
  currency: {
    type: String,
    enum: ['USD', 'EUR', 'GBP', 'ETH', 'USDC', 'USDT'],
    default: 'USD'
  },
  interestRate: {
    type: Number,
    required: [true, 'Interest rate is required'],
    min: [0, 'Interest rate cannot be negative'],
    max: [100, 'Interest rate cannot exceed 100%']
  },
  term: {
    type: Number,
    required: [true, 'Loan term is required'],
    min: [1, 'Minimum term is 1 month'],
    max: [360, 'Maximum term is 360 months (30 years)']
  },
  termUnit: {
    type: String,
    enum: ['days', 'months', 'years'],
    default: 'months'
  },
  purpose: {
    type: String,
    required: [true, 'Loan purpose is required'],
    maxlength: [500, 'Purpose cannot exceed 500 characters']
  },
  collateral: {
    type: {
      type: String,
      enum: ['real_estate', 'vehicle', 'crypto', 'stocks', 'other']
    },
    description: String,
    value: Number,
    documents: [String] // URLs to uploaded documents
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'active', 'completed', 'defaulted'],
    default: 'pending'
  },
  approvalDate: Date,
  disbursementDate: Date,
  dueDate: Date,
  completedDate: Date,
  monthlyPayment: {
    type: Number,
    required: function() { return this.status === 'approved'; }
  },
  totalAmount: {
    type: Number,
    required: function() { return this.status === 'approved'; }
  },
  remainingBalance: {
    type: Number,
    default: function() { return this.amount; }
  },
  payments: [{
    amount: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    transactionHash: String,
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'failed'],
      default: 'pending'
    }
  }],
  blockchainData: {
    contractAddress: String,
    loanId: String,
    transactionHash: String,
    blockNumber: Number
  },
  documents: [{
    type: {
      type: String,
      enum: ['income_proof', 'bank_statement', 'identity_document', 'collateral_document', 'other']
    },
    name: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  notes: [{
    content: String,
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  riskScore: {
    type: Number,
    min: 0,
    max: 100
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectionReason: String,
  lateFees: {
    type: Number,
    default: 0
  },
  daysLate: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
loanSchema.index({ borrower: 1 });
loanSchema.index({ status: 1 });
loanSchema.index({ loanType: 1 });
loanSchema.index({ createdAt: -1 });
loanSchema.index({ dueDate: 1 });
loanSchema.index({ 'blockchainData.contractAddress': 1, 'blockchainData.loanId': 1 });

// Virtual for loan progress
loanSchema.virtual('progress').get(function() {
  if (this.status !== 'active' && this.status !== 'completed') return 0;
  const paid = this.amount - this.remainingBalance;
  return Math.round((paid / this.amount) * 100);
});

// Virtual for next payment date
loanSchema.virtual('nextPaymentDate').get(function() {
  if (this.status !== 'active') return null;
  const lastPayment = this.payments
    .filter(p => p.status === 'confirmed')
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  
  if (!lastPayment) return this.disbursementDate;
  
  const nextDate = new Date(lastPayment.date);
  nextDate.setMonth(nextDate.getMonth() + 1);
  return nextDate;
});

// Virtual for days until next payment
loanSchema.virtual('daysUntilNextPayment').get(function() {
  const nextPayment = this.nextPaymentDate;
  if (!nextPayment) return null;
  
  const today = new Date();
  const diffTime = nextPayment - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to calculate loan details
loanSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isModified('interestRate') || this.isModified('term')) {
    if (this.status === 'approved' || this.status === 'active') {
      // Calculate monthly payment using simple interest formula
      const monthlyRate = this.interestRate / 100 / 12;
      const totalInterest = this.amount * monthlyRate * this.term;
      this.totalAmount = this.amount + totalInterest;
      this.monthlyPayment = this.totalAmount / this.term;
    }
  }
  next();
});

// Instance method to add payment
loanSchema.methods.addPayment = function(amount, transactionHash = null) {
  this.payments.push({
    amount,
    transactionHash,
    status: 'confirmed'
  });
  
  this.remainingBalance = Math.max(0, this.remainingBalance - amount);
  
  if (this.remainingBalance === 0) {
    this.status = 'completed';
    this.completedDate = new Date();
  }
  
  return this.save();
};

// Instance method to calculate late fees
loanSchema.methods.calculateLateFees = function() {
  if (this.status !== 'active') return 0;
  
  const today = new Date();
  const dueDate = this.dueDate || this.nextPaymentDate;
  
  if (!dueDate || today <= dueDate) return 0;
  
  const daysLate = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
  const lateFeeRate = 0.05; // 5% late fee
  const lateFee = this.monthlyPayment * lateFeeRate * Math.floor(daysLate / 30);
  
  return lateFee;
};

// Static method to find active loans
loanSchema.statics.findActiveLoans = function() {
  return this.find({ status: 'active' }).populate('borrower', 'firstName lastName email');
};

// Static method to find overdue loans
loanSchema.statics.findOverdueLoans = function() {
  const today = new Date();
  return this.find({
    status: 'active',
    dueDate: { $lt: today }
  }).populate('borrower', 'firstName lastName email');
};

// JSON serialization
loanSchema.methods.toJSON = function() {
  const loanObject = this.toObject();
  loanObject.progress = this.progress;
  loanObject.nextPaymentDate = this.nextPaymentDate;
  loanObject.daysUntilNextPayment = this.daysUntilNextPayment;
  return loanObject;
};

module.exports = mongoose.model('Loan', loanSchema); 