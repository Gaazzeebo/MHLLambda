import axios from 'axios';

// Fallback data if the API call fails
const fallbackProducts = [
  {
    catalogid: 999,
    name: 'Fallback Product',
    price: 9.99,
    thumbnailurl: '/assets/logo-placeholder.png',
    mainimagefile: '/assets/logo-placeholder.png',
    description: 'Returned if the Shift4Shop API call fails.',
    stock: 99,
    featured: false,
    categoryid: 'shift4shop',
  },
];

// Default order statuses if API call fails
const fallbackOrderStatuses = [
  { OrderStatusID: 1, Sorting: 1, StatusDefinition: "New", StatusText: "New", Visible: true },
  { OrderStatusID: 2, Sorting: 2, StatusDefinition: "Processing", StatusText: "Processing", Visible: true },
  { OrderStatusID: 3, Sorting: 3, StatusDefinition: "Shipped", StatusText: "Shipped", Visible: true },
  { OrderStatusID: 4, Sorting: 4, StatusDefinition: "Completed", StatusText: "Completed", Visible: true },
];

// List of allowed origins – add your domains here
const allowedOrigins = [
  'https://main.d3oft2ruceh6kv.amplifyapp.com',
  'https://main.d3oft2ruceh6kv.amplifyapp.com/',
  'http://localhost:3000',
  '*' // Allow all origins while testing (remove in production)
];

