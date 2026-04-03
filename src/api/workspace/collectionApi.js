import { request } from '../auth/authClient'

function getCollections({ workspaceId } = {}) {
 
  return request(`/api/collection/all-collections/${workspaceId}`, {
    method: 'GET',
  })
}

function createCollection(payload) {
  return request(`/api/collection/create-collection/${payload.projectId}`, {
    method: 'POST',
    data: payload,
  })
}

function deleteCollection(collectionId, projectId) {
  return request(
    `/api/collection/delete-collection/${collectionId}/${projectId}`,
    {
      method: 'DELETE',
    }
  )
}

export { createCollection, deleteCollection, getCollections }
