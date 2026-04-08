import axios from 'axios';
const api_url = process.env.NEXT_PUBLIC_API_URL;
if(!api_url) {
  throw new Error("Environment variable not found")
}
export const api = axios.create({
  baseURL: api_url,
  withCredentials: true, 
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);