import { request } from '../auth/authClient'

function getWorkspaces() {
  
  return request('/api/project/all-projects', {
    method: 'GET',
  })
}

function createWorkspace(payload) {

  return request('/api/project/create-project', {
    method: 'POST',
    data: payload,
  })
}

function deleteWorkspace(workspaceId) {
  return request(`/api/project/delete-project/${workspaceId}`, {
    method: 'DELETE',
  })
}

function updateWorkspace(workspaceId, payload) {
  return request(`/api/project/update-project/${workspaceId}`, {
    method: 'PATCH',
    data: payload,
  })
}

export { createWorkspace, deleteWorkspace, getWorkspaces, updateWorkspace }
