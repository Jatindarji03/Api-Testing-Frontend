import { request } from '../auth/authClient'

const USE_DUMMY_API_RESPONSES =
  (import.meta.env.VITE_USE_DUMMY_API_RESPONSES ?? 'false') === 'true'

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

function getApis({ collectionId } = {}) {
  const path = `/api/request/collection/get-request/${collectionId}`

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
    
  })
}

function getRequestById({ requestId } = {}) {
  const targetId = requestId
  if (!targetId) {
    return Promise.reject(new Error('requestId is required'))
  }

  const path = `/api/request/get-request/${targetId}`

  if (USE_DUMMY_API_RESPONSES) {
    const matchedApi = DUMMY_APIS.find((apiItem) => apiItem._id === targetId)
    return Promise.resolve({
      success: true,
      message: 'Dummy getRequestById response from apiApi.js',
      request: matchedApi,
    })
  }

  return request(path, {
    method: 'GET',
  })
}

function createApi(payload) {
  const generatedId = `api-${Date.now()}`
    const nowIso = new Date().toISOString()
    console.log(payload)
    const api = {
      _id: generatedId,
      collectionId: payload?.collectionId || payload?.collectionid || '',
      apiName: payload?.apiName || payload?.name || 'Untitled API',
      apiUrl: payload?.apiUrl || payload?.url || '',
      method: (payload?.method || 'GET').toUpperCase(),
      params: payload?.params || [],
      header: payload?.header || payload?.headers || [],
      body: payload?.body ?? '',
      bodyType: payload?.bodyType ?? 'json',
      createdAt: nowIso,
    }

  if (USE_DUMMY_API_RESPONSES) {
    
    return Promise.resolve({
      success: true,
      message: 'Dummy createApi response from apiApi.js',
      api,
    })
  }
console.log(api)
  return request('api/request/save-request', {
    method: 'POST',
    data: api,
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

  return request(`/api/request/delete-request/${apiId}`, {
    method: 'DELETE',
  })
}

function updateApi(apiId, payload) {
  if (USE_DUMMY_API_RESPONSES) {
    const targetIndex = DUMMY_APIS.findIndex((apiItem) => apiItem._id === apiId)

    const updatedApi = {
      _id: apiId,
      ...(targetIndex >= 0 ? DUMMY_APIS[targetIndex] : {}),
      ...payload,
    }

    if (targetIndex >= 0) {
      DUMMY_APIS[targetIndex] = updatedApi
    } else {
      DUMMY_APIS.push(updatedApi)
    }

    return Promise.resolve({
      success: true,
      message: 'Dummy updateApi response from apiApi.js',
      api: updatedApi,
    })
  }

  return request(`/api/request/update-request/${apiId}`, {
    method: 'PATCH',
    data: payload,
  })
}

export { createApi, deleteApi, getApis, getRequestById, updateApi }
