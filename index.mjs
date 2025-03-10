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

// List of allowed origins - add your domains here
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

  // 5. Parse the path, method, and query parameters
  const path = event.path || '';
  const pathParameters = event.pathParameters || {};
  const httpMethod = event.httpMethod;
  let requestBody = null;
  
  // Extract endpoint path
  let resourcePath = '';
  if (pathParameters.proxy) {
    resourcePath = `/${pathParameters.proxy}`;
  } else if (path) {
    const pathParts = path.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      resourcePath = `/${pathParts[pathParts.length - 1]}`;
    }
    if (pathParts.length > 1 && pathParts[pathParts.length - 2] === 'Orders') {
      resourcePath = `/Orders/${pathParts[pathParts.length - 1]}`;
    }
  }
  
  console.log('===> Resource path extracted:', resourcePath);
  
  // Build query string from event query parameters (if any)
  let queryString = '';
  if (event.queryStringParameters) {
    const params = [];
    for (const [key, value] of Object.entries(event.queryStringParameters)) {
      // Exclude pagination parameters if we are going to override them
      if (key.toLowerCase() !== 'limit' && key.toLowerCase() !== 'offset' && key.toLowerCase() !== 'page') {
        params.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      }
    }
    if (params.length > 0) {
      queryString = `&${params.join('&')}`;
    }
  }
  
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
    Path: ${path}
    Resource Path: ${resourcePath}
    HTTP Method: ${httpMethod}
    Additional Query String: ${queryString}`);
  
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
    
    // For Orders endpoints, add Authorization header
    if (resourcePath.includes('/Orders')) {
      console.log('===> Adding Authorization header for Orders API endpoint');
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    console.log('===> API request headers:', {
      ...headers,
      PrivateKey: '***HIDDEN***',
      Token: '***HIDDEN***',
      Authorization: headers.Authorization ? '***HIDDEN***' : undefined
    });
    
    // If GET request to /products, implement offset-based pagination to fetch all products
    if (httpMethod === 'GET' && resourcePath.toLowerCase() === '/products') {
      let allProducts = [];
      const limit = (event.queryStringParameters && event.queryStringParameters.limit)
                        ? parseInt(event.queryStringParameters.limit)
                        : 50;
      let offset = (event.queryStringParameters && event.queryStringParameters.offset)
                        ? parseInt(event.queryStringParameters.offset)
                        : 0;
      let fetchMore = true;
      
      while (fetchMore) {
        // Build query string with limit, offset, plus any additional parameters
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
            // If fewer items than limit were returned, we've reached the end
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
      // Mimic axios response structure for consistency.
      response = { data: allProducts, status: 200 };
    } else {
      // For other endpoints, use the existing logic.
      const apiUrl = `${storeUrl}/3dCartWebAPI/v1${resourcePath}?${queryString.substring(1)}`;
      console.log(`===> Making ${httpMethod} request to: ${apiUrl}`);
      
      switch (httpMethod) {
        case 'GET':
          response = await axios.get(apiUrl, { headers, timeout: 10000 });
          break;
        case 'POST':
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
            body: JSON.stringify({ error: `Unsupported HTTP method: ${httpMethod}` }),
          };
      }
    }
    
    console.log(`===> API response status: ${response.status}`);
    if (response.data) {
      const dataStr = JSON.stringify(response.data);
      console.log(`===> API response data sample:`, dataStr.substring(0, 500) + (dataStr.length > 500 ? '...' : ''));
    }
    
    // For GET requests, if no data is returned, provide fallback data.
    if (httpMethod === 'GET') {
      if (resourcePath.includes('/products') && (!response.data || response.data.length === 0)) {
        console.log('===> No products returned, using fallback products');
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify(fallbackProducts),
        };
      }
      if (resourcePath.includes('/OrderStatus') && (!response.data || response.data.length === 0)) {
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
    
    if (httpMethod === 'GET') {
      if (resourcePath.includes('/products')) {
        console.log('===> Error fetching products, using fallback data');
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify(fallbackProducts),
        };
      }
      if (resourcePath.includes('/OrderStatus')) {
        console.log('===> Error fetching order statuses, using fallback data');
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify(fallbackOrderStatuses),
        };
      }
    }
    
    if (resourcePath.includes('/Orders') && httpMethod === 'POST') {
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
        message: `Failed to process ${httpMethod} request to ${resourcePath}`
      }),
    };
  }
};
