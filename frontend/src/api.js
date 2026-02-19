export const API_URL = import.meta.env.PROD ? '/api' : (import.meta.env.VITE_API_URL || 'http://localhost:3000/api');

export const apiRequest = async (endpoint, options = {}) => {
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
export const createUser = (data) => apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify(data)
});
export const updateUser = (id, data) => apiRequest(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
});
export const deleteUser = (id) => apiRequest(`/users/${id}`, {
    method: 'DELETE'
});

export const exportData = () => apiRequest('/admin/export', {
    method: 'GET'
});

export const importData = (data) => apiRequest('/admin/import', {
    method: 'POST',
    body: JSON.stringify(data)
});

// Mechanisms API
export const getMechanismProjects = () => apiRequest('/mechanisms/projects');
export const createMechanismProject = (data) => apiRequest('/mechanisms/projects', {
    method: 'POST',
    body: JSON.stringify(data)
});
export const updateMechanismProject = (id, data) => apiRequest(`/mechanisms/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
});
export const getMechanismProjectDetails = (id) => apiRequest(`/mechanisms/projects/${id}`);
export const deleteMechanismProject = (id) => apiRequest(`/mechanisms/projects/${id}`, {
    method: 'DELETE'
});

export const createMechanismRoom = (data) => apiRequest('/mechanisms/rooms', {
    method: 'POST',
    body: JSON.stringify(data)
});
export const updateMechanismRoom = (id, data) => apiRequest(`/mechanisms/rooms/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
});
export const deleteMechanismRoom = (id) => apiRequest(`/mechanisms/rooms/${id}`, {
    method: 'DELETE'
});
export const copyMechanismRoom = (data) => apiRequest('/mechanisms/rooms/copy', {
    method: 'POST',
    body: JSON.stringify(data)
});

export const upsertMechanismItem = (data) => apiRequest('/mechanisms/items', {
    method: 'POST',
    body: JSON.stringify(data)
});

export const generateMechanismProjectPDF = async (projectId) => {
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
