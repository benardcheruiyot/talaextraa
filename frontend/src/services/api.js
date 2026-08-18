// API Service
import axios from 'axios';

const API_URL =
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://talaextraa.onrender.com/api');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // ✅ 30 second timeout for all requests
  withCredentials: true, // ✅ Allow credentials (CORS)
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log(`[API] ${config.method?.toUpperCase()} ${config.url} - Sending...`);
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.status} - ${response.config.url}`);
    console.log('[API Response] Full data:', response.data);
    return response;
  },
  (error) => {
    console.error('[API Error] Full error object:', error);
    console.error('[API Error] Config:', error.config);
    console.error('[API Error] Response status:', error.response?.status);
    console.error('[API Error] Response data:', error.response?.data);
    console.error('[API Error] Error code:', error.code);
    console.error('[API Error] Error message:', error.message);
    
    // Better error message construction
    let message = 'Connection error. Please check your network and try again.';
    
    if (error.response) {
      // Server responded with error status
      message = error.response?.data?.error?.message || 
                error.response?.data?.message || 
                `Server error: ${error.response.status}`;
    } else if (error.request) {
      // Request made but no response
      console.error('[API Error] No response received:', error.request);
      message = 'No response from server. Check your connection and try again.';
    } else if (error.code === 'ECONNABORTED') {
      message = 'Request timeout. The server took too long to respond.';
    } else {
      message = error.message || 'Network error occurred';
    }
    
    console.error('[API] Final error message:', message);
    return Promise.reject(new Error(message));
  }
);

// Auth Service
export const authService = {
  registerOrLogin: async (name, phone_number) => {
    const response = await api.post('/auth/register', { name, phone_number });
    if (response.data.data.token) {
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data.data;
  },

  getProfile: async () => {
    const response = await api.get('/user/profile');
    return response.data.data;
  },

  updateProfile: async (userData) => {
    const response = await api.put('/user/profile', userData);
    return response.data.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

// Loan Service
export const loanService = {
  createApplication: async (amount, termDays) => {
    const response = await api.post('/loans/apply', { amount, termDays });
    return response.data.data;
  },

  getUserLoans: async () => {
    const response = await api.get('/loans');
    return response.data.data;
  },

  getLoanDetails: async (loanId) => {
    const response = await api.get(`/loans/${loanId}`);
    return response.data.data;
  },

  // ✅ Helper: Retry with exponential backoff for transient failures
  _retryWithBackoff: async (fn, maxRetries = 1, delayMs = 500) => {
    let lastError;
    let currentDelay = delayMs; // Use local variable to avoid loop function ESLint error
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries + 1}`);
        return await fn();
      } catch (error) {
        lastError = error;
        const isTransient = 
          error.code === 'ECONNABORTED' || // Timeout
          error.code === 'ECONNRESET' ||   // Connection reset
          error.message?.includes('Network') ||
          error.message?.includes('timeout');
        
        if (!isTransient || attempt === maxRetries) {
          throw error;
        }
        
        console.warn(`[Retry] Attempt ${attempt + 1} failed (transient). Waiting ${currentDelay}ms...`);
        await new Promise(r => setTimeout(r, currentDelay));
        currentDelay *= 1.5; // Exponential backoff
      }
    }
    throw lastError;
  },

  initiateStkPush: async (phone, amount, loanAmount, termDays = 60) => {
    // ✅ Retry transient failures (network errors, timeouts)
    return loanService._retryWithBackoff(async () => {
      try {
        console.log('[STK Push] Calling /stk_push endpoint with:', { phone, amount, loanAmount, termDays });
        const response = await api.post('/stk_push', {
          phone,
          amount,
          loanAmount,
          termDays,
        });
        console.log('[STK Push] Full response object:', response);
        console.log('[STK Push] Response data:', response.data);
        console.log('[STK Push] Response status:', response.status);
        return response.data;
      } catch (error) {
        console.error('[STK Push] ERROR caught:', error);
        console.error('[STK Push] Error message:', error.message);
        console.error('[STK Push] Error response:', error.response);
        throw error;
      }
    }, 2, 500); // 2 retries with 500ms initial delay
  },

  checkPaymentStatus: async (checkoutId) => {
    // ✅ Retry transient failures for status checks
    return loanService._retryWithBackoff(async () => {
      try {
        console.log('[Payment Status] Checking status for:', checkoutId);
        const response = await api.get('/check_status', {
          params: {
            checkoutId,
            t: Date.now(),
          },
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        });
        console.log('[Payment Status] Response:', response.data);
        return response.data;
      } catch (error) {
        console.error('[Payment Status] Error:', error.message);
        throw error;
      }
    }, 1, 300); // 1 retry with 300ms initial delay
  },
};

export default api;
