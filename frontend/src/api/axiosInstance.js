import axios from "axios";
import { auth } from "../firebase/firebase";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000",
  timeout: 45000, // Render free tier can take 30-50s to cold start
});

axiosInstance.interceptors.request.use(
  async (config) => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const token = await currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.warn("Could not get Firebase ID token:", error.message);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("Unauthorized - Firebase token may be expired or invalid");
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
