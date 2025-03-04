import axios from 'axios';

export const handler = async (event) => {
  console.log('Event received:', JSON.stringify(event));

  const origin = event.headers?.origin || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'CORS preflight successful' }),
    };
  }

  // Shift4Shop credentials (use environment variables)
  const storeUrl = 'https://311n16875921454.s4shops.com';
  const clientId = process.env.SHIFT4SHOP_CLIENT_ID || 'your-client-id';
  const clientSecret = process.env.SHIFT4SHOP_CLIENT_SECRET || 'your-client-secret';

  if (!clientId || !clientSecret) {
    console.error('Missing Shift4Shop credentials');
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing Shift4Shop API credentials' }),
    };
  }

  // OAuth token request
  const tokenUrl = `${storeUrl}/oauth/token`; // Verify this with Shift4Shop docs
  let accessToken;

  try {
    const tokenResponse = await axios.post(
      tokenUrl,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 5000,
      }
    );
    accessToken = tokenResponse.data.access_token;
    console.log('OAuth token obtained');
  } catch (tokenError) {
    console.error('OAuth token error:', tokenError.message);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to authenticate with Shift4Shop API' }),
    };
  }

  // Shift4Shop API request
  const apiUrl = `${storeUrl}/api/v1/Products`; // Use store-specific v1 endpoint
  try {
    const response = await axios.get(apiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      params: { limit: 50 },
      timeout: 10000,
    });

    console.log('API response received:', response.status);
    const mappedProducts = response.data.map(product => ({
      catalogid: product.CatalogID || product.catalogid || product.id,
      name: product.Name || product.name,
      price: parseFloat(product.Price || product.price) || 0,
      listprice: product.ListPrice ? parseFloat(product.ListPrice) : undefined,
      thumbnailurl: product.ThumbnailURL || product.thumbnail || product.MainImage || '/assets/logo-placeholder.png',
      mainimagefile: product.MainImage || product.mainimagefile || '/assets/logo-placeholder.png',
      description: product.Description || '',
      stock: parseInt(product.Stock || product.stock, 10) || 0,
      featured: product.Featured || false,
      categoryid: product.CategoryID || product.categoryid || 'shift4shop',
    }));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(mappedProducts),
    };
  } catch (error) {
    console.error('API fetch error:', error.message);
    if (error.response) {
      console.log('Error response:', error.response.data);
    }

    // Fallback to static data
    console.log('Falling back to static products');
    const staticProducts = [ /* Your staticProducts array here */ ];
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(staticProducts),
    };
  }
};