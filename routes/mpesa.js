const express = require('express');
const { body, validationResult } = require('express-validator');
const mpesaService = require('../services/mpesaService');
const storageService = require('../services/storageService');
const winston = require('winston');

const router = express.Router();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'mpesa.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Validation middleware
const validateInitiatePayment = [
  body('phoneNumber').isMobilePhone('any').withMessage('Valid phone number is required'),
  body('amount').isNumeric().withMessage('Amount must be a number').isFloat({ min: 1 }).withMessage('Amount must be at least 1'),
  body('accountReference').isLength({ min: 1, max: 12 }).withMessage('Account reference is required and max 12 characters'),
];

// Initiate STK Push
router.post('/initiate-payment', validateInitiatePayment, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phoneNumber, amount, accountReference, transactionDesc } = req.body;

    const stkResponse = await mpesaService.initiateSTKPush(phoneNumber, amount, accountReference, transactionDesc);

    // Save transaction to storage
    const transaction = await storageService.create({
      checkoutRequestId: stkResponse.CheckoutRequestID,
      merchantRequestId: stkResponse.MerchantRequestID,
      phoneNumber,
      amount,
      accountReference,
      transactionDesc: transactionDesc || 'Payment',
      status: 'pending',
    });

    logger.info('Payment initiated', { checkoutRequestId: stkResponse.CheckoutRequestID });

    res.json({
      success: true,
      message: 'Payment initiated successfully',
      data: {
        checkoutRequestId: stkResponse.CheckoutRequestID,
        responseCode: stkResponse.ResponseCode,
        responseDescription: stkResponse.ResponseDescription,
        customerMessage: stkResponse.CustomerMessage,
      },
    });
  } catch (error) {
    logger.error('Error initiating payment:', error.message);
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
});

// Query transaction status
router.get('/status/:checkoutRequestId', async (req, res) => {
  try {
    const { checkoutRequestId } = req.params;

    const queryResponse = await mpesaService.queryTransactionStatus(checkoutRequestId);

    res.json({
      success: true,
      data: queryResponse,
    });
  } catch (error) {
    logger.error('Error querying transaction status:', error.message);
    res.status(500).json({ error: 'Failed to query transaction status' });
  }
});

// M-Pesa Callback
router.post('/callback', async (req, res) => {
  try {
    const callbackData = req.body;

    logger.info('M-Pesa callback received', callbackData);

    if (callbackData.Body && callbackData.Body.stkCallback) {
      const stkCallback = callbackData.Body.stkCallback;
      const checkoutRequestId = stkCallback.CheckoutRequestID;
      const resultCode = stkCallback.ResultCode;
      const resultDesc = stkCallback.ResultDesc;

      let updateData = {
        status: resultCode === 0 ? 'completed' : 'failed',
        resultCode: resultCode.toString(),
        resultDesc,
      };

      if (resultCode === 0 && stkCallback.CallbackMetadata) {
        const metadata = stkCallback.CallbackMetadata.Item;
        const receiptNumber = metadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
        const transactionDate = metadata.find(item => item.Name === 'TransactionDate')?.Value;

        updateData.mpesaReceiptNumber = receiptNumber;
        updateData.transactionDate = transactionDate ? new Date(transactionDate) : null;
        updateData.callbackMetadata = metadata;
      }

      await storageService.findOneAndUpdate(
        { checkoutRequestId },
        updateData
      );

      logger.info('Transaction updated from callback', { checkoutRequestId, status: updateData.status });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Error processing callback:', error.message);
    res.status(500).json({ error: 'Callback processing failed' });
  }
});

// Validation URL (for C2B, if needed)
router.post('/validation', (req, res) => {
  logger.info('M-Pesa validation received', req.body);
  // For validation, you can implement business logic here
  // Return success to accept the transaction
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

// Confirmation URL (alternative to callback)
router.post('/confirmation', async (req, res) => {
  try {
    const confirmationData = req.body;

    logger.info('M-Pesa confirmation received', confirmationData);

    // Similar processing as callback
    // Update transaction based on confirmation data

    res.json({ ResultCode: 0, ResultDesc: 'Confirmation received successfully' });
  } catch (error) {
    logger.error('Error processing confirmation:', error.message);
    res.status(500).json({ ResultCode: 1, ResultDesc: 'Confirmation processing failed' });
  }
});

module.exports = router;