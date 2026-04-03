import { request } from '../auth/authClient'

function getWorkspaceMembers({ workspaceId } = {}) {
  if (!workspaceId) {
    return Promise.reject(new Error('workspaceId is required'))
  }
  return request(`/api/member/${workspaceId}`, {
    method: 'GET',
  })
}

function inviteWorkspaceMember({ workspaceId, email, role } = {}) {
  if (!workspaceId || !email || !role) {
    return Promise.reject(new Error('workspaceId, email, and role are required'))
  }
  return request(`/api/member/invite/${workspaceId}`, {
    method: 'POST',
    data: {
      email,
      role,
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
