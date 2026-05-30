import axios from 'axios';
const AUTH_URL   = process.env.REACT_APP_AUTH_URL   || 'http://localhost:8000';
const UPLOAD_URL = process.env.REACT_APP_UPLOAD_URL || 'http://localhost:5000';
export const authAPI = axios.create({ baseURL: AUTH_URL });
export const fileAPI = axios.create({ baseURL: UPLOAD_URL });
export const setAuthHeader = (t) => { fileAPI.defaults.headers.common['Authorization'] = `Bearer ${t}`; };
