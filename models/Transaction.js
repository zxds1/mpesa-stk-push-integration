const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  checkoutRequestId: {
    type: String,
    required: true,
    unique: true,
  },
  merchantRequestId: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  accountReference: {
    type: String,
    required: true,
  },
  transactionDesc: {
    type: String,
    default: 'Payment',
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending',
  },
  mpesaReceiptNumber: {
    type: String,
  },
  transactionDate: {
    type: Date,
  },
  resultCode: {
    type: String,
  },
  resultDesc: {
    type: String,
  },
  callbackMetadata: {
    type: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Transaction', transactionSchema);