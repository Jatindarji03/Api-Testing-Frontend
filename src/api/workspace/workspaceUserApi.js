import { request } from '../auth/authClient'

function getWorkspaceMembers({ workspaceId } = {}) {
  if (!workspaceId) {
    return Promise.reject(new Error('workspaceId is required'))
  }
  return request(`/api/project/${workspaceId}/members`, {
    method: 'GET',
  })
}

function inviteWorkspaceMember({ workspaceId, email, permission } = {}) {
  if (!workspaceId || !email) {
    return Promise.reject(new Error('workspaceId and email are required'))
  }
  return request(`/api/project/${workspaceId}/invite`, {
    method: 'POST',
    data: {
      email,
      permission,
    },
  })
}

function updateWorkspaceMemberPermission({ workspaceId, memberId, permission } = {}) {
  if (!workspaceId || !memberId || !permission) {
    return Promise.reject(new Error('workspaceId, memberId, and permission are required'))
  }
  return request(`/api/project/${workspaceId}/members/${memberId}`, {
    method: 'PATCH',
    data: { permission },
  })
}

function removeWorkspaceMember({ workspaceId, memberId } = {}) {
  if (!workspaceId || !memberId) {
    return Promise.reject(new Error('workspaceId and memberId are required'))
  }
  return request(`/api/project/${workspaceId}/members/${memberId}`, {
    method: 'DELETE',
  })
}

export {
  getWorkspaceMembers,
  inviteWorkspaceMember,
  updateWorkspaceMemberPermission,
  removeWorkspaceMember,
}
