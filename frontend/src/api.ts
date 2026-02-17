export const API_URL = import.meta.env.PROD ? '/api' : (import.meta.env.VITE_API_URL || 'http://localhost:3000/api');

interface RequestOptions extends RequestInit {
    token?: string;
}

export const apiRequest = async (endpoint: string, options: RequestOptions = {}) => {
    const token = localStorage.getItem('token');

    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            errorData = { error: await response.text() };
        }
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    return response.json();
};

// User Management API
export const getUsers = () => apiRequest('/users');
export const createUser = (data: any) => apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify(data)
});
export const updateUser = (id: string, data: any) => apiRequest(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
});
export const deleteUser = (id: string) => apiRequest(`/users/${id}`, {
    method: 'DELETE'
});

export const exportData = () => apiRequest('/admin/export', {
    method: 'GET'
});

export const importData = (data: any) => apiRequest('/admin/import', {
    method: 'POST',
    body: JSON.stringify(data)
});
