// Request monitoring utility for debugging
let requestCounts = {};
let lastResetTime = Date.now();

export const monitorRequest = (endpoint) => {
  const now = Date.now();
  
  // Reset counts every 10 seconds
  if (now - lastResetTime > 10000) {
    if (Object.keys(requestCounts).length > 0) {
      console.log('🔍 Request counts (last 10s):', requestCounts);
    }
    requestCounts = {};
    lastResetTime = now;
  }
  
  // Count this request
  requestCounts[endpoint] = (requestCounts[endpoint] || 0) + 1;
  
  // Warn if too many requests to same endpoint
  if (requestCounts[endpoint] > 20) {
    console.warn(`⚠️ High request count for ${endpoint}: ${requestCounts[endpoint]} requests in 10s`);
  }
  
  return requestCounts[endpoint];
};

export const logRequest = (endpoint, method = 'GET') => {
  const count = monitorRequest(endpoint);
  if (count <= 5) { // Only log first 5 requests to avoid spam
    console.log(`📡 API Request #${count}: ${method} ${endpoint}`);
  }
}; 