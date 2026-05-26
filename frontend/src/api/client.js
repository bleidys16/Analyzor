import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Función para obtener el token CSRF del cookie
function getCookie(name) {
    let cookieValue = null
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';')
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim()
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1))
                break
            }
        }
    }
    return cookieValue
}

const client = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Permite enviar cookies
})

// Interceptor para agregar token CSRF y auth token
client.interceptors.request.use((config) => {
    // Agregar token de autenticación si existe
    const token = localStorage.getItem('auth_token')
    if (token) {
        config.headers.Authorization = `Token ${token}`
    }
    
    // Agregar token CSRF
    const csrftoken = getCookie('csrftoken')
    if (csrftoken) {
        config.headers['X-CSRFToken'] = csrftoken
    }
    
    return config
})

// Interceptor para manejar errores
client.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('auth_token')
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

export default client