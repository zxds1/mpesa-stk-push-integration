# M-Pesa Till Number Payment Module

A Node.js Express API module for integrating M-Pesa till number payments using the M-Pesa Express (STK Push) API.

## Features

- Initiate STK Push payments for till numbers
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
   MPESA_SHORTCODE=your_till_number
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

1. Register for M-Pesa Developer account at https://developer.safaricom.co.ke/
2. Create an app and get consumer key/secret
3. Configure your callback URLs in the M-Pesa portal
4. For till number payments, use "CustomerPayBillOnline" as TransactionType

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

- Rate limiting (100 requests per 15 minutes per IP)
- Input validation using express-validator
- HTTPS recommended for production
- Environment variables for sensitive data

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