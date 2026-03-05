import axios from 'axios'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'
const token =JSON.parse(localStorage.getItem('token')) || null
let tokens = token?.token ?? token?.idToken ?? null;
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
