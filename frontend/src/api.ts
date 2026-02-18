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
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
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

// Mechanisms API
export const getMechanismProjects = () => apiRequest('/mechanisms/projects');
export const createMechanismProject = (data: { name: string; description?: string }) => apiRequest('/mechanisms/projects', {
    method: 'POST',
    body: JSON.stringify(data)
});
export const updateMechanismProject = (id: string, data: any) => apiRequest(`/mechanisms/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
});
export const getMechanismProjectDetails = (id: string) => apiRequest(`/mechanisms/projects/${id}`);
export const deleteMechanismProject = (id: string) => apiRequest(`/mechanisms/projects/${id}`, {
    method: 'DELETE'
});

export const createMechanismRoom = (data: { projectId: string; name: string; count?: number }) => apiRequest('/mechanisms/rooms', {
    method: 'POST',
    body: JSON.stringify(data)
});
export const updateMechanismRoom = (id: string, data: { name: string }) => apiRequest(`/mechanisms/rooms/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
});
export const deleteMechanismRoom = (id: string) => apiRequest(`/mechanisms/rooms/${id}`, {
    method: 'DELETE'
});
export const copyMechanismRoom = (data: { roomId: string; count: number }) => apiRequest('/mechanisms/rooms/copy', {
    method: 'POST',
    body: JSON.stringify(data)
});

export const upsertMechanismItem = (data: { roomId: string; name: string; quantity: number }) => apiRequest('/mechanisms/items', {
    method: 'POST',
    body: JSON.stringify(data)
});

export const generateMechanismProjectPDF = async (projectId: string) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/mechanisms/projects/${projectId}/pdf`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        }
    });

    if (!response.ok) throw new Error('Error generando PDF');
    return response.blob();
};
