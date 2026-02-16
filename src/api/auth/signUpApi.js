import { request } from './authClient'

function signUp(payload) {
  return request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export { signUp }
