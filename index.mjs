// index.mjs - Updated AWS Lambda Function with OAuth Authentication (ES Module Version)

// Import axios for HTTP requests
import axios from 'axios';

export const handler = async (event) => {
    console.log('Event received:', JSON.stringify(event));
    
    // Extract origin for CORS headers
    const origin = event.headers && event.headers.origin ? event.headers.origin : '*';
    console.log('Request origin:', origin);
    
    // Define CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Content-Type': 'application/json'
    };
    
    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'CORS preflight successful' })
        };
    }
    
    // Get OAuth credentials from environment variables
    const clientId = process.env.SHIFT4SHOP_CLIENT_ID || 'a8bcb33baba8cedc03a788448659ca0e';
    const clientSecret = process.env.SHIFT4SHOP_CLIENT_SECRET || '37ab4b76efdd4a63c967655b9d616610';
    const storeId = '311n16875921454'; // Your store ID
    
    // Log credentials status
    console.log('OAuth Credentials Status:', clientId && clientSecret ? 'Present' : 'Missing');
    
    // OAuth token endpoint for Shift4Shop (replace with the correct endpoint if needed)
    const tokenUrl = 'https://api.shift4shop.com/oauth/token';
    
    let accessToken;
    
    try {
        // Obtain OAuth access token
        const tokenResponse = await axios.post(tokenUrl, {
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
            store_id: storeId
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        accessToken = tokenResponse.data.access_token;
        console.log('Successfully obtained OAuth access token');
    } catch (tokenError) {
        console.error('Error obtaining OAuth token:', tokenError.message);
        if (tokenError.response) {
            console.log('Token error response:', JSON.stringify(tokenError.response.data).substring(0, 200) + '...');
        }
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to authenticate with Shift4Shop API' })
        };
    }
    
    // Try the Shift4Shop API URL (updated with verified domain)
    const apiUrls = [
        `https://api.shift4shop.com/v1/products?store_id=${storeId}`, // Generic endpoint with store ID
        `https://311n16875921454.api.shift4shop.com/v1/products`,   // Store-specific endpoint (verify with Shift4Shop)
        'https://apirest.3dcart.com/3dCartWebAPI/v1/products'       // Legacy 3dcart endpoint
    ];
    
    // Prepare headers with OAuth token
    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
    
    let lastError = null;
    
    // Try each URL
    for (const url of apiUrls) {
        try {
            console.log(`Attempting to fetch from: ${url}`);
            
            const response = await axios.get(url, {
                params: { limit: 50 }, // Adjust limit as needed
                headers: headers,
                timeout: 10000 // 10-second timeout
            });
            
            console.log(`Success with URL: ${url}`);
            console.log('Response status:', response.status);
            console.log('Response data length:', JSON.stringify(response.data).length);
            
            // Map the API response to match Shift4ShopProduct interface
            const mappedProducts = response.data.map((product) => ({
                catalogid: product.catalogid || product.id, // Use 'id' or 'catalogid' based on API response
                name: product.name,
                price: parseFloat(product.price) || 0,
                listprice: product.list_price ? parseFloat(product.list_price) : undefined, // Adjust based on API response
                thumbnailurl: product.thumbnail || product.thumbnailurl || product.image1 || '/assets/logo-placeholder.png',
                mainimagefile: product.image1 || product.thumbnail || '/assets/logo-placeholder.png',
                description: product.description || '',
                stock: parseInt(product.stock, 10) || 0,
                featured: product.featured || false,
                categoryid: product.categories || product.categoryid || 'shift4shop'
            }));
            
            // Return successful response with CORS headers
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify(mappedProducts)
            };
        } catch (error) {
            console.log(`Error with URL ${url}:`, error.message);
            if (error.response) {
                console.log('Error response status:', error.response.status);
                console.log('Error response data:', JSON.stringify(error.response.data).substring(0, 200) + '...');
            }
            lastError = error;
            // Continue to next URL
        }
    }
    
    // If all URLs fail, return the static product data as fallback
    console.log('All URLs failed, returning static product data');
    
    const staticProducts = [
        { catalogid: 12, name: "GENERAL ADMISSION - NOV 15 - 7:30 PM Breckenridge Vipers vs Park City SilverKings", price: 22, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 833, categoryid: "VIPERS HOME GAME TICKETS (AVAILABLE NOW!!)/NOV 15 - 7:30 PM (Breckenridge Vipers vs Park City SilverKings)" },
        { catalogid: 14, name: "WHISKEY STAR SKYBOX - NOV 15 (Breckenridge Vipers vs Park City SilverKings)", price: 44, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 12, categoryid: "WHISKEY STAR SKYBOX" },
        { catalogid: 18, name: "GENERAL ADMISSION - NOV 16 - 7:30 PM Breckenridge Vipers vs Park City SilverKings", price: 22, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 972, categoryid: "VIPERS HOME GAME TICKETS (AVAILABLE NOW!!)/NOV 16 - 7:30 PM (Breckenridge Vipers vs Park City SilverKings)" },
        { catalogid: 19, name: "GENERAL ADMISSION - NOV 22 - 7:30 PM Breckenridge Vipers vs Mansfield", price: 22, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 921, categoryid: "VIPERS HOME GAME TICKETS (AVAILABLE NOW!!)/NOV 22 - 7:30 PM (Breckenridge Vipers vs Mansfield)" },
        { catalogid: 21, name: "GENERAL ADMISSION - NOV 23 - 7:30 PM Breckenridge Vipers vs Mansfield", price: 22, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 918, categoryid: "VIPERS HOME GAME TICKETS (AVAILABLE NOW!!)/NOV 23 - 7:30 PM (Breckenridge Vipers vs Mansfield)" },
        { catalogid: 22, name: "GENERAL ADMISSION - DEC 6 - 7:30 PM Breckenridge Vipers vs Las Vegas", price: 22, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 910, categoryid: "VIPERS HOME GAME TICKETS (AVAILABLE NOW!!)/DEC 6 - 7:30 PM (Breckenridge Vipers vs Las Vegas)" },
        { catalogid: 23, name: "GENERAL ADMISSION - DEC 7 - 7:30 PM Breckenridge Vipers vs Las Vegas", price: 22, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 903, categoryid: "VIPERS HOME GAME TICKETS (AVAILABLE NOW!!)/DEC 7 - 7:30 PM (Breckenridge Vipers vs Las Vegas)" },
        { catalogid: 24, name: "GENERAL ADMISSION - JAN 10 - 7:30 PM Breckenridge Vipers vs San Diego", price: 22, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 785, categoryid: "VIPERS HOME GAME TICKETS (AVAILABLE NOW!!)/JAN 10 - 7:30 PM (Breckenridge Vipers vs San Diego)" },
        { catalogid: 25, name: "GENERAL ADMISSION - JAN 11 - 7:30 PM Breckenridge Vipers vs San Diego", price: 22, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 857, categoryid: "VIPERS HOME GAME TICKETS (AVAILABLE NOW!!)/JAN 11 - 7:30 PM (Breckenridge Vipers vs San Diego)" },
        { catalogid: 26, name: "GENERAL ADMISSION - FEB 21 - 7:30 PM Breckenridge Vipers vs Steamboat Vigilantes", price: 22, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 861, categoryid: "VIPERS HOME GAME TICKETS (AVAILABLE NOW!!)/FEB 21 - 7:30 PM (Breckenridge Vipers vs Steamboat Vigilantes)" },
        { catalogid: 29, name: "GENERAL ADMISSION - FEB 28 - 7:30 PM Breckenridge Vipers vs Vail", price: 22, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 0, categoryid: "VIPERS HOME GAME TICKETS (AVAILABLE NOW!!)/FEB 28 - 7:30 PM (Breckenridge Vipers vs Vail)" },
        { catalogid: 30, name: "GENERAL ADMISSION - MAR 7 - 7:30 PM Breckenridge Vipers vs Santa Rosa", price: 22, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 997, categoryid: "VIPERS HOME GAME TICKETS (AVAILABLE NOW!!)/MAR 7 - 7:30 PM (Breckenridge Vipers vs Santa Rosa)" },
        { catalogid: 31, name: "GENERAL ADMISSION - MAR 8 - 7:30 PM Breckenridge Vipers vs Santa Rosa", price: 22, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 998, categoryid: "VIPERS HOME GAME TICKETS (AVAILABLE NOW!!)/MAR 8 - 7:30 PM (Breckenridge Vipers vs Santa Rosa)" },
        { catalogid: 32, name: "WHISKEY STAR SKYBOX - NOV 16 VIPERS VS PARK CITY", price: 44, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 42, categoryid: "WHISKEY STAR SKYBOX" },
        { catalogid: 33, name: "WHISKEY STAR SKYBOX - NOV 22 VIPERS VS MANSFIELD", price: 44, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 44, categoryid: "WHISKEY STAR SKYBOX" },
        { catalogid: 34, name: "WHISKEY STAR SKYBOX - NOV 23 VIPERS VS MANSFIELD", price: 44, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 49, categoryid: "WHISKEY STAR SKYBOX" },
        { catalogid: 35, name: "WHISKEY STAR SKYBOX - DEC 6 VIPERS VS LAS VEGAS", price: 44, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 49, categoryid: "WHISKEY STAR SKYBOX" },
        { catalogid: 36, name: "WHISKEY STAR SKYBOX - DEC 7 VIPERS VS LAS VEGAS", price: 44, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 49, categoryid: "WHISKEY STAR SKYBOX" },
        { catalogid: 37, name: "WHISKEY STAR SKYBOX - JAN 10 VIPERS VS SAN DIEGO", price: 44, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 15, categoryid: "WHISKEY STAR SKYBOX" },
        { catalogid: 38, name: "WHISKEY STAR SKYBOX - JAN 11 VIPERS VS SAN DIEGO", price: 44, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 44, categoryid: "WHISKEY STAR SKYBOX" },
        { catalogid: 39, name: "WHISKEY STAR SKYBOX - FEB 21 VIPERS VS Steamboat Vigilantes", price: 44, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 42, categoryid: "WHISKEY STAR SKYBOX" },
        { catalogid: 40, name: "WHISKEY STAR SKYBOX - FEB 28 VIPERS VS VAIL", price: 44, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 0, categoryid: "WHISKEY STAR SKYBOX" },
        { catalogid: 41, name: "WHISKEY STAR SKYBOX - FEB 22 VIPERS VS Steamboat Vigilantes", price: 44, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 45, categoryid: "WHISKEY STAR SKYBOX" },
        { catalogid: 42, name: "WHISKEY STAR SKYBOX - MAR7 (Breckenridge Vipers vs Santa Rosa)", price: 44, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 50, categoryid: "WHISKEY STAR SKYBOX" },
        { catalogid: 43, name: "WHISKEY STAR SKYBOX - MAR 8 (Breckenridge Vipers vs Santa Rosa)", price: 44, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 50, categoryid: "WHISKEY STAR SKYBOX" },
        { catalogid: 46, name: "CHILD ADMISSION - NOV15 Breckenridge Vipers vs Park City SilverKings", price: 7, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 493, categoryid: "CHILD TICKETS (12 & UNDER)" },
        { catalogid: 47, name: "CHILD ADMISSION - NOV16 Breckenridge Vipers vs Park City SilverKings", price: 7, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 499, categoryid: "CHILD TICKETS (12 & UNDER)" },
        { catalogid: 48, name: "CHILD ADMISSION - NOV 22 Breckenridge Vipers vs Mansfield", price: 7, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 495, categoryid: "CHILD TICKETS (12 & UNDER)" },
        { catalogid: 49, name: "CHILD ADMISSION - DEC7 Breckenridge Vipers vs Las Vegas", price: 7, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 497, categoryid: "CHILD TICKETS (12 & UNDER)" },
        { catalogid: 50, name: "CHILD ADMISSION - JAN 10 Breckenridge Vipers vs San Diego", price: 7, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 493, categoryid: "CHILD TICKETS (12 & UNDER)" },
        { catalogid: 51, name: "CHILD ADMISSION - DEC6 Breckenridge Vipers vs Las Vegas", price: 7, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 500, categoryid: "CHILD TICKETS (12 & UNDER)" },
        { catalogid: 52, name: "CHILD ADMISSION - NOV 23 Breckenridge Vipers vs Mansfield", price: 7, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 500, categoryid: "CHILD TICKETS (12 & UNDER)" },
        { catalogid: 53, name: "CHILD ADMISSION - JAN 11 Breckenridge Vipers vs San Diego", price: 7, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 497, categoryid: "CHILD TICKETS (12 & UNDER)" },
        { catalogid: 54, name: "CHILD ADMISSION - FEB 28 Breckenridge Vipers vs Vail", price: 7, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 0, categoryid: "CHILD TICKETS (12 & UNDER)" },
        { catalogid: 55, name: "CHILD ADMISSION - FEB 21 Breckenridge Vipers vs Steamboat Vigilantes", price: 7, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 495, categoryid: "CHILD TICKETS (12 & UNDER)" },
        { catalogid: 56, name: "CHILD ADMISSION - MAR 8 Breckenridge Vipers vs Santa Rosa", price: 7, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 500, categoryid: "CHILD TICKETS (12 & UNDER)" },
        { catalogid: 57, name: "CHILD ADMISSION - FEB 22 Breckenridge Vipers vs Steamboat Vigilantes", price: 7, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 497, categoryid: "CHILD TICKETS (12 & UNDER)" },
        { catalogid: 64, name: "CHILD ADMISSION - MAR 7 Breckenridge Vipers vs Santa Rosa", price: 7, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 500, categoryid: "CHILD TICKETS (12 & UNDER)" },
        { catalogid: 65, name: "SKYBOX SEASON PASS 2024/25", price: 395, thumbnailurl: "assets/images/thumbnails/3_thumbnail.png", mainimagefile: "assets/images/3.png", description: "", stock: 145, categoryid: "SEASON TICKETS" },
        { catalogid: 66, name: "SKYBOX VIPERS FAN PACKAGE ", price: 695, thumbnailurl: "assets/images/thumbnails/alt color 10th anniversary logo (5)84_thumbnail.png", mainimagefile: "assets/images/alt color 10th anniversary logo (5)84.png", description: "2 Season Passes & 1 Game Worn Jersey!  All-Access Passes VIP Whiskey Star Catered SkyBox! ", stock: 28, categoryid: "SEASON TICKETS" },
        { catalogid: 67, name: "Viper Pit- Season Pass 17 Games ", price: 195, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "General Admission to all 17 Viper Home Games.  Enjoy quick entry with your fast pass at games! ", stock: 189, categoryid: "SEASON TICKETS@GENERAL ADMISSION" },
        { catalogid: 69, name: "CHILD ADMISSION - MAR 14 Breckenridge Vipers vs Bozeman", price: 7, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 500, categoryid: "CHILD TICKETS (12 & UNDER)" },
        { catalogid: 70, name: "CHILD ADMISSION - MAR 15 Breckenridge Vipers vs Bozeman", price: 7, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 495, categoryid: "CHILD TICKETS (12 & UNDER)" },
        { catalogid: 72, name: "CHILD ADMISSION - MAR 21 Breckenridge Vipers vs LEAFS", price: 7, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 498, categoryid: "CHILD TICKETS (12 & UNDER)" },
        { catalogid: 73, name: "CHILD ADMISSION - MAR 22 Breckenridge Vipers vs LEAFS", price: 7, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 500, categoryid: "CHILD TICKETS (12 & UNDER)" },
        { catalogid: 74, name: "GENERAL ADMISSION - MAR 14 - 7:30 PM Breckenridge Vipers vs Bozeman", price: 22, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 990, categoryid: "VIPERS HOME GAME TICKETS (AVAILABLE NOW!!)/MAR 14 - 7:30 PM (Breckenridge Vipers vs Bozeman)" },
        { catalogid: 75, name: "GENERAL ADMISSION - MAR 15 - 7:30 PM Breckenridge Vipers vs Bozeman ", price: 22, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 995, categoryid: "VIPERS HOME GAME TICKETS (AVAILABLE NOW!!)/MAR 15 - 7:30 PM (Breckenridge Vipers vs Bozeman)" },
        { catalogid: 76, name: "GENERAL ADMISSION - MAR 21 - 7:30 PM Breckenridge Vipers vs LEAFS", price: 22, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 998, categoryid: "VIPERS HOME GAME TICKETS (AVAILABLE NOW!!)/MAR 21 - 7:30 PM (Breckenridge Vipers vs LEAFS)" },
        { catalogid: 77, name: "GENERAL ADMISSION - MAR 22 - 7:30 PM Breckenridge Vipers vs LEAFS", price: 22, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 998, categoryid: "VIPERS HOME GAME TICKETS (AVAILABLE NOW!!)/MAR 22 - 7:30 PM (Breckenridge Vipers vs LEAFS)" },
        { catalogid: 78, name: "WHISKEY STAR SKYBOX - MAR 14 Breckenridge Vipers vs Bozeman", price: 44, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 50, categoryid: "WHISKEY STAR SKYBOX" },
        { catalogid: 79, name: "WHISKEY STAR SKYBOX - MAR 15 Breckenridge Vipers vs Bozeman ", price: 44, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 41, categoryid: "WHISKEY STAR SKYBOX" },
        { catalogid: 80, name: "WHISKEY STAR SKYBOX - MAR 21 Breckenridge Vipers vs LEAFS", price: 44, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 50, categoryid: "WHISKEY STAR SKYBOX" },
        { catalogid: 81, name: "WHISKEY STAR SKYBOX - MAR 22 Breckenridge Vipers vs LEAFS", price: 44, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 20, categoryid: "WHISKEY STAR SKYBOX" },
        { catalogid: 82, name: "GENERAL ADMISSION - FEB 22 - 7:30 PM Breckenridge Vipers vs Steamboat Vigilantes", price: 22, thumbnailurl: "assets/images/thumbnails/1_thumbnail.png", mainimagefile: "assets/images/thumbnails/1_thumbnail.png", description: "", stock: 881, categoryid: "VIPERS HOME GAME TICKETS (AVAILABLE NOW!!)/FEB 22 - 7:30 PM (Breckenridge Vipers vs Steamboat Vigilantes)" },
        { catalogid: 86, name: "SKYBOX SEASON PASS 2024/25 (COPY)", price: 395, thumbnailurl: "assets/images/thumbnails/3_thumbnail.png", mainimagefile: "assets/images/3.png", description: "", stock: 143, categoryid: "SEASON TICKETS" },
        { catalogid: 89, name: "Black Vipers T-Shirt Unisex Adult", price: 35, thumbnailurl: "assets/images/thumbnails/IMG_8815_thumbnail.jpg", mainimagefile: "assets/images/IMG_8815.png", description: "", stock: 100, categoryid: "shift4shop" },
        { catalogid: 90, name: "Black Vipers T-Shirt Unisex Youth", price: 35, thumbnailurl: "assets/images/thumbnails/IMG_8815_thumbnail.jpg", mainimagefile: "assets/images/IMG_8815.png", description: "", stock: 100, categoryid: "shift4shop" },
        { catalogid: 91, name: "Grey Vipers T-Shirt Unisex Adult", price: 35, thumbnailurl: "/assets/logo-placeholder.png", mainimagefile: "/assets/logo-placeholder.png", description: "", stock: 100, categoryid: "shift4shop" },
        { catalogid: 92, name: "Grey Vipers T-Shirt Unisex Youth", price: 35, thumbnailurl: "/assets/logo-placeholder.png", mainimagefile: "/assets/logo-placeholder.png", description: "", stock: 100, categoryid: "shift4shop" },
        { catalogid: 93, name: "Black Vipers Long Sleeve Adult Unisex", price: 45, thumbnailurl: "/assets/logo-placeholder.png", mainimagefile: "/assets/logo-placeholder.png", description: "", stock: 100, categoryid: "shift4shop" },
        { catalogid: 94, name: "Grey Vipers Long Sleeve Adult Unisex", price: 45, thumbnailurl: "assets/images/thumbnails/76246357246__5CB42042-F72D-402A-895D-A86DEE2BFCDD_thumbnail.jpg", mainimagefile: "assets/images/76246357246__5CB42042-F72D-402A-895D-A86DEE2BFCDD.jpeg", description: "", stock: 100, categoryid: "shift4shop" },
        { catalogid: 95, name: "Black Vipers Longsleeve Youth Unisex", price: 45, thumbnailurl: "/assets/logo-placeholder.png", mainimagefile: "/assets/logo-placeholder.png", description: "", stock: 100, categoryid: "shift4shop" },
        { catalogid: 96, name: "Grey Vipers Long Sleeve Unisex Youth", price: 45, thumbnailurl: "assets/images/thumbnails/76246357246__5CB42042-F72D-402A-895D-A86DEE2BFCDD_thumbnail.jpg", mainimagefile: "assets/images/76246357246__5CB42042-F72D-402A-895D-A86DEE2BFCDD.jpeg", description: "", stock: 100, categoryid: "shift4shop" },
        { catalogid: 97, name: "Black Vipers Hoodie Adult Unisex", price: 65, thumbnailurl: "assets/images/thumbnails/IMG_1551_thumbnail.jpg", mainimagefile: "assets/images/IMG_1551.jpeg", description: "", stock: 100, categoryid: "shift4shop" },
        { catalogid: 98, name: "Grey Vipers Hoodie Unisex Adult", price: 65, thumbnailurl: "/assets/logo-placeholder.png", mainimagefile: "/assets/logo-placeholder.png", description: "", stock: 100, categoryid: "shift4shop" },
        { catalogid: 99, name: "Black Vipers Hoodie Unisex Youth", price: 65, thumbnailurl: "assets/images/thumbnails/IMG_1551_thumbnail.jpg", mainimagefile: "assets/images/IMG_1551.jpeg", description: "", stock: 100, categoryid: "shift4shop" },
        { catalogid: 100, name: "Grey Vipers Hoodie Unisex Youth", price: 65, thumbnailurl: "/assets/logo-placeholder.png", mainimagefile: "/assets/logo-placeholder.png", description: "", stock: 100, categoryid: "shift4shop" }
    ].map(product => ({
        catalogid: product.catalogid,
        name: product.name,
        price: product.price,
        listprice: undefined, // No list price in your data, but you can add if available
        thumbnailurl: product.thumbnailurl || product.mainimagefile || '/assets/logo-placeholder.png',
        mainimagefile: product.mainimagefile || product.thumbnailurl || '/assets/logo-placeholder.png',
        description: product.description || '',
        stock: product.stock,
        featured: false, // Set based on your criteria or API response
        categoryid: product.categoryid || 'shift4shop'
    }));
    
    return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(staticProducts)
    };
};

// Note: You might want to remove or adjust the staticProducts fallback once the API is working reliably.