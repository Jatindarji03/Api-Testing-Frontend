function getStoredToken() {
  return localStorage.getItem('token')
}

function isAuthenticated() {
  return Boolean(getStoredToken())
}

function markAuthenticated() {
  localStorage.setItem('isAuthenticated', 'true')
}

function clearAuthState() {
  localStorage.removeItem('token')
  localStorage.removeItem('isAuthenticated')
}

export { clearAuthState, getStoredToken, isAuthenticated, markAuthenticated }
