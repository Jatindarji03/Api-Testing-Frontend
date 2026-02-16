import { request } from './authClient'

function signIn(payload) {
  return request('/auth/signin', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export { signIn }
