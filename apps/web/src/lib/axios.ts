import axios from 'axios';
const api_url = process.env.NEXT_PUBLIC_API_URL;
if(!api_url) {
  throw new Error("Environment variable not found")
}
export const api = axios.create({
  baseURL: api_url,
  withCredentials: true, 
});
let cachedDeviceId: string | null = null;

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    if (!cachedDeviceId) {
      cachedDeviceId = localStorage.getItem('device_id');
      if (!cachedDeviceId) {
        cachedDeviceId = crypto.randomUUID();
        localStorage.setItem('device_id', cachedDeviceId);
      }
    }
    config.headers['x-device-id'] = cachedDeviceId;
  }
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);