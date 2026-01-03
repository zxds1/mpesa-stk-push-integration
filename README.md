# M-Pesa Buy Goods Online Payment Module

A Node.js Express API module for integrating M-Pesa buy goods online payments using the M-Pesa Express (STK Push) API.

## Features

- Initiate STK Push payments for buy goods online
- Handle M-Pesa callbacks and confirmations
- Query transaction status
- Store transaction data in MongoDB
- Input validation and rate limiting
- Comprehensive logging

## Prerequisites

- Node.js (v18 or higher)
- MongoDB
- M-Pesa Developer Account and API credentials

## Installation

1. Clone or download the project
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables in `.env` file:
   ```env
   MPESA_CONSUMER_KEY=your_consumer_key
   MPESA_CONSUMER_SECRET=your_consumer_secret
   MPESA_SHORTCODE=your_buy_goods_shortcode
   MPESA_PASSKEY=your_passkey
   NODE_ENV=development
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/mpesa_payments
   MPESA_CALLBACK_URL=http://your-domain.com/api/mpesa/callback
   ```

## API Endpoints

### Initiate Payment
**POST** `/api/mpesa/initiate-payment`

Request body:
```json
{
  "phoneNumber": "254712345678",
  "amount": 100,
  "accountReference": "Order123",
  "transactionDesc": "Payment for order"
}
```

Response:
```json
{
  "success": true,
  "message": "Payment initiated successfully",
  "data": {
    "checkoutRequestId": "ws_CO_...",
    "responseCode": "0",
    "responseDescription": "Success. Request accepted for processing",
    "customerMessage": "Success. Request accepted for processing"
  }
}
```

### Query Transaction Status
**GET** `/api/mpesa/status/:checkoutRequestId`

Response:
```json
{
  "success": true,
  "data": {
    "ResponseCode": "0",
    "ResponseDescription": "The service request has been accepted successfully",
    "MerchantRequestID": "1234-567890-1",
    "CheckoutRequestID": "ws_CO_...",
    "ResultCode": "0",
    "ResultDesc": "The service request is processed successfully"
  }
}
```

### M-Pesa Callback
**POST** `/api/mpesa/callback`

This endpoint is called by M-Pesa to notify payment results.

### M-Pesa Validation
**POST** `/api/mpesa/validation`

For C2B validation (if configured).

### M-Pesa Confirmation
**POST** `/api/mpesa/confirmation`

Alternative confirmation endpoint.

## Usage

1. Start the server:
   ```bash
   npm start
   ```

2. For development with auto-restart:
   ```bash
   npm install -g nodemon
   nodemon app.js
   ```

## M-Pesa Setup

### Getting Environment Variables

1. **Register for M-Pesa Developer Account**
   - Visit https://developer.safaricom.co.ke/
   - Create an account and verify your email

2. **Create an Application**
   - Log in to the developer portal
   - Go to "My Apps" and click "Create App"
   - Fill in the application details
   - Note down your **Consumer Key** and **Consumer Secret**

3. **Get Your Buy Goods Online Shortcode**
   - In the developer portal, go to "Test Credentials"
   - For sandbox testing, use the default shortcode: `174379`
   - For production, you'll need to register your business with Safaricom to get a live shortcode

4. **Get Your Passkey**
   - In the developer portal, go to "Test Credentials"
   - Copy the **Passkey** for the Buy Goods Online service
   - For sandbox: `bfb279f9aa9bdbcf158e97dd71a467cd`
   - For production: This will be provided when you register for live services

5. **Configure Callback URLs**
   - Set up your callback URL in the developer portal
   - This should point to your `/api/mpesa/callback` endpoint
   - Example: `https://your-domain.com/api/mpesa/callback`

6. **For Buy Goods Online payments, use "CustomerBuyGoodsOnline" as TransactionType**

## Database Schema

Transactions are stored in MongoDB with the following schema:
- `checkoutRequestId`: Unique M-Pesa checkout request ID
- `phoneNumber`: Customer's phone number
- `amount`: Payment amount
- `accountReference`: Reference for the transaction
- `status`: pending/completed/failed/cancelled
- `mpesaReceiptNumber`: M-Pesa receipt number
- `transactionDate`: Date of transaction
- `resultCode` & `resultDesc`: M-Pesa response codes

## Security

### HTTPS Requirements

**M-Pesa API requires HTTPS for all callback URLs in production:**

1. **Development Environment**
   - Use HTTP for local testing
   - M-Pesa sandbox accepts HTTP callback URLs
   - Example: `http://localhost:3000/api/mpesa/callback`

2. **Production Environment**
   - **HTTPS is mandatory** for all callback URLs
   - Obtain SSL certificate for your domain
   - Configure your web server (nginx, Apache) with SSL
   - Example: `https://your-domain.com/api/mpesa/callback`

3. **SSL Certificate Options**
   - **Let's Encrypt**: Free SSL certificates (recommended)
   - **Commercial SSL**: Purchase from certificate authorities
   - **Cloud Provider SSL**: AWS, Google Cloud, Azure provide SSL options

### Security Best Practices

- **Rate limiting** (100 requests per 15 minutes per IP)
- **Input validation** using express-validator
- **Environment variables** for sensitive data (never commit to version control)
- **HTTPS** required for production callback URLs
- **Secure storage** of API credentials
- **Request logging** for audit trails
- **Error handling** without exposing sensitive information

### Production Security Checklist

- [ ] Obtain SSL certificate for your domain
- [ ] Configure HTTPS on your web server
- [ ] Update callback URLs to use HTTPS
- [ ] Set up environment variables in production
- [ ] Configure firewall rules for API access
- [ ] Enable request logging and monitoring
- [ ] Set up proper error handling
- [ ] Test with M-Pesa sandbox before going live

## Logging

Logs are written to:
- `combined.log`: All logs
- `error.log`: Error logs only
- `mpesa.log`: M-Pesa specific logs
- Console in development mode

## Testing

For testing with M-Pesa sandbox:
1. Use sandbox credentials
2. Set `NODE_ENV=development`
3. Use test phone numbers provided by M-Pesa

## License

ISC