import { handler } from './index.mjs';

(async () => {
  const event = { httpMethod: 'GET' }; // Simulate a GET request
  const response = await handler(event);
  console.log('Response:', response);
})();