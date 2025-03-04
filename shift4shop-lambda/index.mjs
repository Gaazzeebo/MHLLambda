import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

export const handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const response = await axios.get('https://311n16875921454.s4shops.com/api/v1/Products', {
      headers: {
        'PrivateKey': process.env.SHIFT4SHOP_PRIVATE_KEY,
        'Token': process.env.SHIFT4SHOP_TOKEN,
        'SecureURL': 'https://311n16875921454.s4shops.com',
      },
    });
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    console.error('Error fetching Shift4Shop products:', error.message);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to fetch products' }),
    };
  }
};