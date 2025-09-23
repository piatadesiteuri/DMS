import config from '../config';

const BASE_URL = config.apiUrl;
const FRONTEND_URL = config.frontendUrl;

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

const api = {
  // Generic fetch with default options
  fetch: async (endpoint, options = {}) => {
    const defaultOptions = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL
      }
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    });

    return handleResponse(response);
  },

  // GET request
  get: (endpoint, options = {}) => {
    return api.fetch(endpoint, { ...options, method: 'GET' });
  },

  // POST request
  post: (endpoint, data, options = {}) => {
    return api.fetch(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // PUT request
  put: (endpoint, data, options = {}) => {
    return api.fetch(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // DELETE request
  delete: (endpoint, options = {}) => {
    return api.fetch(endpoint, { ...options, method: 'DELETE' });
  }
};

export { api, BASE_URL, FRONTEND_URL }; 