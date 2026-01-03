require('dotenv').config();
const axios = require('axios');

const consumerKey = process.env.MPESA_CONSUMER_KEY;
const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
const shortcode = process.env.MPESA_SHORTCODE;
const passkey = process.env.MPESA_PASSKEY;
const baseUrl = 'https://sandbox.safaricom.co.ke';
const callbackUrl = process.env.MPESA_CALLBACK_URL;

async function debugMpesa() {
  console.log('=== M-Pesa Debug Test ===');
  console.log('Consumer Key:', consumerKey);
  console.log('Consumer Secret:', consumerSecret);
  console.log('Shortcode:', shortcode);
  console.log('Passkey:', passkey);
  console.log('Base URL:', baseUrl);
  console.log('Callback URL:', callbackUrl);
  console.log('');

  try {
    // Step 1: Get access token
    console.log('Step 1: Getting access token...');
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    console.log('Auth header:', auth);
    
    const tokenResponse = await axios.get(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
      validateStatus: () => true, // Don't throw on any status
    });
    
    console.log('Token response status:', tokenResponse.status);
    console.log('Token response data:', tokenResponse.data);
    
    if (tokenResponse.status !== 200) {
      console.log('❌ Failed to get access token');
      return;
    }
    
    const token = tokenResponse.data.access_token;
    console.log('✅ Access token obtained:', token);
    console.log('');

    // Step 2: Generate password
    console.log('Step 2: Generating password...');
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = Buffer.from(shortcode + passkey + timestamp).toString('base64');
    
    console.log('Timestamp:', timestamp);
    console.log('Password:', password);
    console.log('');

    // Step 3: Format phone number
    console.log('Step 3: Formatting phone number...');
    const phoneNumber = '254708374149'; // Sandbox test number
    const formattedPhone = phoneNumber.replace(/^\+/, '').replace(/^0/, '254');
    console.log('Original phone:', phoneNumber);
    console.log('Formatted phone:', formattedPhone);
    console.log('');

    // Step 4: Prepare payload
    console.log('Step 4: Preparing payload...');
    const payload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerBuyGoodsOnline',
      Amount: 10,
      PartyA: formattedPhone,
      PartyB: shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl,
      AccountReference: 'test',
      TransactionDesc: 'Payment',
    };
    
    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('');

    // Step 5: Make STK Push request
    console.log('Step 5: Making STK Push request...');
    const stkResponse = await axios.post(`${baseUrl}/mpesa/stkpush/v1/processrequest`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      validateStatus: () => true, // Don't throw on any status
    });
    
    console.log('STK Push response status:', stkResponse.status);
    console.log('STK Push response data:', stkResponse.data);
    
    if (stkResponse.status === 200) {
      console.log('✅ STK Push successful!');
      console.log('Checkout Request ID:', stkResponse.data.CheckoutRequestID);
    } else {
      console.log('❌ STK Push failed');
    }
    
  } catch (error) {
    console.error('❌ Error in debug test:');
    console.error('Error message:', error.message);
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
    console.error('Error config:', error.config);
  }
}

debugMpesa();