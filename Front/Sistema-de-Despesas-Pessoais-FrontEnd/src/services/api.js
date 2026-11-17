import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
    withCredentials: true
});

api.interceptors.request.use((config) => {
    const csrf = document.cookie.split("; ").find((part) => part.startsWith("csrf="))?.slice(5);
    if (csrf) config.headers["X-CSRF-Token"] = decodeURIComponent(csrf);
    return config;
});

export default api;
