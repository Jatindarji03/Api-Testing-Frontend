import axios from 'axios'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'
let tokens = null
try {
  const storedToken = localStorage.getItem('token')
  const parsed = storedToken ? JSON.parse(storedToken) : null
  tokens = parsed?.token ?? parsed?.idToken ?? null
} catch {
  tokens = localStorage.getItem('token') || null
}
const authClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization':`Bearer ${tokens}`
  },
})

async function request(path, options = {}) {
  try {
    const response = await authClient({
      url: path,
      ...options,
    })

    const payload = response.data
    if (payload && payload.success === false) {
      const message =
        payload.message || 'Request failed. Please try again.'
      throw new Error(message)
    }

    return response.data
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Request failed. Please try again.'

    throw new Error(message)
  }
}

export { request }
