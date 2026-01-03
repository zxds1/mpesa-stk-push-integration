const axios = require('axios');
const crypto = require('crypto');
const winston = require('winston');

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

class MpesaService {
  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.shortcode = process.env.MPESA_SHORTCODE;
    this.passkey = process.env.MPESA_PASSKEY;
    this.baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Utility function to ensure shortcode is numeric
   * @param {string|number} shortcode - The shortcode to convert
   * @returns {number} - Numeric shortcode
   */
  ensureNumericShortcode(shortcode) {
    const numericShortcode = parseInt(shortcode, 10);
    if (isNaN(numericShortcode)) {
      throw new Error(`Invalid shortcode format: ${shortcode}`);
    }
    return numericShortcode;
  }

  /**
   * Utility function to ensure amount is numeric
   * @param {string|number} amount - The amount to convert
   * @returns {number} - Numeric amount
   */
  ensureNumericAmount(amount) {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error(`Invalid amount format: ${amount}`);
    }
    return numericAmount;
  }

  /**
   * Utility function to format phone number for M-Pesa API
   * @param {string} phoneNumber - The phone number to format
   * @returns {string} - Formatted phone number
   */
  formatPhoneNumber(phoneNumber) {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      throw new Error(`Invalid phone number: ${phoneNumber}`);
    }
    
    // Remove + prefix and replace leading 0 with 254
    const formattedPhone = phoneNumber.replace(/^\+/, '').replace(/^0/, '254');
    
    // Validate Kenyan phone number format (254 followed by 9 digits)
    if (!/^254\d{9}$/.test(formattedPhone)) {
      throw new Error(`Invalid Kenyan phone number format: ${formattedPhone}`);
    }
    
    return formattedPhone;
  }

  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      const response = await axios.get(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      });

      this.accessToken = response.data.access_token;
      // Token expires in 3599 seconds (1 hour - 1 second)
      this.tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000; // Refresh 1 min early

      logger.info('M-Pesa access token obtained successfully');
      return this.accessToken;
    } catch (error) {
      logger.error('Error getting M-Pesa access token:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: `${this.baseUrl}/oauth/v1/generate`,
        auth: 'Basic ' + Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64').substring(0, 20) + '...',
        consumerKey: this.consumerKey,
        consumerSecret: this.consumerSecret,
        baseUrl: this.baseUrl
      });
      throw new Error('Failed to obtain access token');
    }
  }

  generatePassword() {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = Buffer.from(this.shortcode + this.passkey + timestamp).toString('base64');
    return { password, timestamp };
  }

  async initiateSTKPush(phoneNumber, amount, accountReference, transactionDesc = 'Payment') {
    try {
      const token = await this.getAccessToken();
      const { password, timestamp } = this.generatePassword();

      // Validate and format inputs
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      const numericAmount = this.ensureNumericAmount(amount);
      const numericShortcode = this.ensureNumericShortcode(this.shortcode);

      logger.info('STK Push payload preparation', {
        shortcode: this.shortcode,
        numericShortcode,
        amount,
        numericAmount,
        phoneNumber,
        formattedPhone,
        accountReference,
        transactionDesc
      });

      const payload = {
        BusinessShortCode: numericShortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: numericAmount,
        PartyA: formattedPhone,
        PartyB: numericShortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: process.env.MPESA_CALLBACK_URL,
        AccountReference: accountReference,
        TransactionDesc: transactionDesc,
      };

      logger.info('STK Push payload constructed', {
        payload: {
          ...payload,
          Password: '***', // Don't log sensitive data
          Timestamp: timestamp
        }
      });

      const response = await axios.post(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      logger.info('STK Push initiated successfully', { checkoutRequestId: response.data.CheckoutRequestID });
      return response.data;
    } catch (error) {
      logger.error('Error initiating STK Push:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
        payload: payload,
        token: token ? token.substring(0, 20) + '...' : 'null'
      });
      throw new Error('Failed to initiate payment');
    }
  }

  async queryTransactionStatus(checkoutRequestId) {
    try {
      const token = await this.getAccessToken();
      const { password, timestamp } = this.generatePassword();

      // Ensure shortcode is numeric for query payload
      const numericShortcode = this.ensureNumericShortcode(this.shortcode);

      logger.info('Transaction status query payload preparation', {
        shortcode: this.shortcode,
        numericShortcode,
        checkoutRequestId
      });

      const payload = {
        BusinessShortCode: numericShortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      };

      logger.info('Transaction status query payload constructed', {
        payload: {
          ...payload,
          Password: '***', // Don't log sensitive data
          Timestamp: timestamp
        }
      });

      const response = await axios.post(`${this.baseUrl}/mpesa/stkpushquery/v1/query`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      logger.info('Transaction status queried successfully', { checkoutRequestId });
      return response.data;
    } catch (error) {
      logger.error('Error querying transaction status:', error.response?.data || error.message);
      throw new Error('Failed to query transaction status');
    }
  }
}

module.exports = new MpesaService();