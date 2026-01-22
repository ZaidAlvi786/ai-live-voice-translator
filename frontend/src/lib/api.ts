import { useAuthStore } from '@/stores/useAuthStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export async function apiRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
    body?: any
): Promise<T> {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    // Add Authorization header from useAuthStore
    const authStore = useAuthStore.getState();
    const token = authStore.token;

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    };

    let response = await fetch(`${API_URL}${endpoint}`, config);

    // 401 Handling: Auto-Refresh
    if (response.status === 401) {
        const refreshToken = authStore.refreshToken;
        if (refreshToken) {
            try {
                console.log("Access token expired. Attempting refresh...");
                // Attempt to refresh
                const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token: refreshToken })
                });

                if (refreshResponse.ok) {
                    const data = await refreshResponse.json();

                    // Update Store with new tokens
                    authStore.setTokens(data.token, data.refresh_token);

                    // Retry Original Request with new token
                    headers['Authorization'] = `Bearer ${data.token}`;
                    const retryConfig = { ...config, headers };
                    response = await fetch(`${API_URL}${endpoint}`, retryConfig);

                } else {
                    console.error("Session refresh failed. Logging out.");
                    authStore.signOut();
                    window.location.href = '/'; // Redirect to login
                    throw new Error("Session expired");
                }
            } catch (error) {
                console.error("Error during token refresh", error);
                authStore.signOut();
                window.location.href = '/';
                throw error;
            }
        }
    }

    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
}
