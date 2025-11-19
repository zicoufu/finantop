import { queryClient } from "./queryClient";

export class ApiError extends Error {
  status: number;
  // optional payload returned by server, e.g., { message, errors }
  data?: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// A wrapper for the native fetch function
export const api = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('authToken');

  // Base URL (workaround sem proxy do Vite).
  // Regra:
  //  - Se VITE_API_BASE_URL for vazio ou apontar para localhost, usa window.location.origin (mesma origem).
  //  - Caso contrário, usa VITE_API_BASE_URL.
  const envBase = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  let cleanedBase = envBase ? envBase.replace(/\/+$/, '') : '';

  if (!cleanedBase || /localhost(:\d+)?$/i.test(cleanedBase)) {
    if (typeof window !== 'undefined' && window.location?.origin) {
      cleanedBase = window.location.origin.replace(/\/+$/, '');
    } else {
      cleanedBase = '';
    }
  }

  const cleanedPath = (url.startsWith('/') ? url : `/${url}`).replace(/\/{2,}/g, '/');
  const apiUrl = cleanedBase ? `${cleanedBase}${cleanedPath}` : cleanedPath;
  
  console.log(`[API] Base: ${cleanedBase || '(relative)'} | URL: ${apiUrl}`);

  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  const response = await fetch(apiUrl, mergedOptions);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
    // If the user is unauthorized, log them out
    if (response.status === 401) {
      console.error('API Error: Unauthorized. Clearing token and reloading.');
      // Limpar token e recarregar a página para um novo estado limpo
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      queryClient.clear();
      window.location.reload(); // Recarrega a página
    }
    throw new ApiError(errorData.message || `HTTP error! status: ${response.status}`, response.status, errorData);
  }

  // If the response has content, parse it as JSON. Otherwise, return null.
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.indexOf('application/json') !== -1) {
    return response.json();
  }
  
  return null; // For responses like 204 No Content
};
