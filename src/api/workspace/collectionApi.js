import { request } from '../auth/authClient'

function getCollections({ workspaceId } = {}) {
  console.log(workspaceId)
  return request(`/api/collection/all-collections/${workspaceId}`, {
    method: 'GET',
  })
}

function createCollection(payload) {
  return request('/api/collection/create-collection', {
    method: 'POST',
    data: payload,
  })
}

function deleteCollection(collectionId) {
  return request(`/api/collection/delete-collection/${collectionId}`, {
    method: 'DELETE',
  })
}

export { createCollection, deleteCollection, getCollections }