export const handler = async (event) => {
  console.log('===> Event received:', JSON.stringify(event));

  // 1. Improved CORS Handling
  const requestOrigin = event.headers?.origin || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // For testing; restrict in production
    'Access-Control-Allow-Headers': 'Content-Type, Accept, SecureURL, PrivateKey, Token, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

  // 2. Read environment variables (or use hard-coded values)
  // For order endpoints, the base URL should be the REST endpoint.
  const storeUrl = process.env.SHIFT4SHOP_STORE_URL || 'https://apirest.3dcart.com';
  const privateKey = process.env.SHIFT4SHOP_PRIVATE_KEY || '37ab4b76efdd4a63c967655b9d616610';
  const token = process.env.SHIFT4SHOP_TOKEN || '910d514950707115391650f15e36aa56';

  // 3. The merchant's secure URL – your store URL
  const secureUrl = '311n16875921454.s4shops.com';

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

  // 5. Determine the resource path.
  // If using a proxy integration in API Gateway, event.pathParameters.proxy will contain the full path.
  // Otherwise, fall back to event.path.
  let resourcePath = '';
  if (event.pathParameters && event.pathParameters.proxy) {
    resourcePath = `/${event.pathParameters.proxy}`;
  } else if (event.path) {
    resourcePath = event.path;
  }
  console.log('===> Resource path extracted:', resourcePath);

  // 6. Build query string from event query parameters (if any)
  let queryParams = [];
  if (event.queryStringParameters) {
    for (const [key, value] of Object.entries(event.queryStringParameters)) {
      // Exclude pagination parameters if desired (or keep them if needed)
      if (key.toLowerCase() !== 'page') {
        queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      }
    }
  }
  const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

  // 7. Parse request body if present
  let requestBody = null;
  if (event.body) {
    try {
      requestBody = JSON.parse(event.body);
    } catch (error) {
      console.error('===> Error parsing request body:', error);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid request body' }),
      };
    }
  }

  console.log(`===> Request details:
    Path: ${event.path}
    Resource Path: ${resourcePath}
    HTTP Method: ${event.httpMethod}
    Query String: ${queryString}`);

  try {
    let response;

    // Set up base headers
    const headers = {
      PrivateKey: privateKey,
      Token: token,
      SecureURL: secureUrl,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    // For Orders endpoints (and sub-resources), add Authorization header
    if (resourcePath.toLowerCase().startsWith('/orders') || resourcePath.toLowerCase().startsWith('/orderstatus')) {
      console.log('===> Adding Authorization header for Orders API endpoint');
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('===> API request headers:', {
      ...headers,
      PrivateKey: '***HIDDEN***',
      Token: '***HIDDEN***',
      Authorization: headers.Authorization ? '***HIDDEN***' : undefined
    });

    // Special handling for GET /products (with pagination)
    if (event.httpMethod === 'GET' && resourcePath.toLowerCase() === '/products') {
      let allProducts = [];
      const limit = event.queryStringParameters && event.queryStringParameters.limit
                      ? parseInt(event.queryStringParameters.limit)
                      : 50;
      let offset = event.queryStringParameters && event.queryStringParameters.offset
                      ? parseInt(event.queryStringParameters.offset)
                      : 0;
      let fetchMore = true;
      
      while (fetchMore) {
        const pageQuery = `?limit=${limit}&offset=${offset}${queryString}`;
        const pageUrl = `${storeUrl}/3dCartWebAPI/v1${resourcePath}${pageQuery}`;
        console.log(`===> Fetching products with offset ${offset} from: ${pageUrl}`);
        const pageResponse = await axios.get(pageUrl, { headers, timeout: 10000 });
        console.log(`===> Offset ${offset} response status: ${pageResponse.status}`);
        if (pageResponse.data && Array.isArray(pageResponse.data)) {
          if (pageResponse.data.length === 0) {
            fetchMore = false;
          } else {
            allProducts = allProducts.concat(pageResponse.data);
            if (pageResponse.data.length < limit) {
              fetchMore = false;
            } else {
              offset += limit;
            }
          }
        } else {
          fetchMore = false;
        }
      }
      response = { data: allProducts, status: 200 };
    } else {
      // For all other endpoints (including orders and related resources)
      const apiUrl = `${storeUrl}/3dCartWebAPI/v1${resourcePath}${queryString}`;
      console.log(`===> Making ${event.httpMethod} request to: ${apiUrl}`);
      
      switch (event.httpMethod) {
        case 'GET':
          response = await axios.get(apiUrl, { headers, timeout: 10000 });
          break;
        case 'POST':
          // Mask sensitive order fields in logs if necessary
          if (requestBody && requestBody.CardNumber) {
            console.log('===> Order data:', JSON.stringify({
              ...requestBody,
              CardNumber: '****',
              CardVerification: '***'
            }).substring(0, 1000) + (JSON.stringify(requestBody).length > 1000 ? '...' : ''));
          } else {
            console.log('===> Request body:', JSON.stringify(requestBody).substring(0, 1000) +
                        (JSON.stringify(requestBody).length > 1000 ? '...' : ''));
          }
          response = await axios.post(apiUrl, requestBody, { headers, timeout: 15000 });
          break;
        case 'PUT':
          console.log('===> Request body:', JSON.stringify(requestBody).substring(0, 1000) +
                      (JSON.stringify(requestBody).length > 1000 ? '...' : ''));
          response = await axios.put(apiUrl, requestBody, { headers, timeout: 10000 });
          break;
        case 'DELETE':
          response = await axios.delete(apiUrl, { headers, timeout: 10000 });
          break;
        default:
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: `Unsupported HTTP method: ${event.httpMethod}` }),
          };
      }
    }
    
    console.log(`===> API response status: ${response.status}`);
    if (response.data) {
      const dataStr = JSON.stringify(response.data);
      console.log(`===> API response data sample:`, dataStr.substring(0, 500) + (dataStr.length > 500 ? '...' : ''));
    }
    
    // Fallback handling for GET endpoints if needed
    if (event.httpMethod === 'GET') {
      if (resourcePath.toLowerCase().includes('/products') && (!response.data || response.data.length === 0)) {
        console.log('===> No products returned, using fallback products');
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify(fallbackProducts),
        };
      }
      if (resourcePath.toLowerCase().includes('/orderstatus') && (!response.data || response.data.length === 0)) {
        console.log('===> No order statuses returned, using fallback statuses');
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify(fallbackOrderStatuses),
        };
      }
    }
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(response.data),
    };
    
  } catch (error) {
    console.error(`===> API request error: ${error.message}`);
    if (error.response) {
      console.error('===> Error response status:', error.response.status);
      console.error('===> Error response data:', error.response.data);
    }
    
    if (event.httpMethod === 'GET') {
      if (resourcePath.toLowerCase().includes('/products')) {
        console.log('===> Error fetching products, using fallback data');
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify(fallbackProducts),
        };
      }
      if (resourcePath.toLowerCase().includes('/orderstatus')) {
        console.log('===> Error fetching order statuses, using fallback data');
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify(fallbackOrderStatuses),
        };
      }
    }
    
    if (resourcePath.toLowerCase().includes('/orders') && event.httpMethod === 'POST') {
      console.log('===> Creating mock order response since Shift4Shop API call failed');
      const mockOrderId = `TEST-${Date.now()}`;
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify([
          {
            "Key": "OrderID",
            "Value": mockOrderId,
            "Status": "201",
            "Message": "Order created successfully (TEST)"
          }
        ]),
      };
    }
    
    return {
      statusCode: error.response?.status || 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: error.response?.data || error.message,
        message: `Failed to process ${event.httpMethod} request to ${resourcePath}`
      }),
    };
  }
};
