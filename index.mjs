import axios from 'axios';

// Fallback data if the API call fails
const fallbackProducts = [
  {
    catalogid: 999,
    name: 'Fallback Product v1',
    price: 9.99,
    thumbnailurl: '/assets/logo-placeholder.png',
    mainimagefile: '/assets/logo-placeholder.png',
    description: 'Returned if the 3dcart v1 API call fails.',
    stock: 99,
    featured: false,
    categoryid: 'shift4shop',
  },
];

export const handler = async (event) => {
  console.log('===> Event received:', JSON.stringify(event));

  // 1. Basic CORS Handling
  const origin = event.headers?.origin || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle OPTIONS (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'CORS preflight successful' }),
    };
  }

  // 2. Read environment variables (or use default hard-coded values)
  const storeUrl = process.env.SHIFT4SHOP_STORE_URL || 'https://apirest.3dcart.com';
  const privateKey = process.env.SHIFT4SHOP_PRIVATE_KEY || '37ab4b76efdd4a63c967655b9d616610';
  const token = process.env.SHIFT4SHOP_TOKEN || '910d514950707115391650f15e36aa56';

  // 3. The merchant's secure URL – typically the live store's URL.
  // Based on your store settings, it is likely:
  const secureUrl = 'https://311n16875921454.s4shops.com';

  // 4. Validate required credentials
  if (!storeUrl || !privateKey || !token) {
    console.error('===> Missing one or more required environment variables.');
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Missing SHIFT4SHOP_STORE_URL, SHIFT4SHOP_PRIVATE_KEY, or SHIFT4SHOP_TOKEN',
      }),
    };
  }

  // 5. Build the API endpoint URL for v1 (with limit=100)
  // Since SHIFT4SHOP_STORE_URL is set to "https://apirest.3dcart.com",
  // the final URL will be "https://apirest.3dcart.com/3dCartWebAPI/v1/Products?limit=100"
  const apiUrl = `${storeUrl}/3dCartWebAPI/v1/Products?limit=100`;
  console.log(`===> Attempting to fetch products from: ${apiUrl}`);

  try {
    const response = await axios.get(apiUrl, {
      headers: {
        PrivateKey: privateKey,
        Token: token,
        SecureURL: secureUrl, // Added this header per 3dcart requirements
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    console.log('===> 3dcart v1 API response status:', response.status);
    console.log('===> 3dcart v1 API data length:', response.data?.length);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    console.error('===> 3dcart v1 API fetch error:', error.message);
    if (error.response) {
      console.error('===> Error response data:', error.response.data);
      console.error('===> Error response status:', error.response.status);
    }
    console.log('===> Falling back to fallbackProducts array...');
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(fallbackProducts),
    };
  }
};
