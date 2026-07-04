import axios from 'axios';

const api_url = process.env.NEXT_PUBLIC_API_URL;
if(!api_url) {
  throw new Error("Environment variable not found")
}

export let serverTimeOffset = 0;
export const getServerTime = () => Date.now() + serverTimeOffset;

export const api = axios.create({
  baseURL: api_url,
  withCredentials: true, 
});
let cachedDeviceId: string | null = null;

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    if (!cachedDeviceId) {
      try {
        cachedDeviceId = localStorage.getItem('device_id');
        if (!cachedDeviceId) {
          cachedDeviceId = crypto.randomUUID();
          localStorage.setItem('device_id', cachedDeviceId);
        }
      } catch (_err) {
        cachedDeviceId = crypto.randomUUID();
        console.warn("localStorage is not accessible");
      }
    }
    config.headers['x-device-id'] = cachedDeviceId;
    config.headers['x-trace-id'] = crypto.randomUUID();
  }
  return config;
});
api.interceptors.response.use(
  (response) => {
    if (response.headers.date) {
      const serverTimer = new Date(response.headers.date).getTime();
      const localTime = Date.now();
      serverTimeOffset = serverTimer - localTime;
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);