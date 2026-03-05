import { request } from '../auth/authClient'

const USE_DUMMY_API_RESPONSES = true

const DUMMY_APIS = [
  {
    _id: 'api-101',
    collectionid: '69a7c1cdc694f3fbb453a2de',
    apiName: 'Get Users',
    apiUrl: 'https://jsonplaceholder.typicode.com/users',
    method: 'GET',
    params: [
      {
        key: 'limit',
        value: '10',
      },
    ],
    header: [
      {
        key: 'Accept',
        value: 'application/json',
      },
    ],
    body: '',
    bodyType: 'none',
    createdAt: '2026-03-04T00:00:00.000Z',
  },
  {
    _id: 'api-102',
    collectionid: '69a7c1cdc694f3fbb453a2de',
    apiName: 'Create Post',
    apiUrl: 'https://jsonplaceholder.typicode.com/posts',
    method: 'POST',
    params: [],
    header: [
      {
        key: 'Content-Type',
        value: 'application/json',
      },
    ],
    body: '{"title":"foo","body":"bar","userId":1}',
    bodyType: 'raw',
    createdAt: '2026-03-04T00:00:00.000Z',
  },
]

function getApis({ collectionId, workspaceId } = {}) {
  const path = workspaceId
    ? `/api/api/all-apis/${workspaceId}`
    : '/api/api/all-apis'

  if (USE_DUMMY_API_RESPONSES) {
    const apis = DUMMY_APIS.filter((apiItem) => {
      if (collectionId && apiItem.collectionid !== collectionId) return false
      return true
    })

    return Promise.resolve({
      success: true,
      message: 'Dummy getApis response from apiApi.js',
      apis,
    })
  }

  return request(path, {
    method: 'GET',
    params: {
      ...(collectionId ? { collectionId } : {}),
      ...(workspaceId ? { workspaceId } : {}),
    },
  })
}

function createApi(payload) {
  if (USE_DUMMY_API_RESPONSES) {
    const generatedId = `api-${Date.now()}`
    const nowIso = new Date().toISOString()

    const api = {
      _id: generatedId,
      collectionid: payload?.collectionId || payload?.collectionid || '',
      apiName: payload?.apiName || payload?.name || 'Untitled API',
      apiUrl: payload?.apiUrl || payload?.url || '',
      method: (payload?.method || 'GET').toUpperCase(),
      params: payload?.params || [],
      header: payload?.header || payload?.headers || [],
      body: payload?.body ?? '',
      bodyType: payload?.bodyType || 'raw',
      createdAt: nowIso,
    }

    return Promise.resolve({
      success: true,
      message: 'Dummy createApi response from apiApi.js',
      api,
    })
  }

  return request('/api/api/create-api', {
    method: 'POST',
    data: payload,
  })
}

function deleteApi(apiId) {
  if (USE_DUMMY_API_RESPONSES) {
    return Promise.resolve({
      success: true,
      message: 'Dummy deleteApi response from apiApi.js',
      api: {
        _id: apiId,
      },
    })
  }

  return request(`/api/api/delete-api/${apiId}`, {
    method: 'DELETE',
  })
}

export { createApi, deleteApi, getApis }
