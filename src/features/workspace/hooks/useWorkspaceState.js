import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createCollection,
  deleteCollection as deleteCollectionRequest,
} from '../../../api/workspace/collectionApi'
import {
  createApi as createApiRequest,
  deleteApi as deleteApiRequest,
} from '../../../api/workspace/apiApi'
import {
  createWorkspace as createWorkspaceRequest,
  deleteWorkspace as deleteWorkspaceRequest,
  updateWorkspace as updateWorkspaceRequest,
} from '../../../api/workspace/workspaceApi'
import {
  getWorkspaceMembers as getWorkspaceMembersRequest,
  inviteWorkspaceMember as inviteWorkspaceMemberRequest,
  updateWorkspaceMemberPermission as updateWorkspaceMemberPermissionRequest,
  removeWorkspaceMember as removeWorkspaceMemberRequest,
} from '../../../api/workspace/workspaceUserApi'
import {
  collectDescendantIds,
  getDefaultRequestHeaders,
  normalizeCollections,
  normalizeWorkspaces,
  resolveApiId,
  resolveCollectionId,
} from '../utils/workspaceDataHelpers'

const DEFAULT_MEMBER_PERMISSION = 'viewer'

const NEW_WORKSPACE_ID_KEYS = [


  (response) => response?.project?._id,

]

function resolveWorkspaceIdFromResponse(response) {
  if (!response || typeof response !== 'object') return ''
  for (const extractor of NEW_WORKSPACE_ID_KEYS) {
    const candidate = extractor(response)
    if (candidate) return String(candidate)
  }
  return ''
}

function normalizeWorkspaceMember(member = {}) {
  if (!member || typeof member !== 'object') return null
  const permission = (member.permission || member.role || DEFAULT_MEMBER_PERMISSION).toLowerCase()
  const id =
    member.id ||
    member._id ||
    member.memberId ||
    member.userId ||
    `${member.email || member.userEmail || 'member'}-${permission}-${Date.now()}`
  const userId =
    member.userId ||
    member.uid ||
    member.memberId ||
    member._id ||
    member.id ||
    null
  const email = member.email || member.userEmail || member.identifier || member.inviteeEmail || 'Unknown User'
  const status = member.status || member.inviteStatus || 'accepted'
  return {
    id,
    userId,
    email,
    permission,
    status,
    workspaceId: member.workspaceId || member.projectId || null,
    invitedBy: member.invitedBy || null,
  }
}

function extractMembersFromPayload(payload = {}) {
  if (!payload || typeof payload !== 'object') return []
  const candidateArrays = ['members', 'collaborators', 'users']
  for (const key of candidateArrays) {
    if (Array.isArray(payload[key])) return payload[key]
  }
  if (Array.isArray(payload.data)) return payload.data
  if (payload.data && typeof payload.data === 'object') {
    for (const key of candidateArrays) {
      if (Array.isArray(payload.data[key])) return payload.data[key]
    }
  }
  if (Array.isArray(payload.results)) return payload.results
  return []
}

function useWorkspaceState({
  seedWorkspaces,
  seedCollections,
  defaultWorkspaceId,
  userId,
  isLocked,
}) {
  const [workspaceList, setWorkspaceList] = useState(() =>
    normalizeWorkspaces(seedWorkspaces)
  )
  const [collectionList, setCollectionList] = useState(() =>
    normalizeCollections(seedCollections, defaultWorkspaceId)
  )
  const [selectedWorkspace, setSelectedWorkspace] = useState(defaultWorkspaceId)
  const [modalState, setModalState] = useState({
    type: null,
    name: '',
    description: '',
    method: 'GET',
    url: '',
    parentCollectionId: null,
    error: '',
  })
  const [isCreatingCollection, setIsCreatingCollection] = useState(false)
  const [workspaceMembers, setWorkspaceMembers] = useState({})
  const [isWorkspaceMembersLoading, setIsWorkspaceMembersLoading] = useState(false)

  useEffect(() => {
    setWorkspaceList(normalizeWorkspaces(seedWorkspaces))
  }, [seedWorkspaces])

  useEffect(() => {
    setCollectionList(normalizeCollections(seedCollections, defaultWorkspaceId))
  }, [seedCollections, defaultWorkspaceId])

  useEffect(() => {
    if (!workspaceList.length) {
      setSelectedWorkspace('')
      return
    }

    setSelectedWorkspace((previous) => {
      if (previous && workspaceList.some((workspace) => workspace.id === previous)) {
        return previous
      }
      return workspaceList[0].id
    })
  }, [workspaceList])

  const fetchWorkspaceMembers = useCallback(
    async (workspaceIdArg) => {
      const workspaceId = workspaceIdArg || selectedWorkspace
      if (!workspaceId) return []
      setIsWorkspaceMembersLoading(true)
      try {
        const response = await getWorkspaceMembersRequest({ workspaceId })
        const rawMembers = extractMembersFromPayload(response)
        const normalized = rawMembers
          .map(normalizeWorkspaceMember)
          .filter(Boolean)
        setWorkspaceMembers((prev) => ({
          ...prev,
          [workspaceId]: normalized,
        }))
        return normalized
      } catch {
        return []
      } finally {
        setIsWorkspaceMembersLoading(false)
      }
    },
    [selectedWorkspace]
  )

  const workspaceCollections = useMemo(
    () =>
      collectionList.filter(
        (collection) => collection.workspaceId === selectedWorkspace
      ),
    [collectionList, selectedWorkspace]
  )

  useEffect(() => {
    if (!selectedWorkspace) return
    void fetchWorkspaceMembers(selectedWorkspace)
  }, [selectedWorkspace, fetchWorkspaceMembers])

  const openModal = (type, parentCollectionId = null) => {
    if (isLocked) return
    setModalState({
      type,
      name: '',
      description: '',
      method: 'GET',
      url: '',
      parentCollectionId,
      error: '',
    })
  }

  const closeModal = () => {
    setModalState({
      type: null,
      name: '',
      description: '',
      method: 'GET',
      url: '',
      parentCollectionId: null,
      error: '',
    })
    setIsCreatingCollection(false)
  }

  const setModalField = (field, value) => {
    setModalState((prev) => ({ ...prev, [field]: value }))
  }

  const refreshWorkspaceMembers = useCallback(() => {
    if (!selectedWorkspace) return Promise.resolve([])
    return fetchWorkspaceMembers(selectedWorkspace)
  }, [fetchWorkspaceMembers, selectedWorkspace])

  const inviteWorkspaceMember = useCallback(
    async ({ email, permission } = {}) => {
      if (!selectedWorkspace || !email) {
        throw new Error('Select a workspace and provide an email.')
      }
      const normalizedPermission = (permission || DEFAULT_MEMBER_PERMISSION).toLowerCase()
      const response = await inviteWorkspaceMemberRequest({
        workspaceId: selectedWorkspace,
        email,
        permission: normalizedPermission,
      })
      const candidate =
        response?.member ||
        response?.data?.member ||
        response?.data ||
        (Array.isArray(response?.members) ? response.members[0] : null) ||
        null
      const normalizedMember =
        normalizeWorkspaceMember(candidate) || {
          id: `invite-${Date.now()}-${email}`,
          userId: null,
          email,
          permission: normalizedPermission,
          status: 'pending',
          workspaceId: selectedWorkspace,
        }
      setWorkspaceMembers((prev) => {
        const existing = prev[selectedWorkspace] || []
        const filtered = existing.filter((member) => member.id !== normalizedMember.id)
        return {
          ...prev,
          [selectedWorkspace]: [...filtered, normalizedMember],
        }
      })
      return normalizedMember
    },
    [selectedWorkspace]
  )

  const updateWorkspaceMemberPermission = useCallback(
    async ({ memberId, permission } = {}) => {
      if (!selectedWorkspace || !memberId || !permission) return null
      const normalizedPermission = permission.toLowerCase()
      const response = await updateWorkspaceMemberPermissionRequest({
        workspaceId: selectedWorkspace,
        memberId,
        permission: normalizedPermission,
      })
      const candidate =
        response?.member ||
        response?.data?.member ||
        response?.data ||
        null
      const payload = candidate || {}
      const normalizedMember =
        normalizeWorkspaceMember({
          ...payload,
          id: payload.id || memberId,
          permission: normalizedPermission,
        }) || {
          id: memberId,
          userId: payload.userId || payload.uid || null,
          email: payload.email || 'Unknown User',
          permission: normalizedPermission,
          status: 'accepted',
        }
      setWorkspaceMembers((prev) => {
        const existing = prev[selectedWorkspace] || []
        const filtered = existing.filter((member) => member.id !== memberId)
        return {
          ...prev,
          [selectedWorkspace]: [...filtered, normalizedMember],
        }
      })
      return normalizedMember
    },
    [selectedWorkspace]
  )

  const removeWorkspaceMember = useCallback(
    async (memberId) => {
      if (!selectedWorkspace || !memberId) return false
      await removeWorkspaceMemberRequest({
        workspaceId: selectedWorkspace,
        memberId,
      })
      setWorkspaceMembers((prev) => ({
        ...prev,
        [selectedWorkspace]: (prev[selectedWorkspace] || []).filter(
          (member) => member.id !== memberId
        ),
      }))
      return true
    },
    [selectedWorkspace]
  )

  const deleteWorkspace = async () => {
    if (isLocked || workspaceList.length <= 1) return
    const targetId = selectedWorkspace

    try {
      await deleteWorkspaceRequest(targetId)
    } catch {
      return
    }

    setWorkspaceList((prev) => {
      const next = prev.filter((workspace) => workspace.id !== targetId)
      setSelectedWorkspace(next[0]?.id || '')
      return next
    })

    setCollectionList((prev) =>
      prev.filter((collection) => collection.workspaceId !== targetId)
    )
  }

  const updateWorkspaceName = async (nextName) => {
    if (isLocked) return false
    const trimmedName = (nextName || '').trim()
    if (!trimmedName || !selectedWorkspace) return false

    const targetWorkspace = workspaceList.find(
      (workspace) => workspace.id === selectedWorkspace
    )
    if (!targetWorkspace) return false

    const previousName = targetWorkspace.name

    setWorkspaceList((prev) =>
      prev.map((workspace) =>
        workspace.id === selectedWorkspace
          ? {
            ...workspace,
            name: trimmedName,
            projectName: trimmedName,
          }
          : workspace
      )
    )

    try {
      await updateWorkspaceRequest(selectedWorkspace, {
        name: trimmedName,
        projectName: trimmedName,
      })
      return true
    } catch {
      setWorkspaceList((prev) =>
        prev.map((workspace) =>
          workspace.id === selectedWorkspace
            ? {
              ...workspace,
              name: previousName,
              projectName: previousName,
            }
            : workspace
        )
      )
      return false
    }
  }

  const deleteCollection = async (collectionId) => {
    if (isLocked) return
    const idsToDelete = collectDescendantIds(collectionList, collectionId)
    const idsInDeleteOrder = Array.from(idsToDelete).sort((a, b) => {
      const aRef = collectionList.find((collection) => collection.id === a)
      const bRef = collectionList.find((collection) => collection.id === b)
      const aHasParentInside = aRef && idsToDelete.has(aRef.parentCollectionId)
      const bHasParentInside = bRef && idsToDelete.has(bRef.parentCollectionId)
      if (aHasParentInside === bHasParentInside) return 0
      return aHasParentInside ? -1 : 1
    })

    try {
      await Promise.all(idsInDeleteOrder.map((id) => deleteCollectionRequest(id)))
    } catch {
      return
    }

    setCollectionList((prev) =>
      prev.filter((collection) => !idsToDelete.has(collection.id))
    )
  }

  const deleteApi = async (collectionId, apiId) => {
    if (isLocked) return

    try {
      await deleteApiRequest(apiId)
    } catch {
      return
    }

    setCollectionList((prev) =>
      prev.map((collection) => {
        if (collection.id !== collectionId) return collection
        return {
          ...collection,
          api: (collection.api || []).filter((apiItem) => apiItem.id !== apiId),
        }
      })
    )
  }

  const createEntity = async () => {
    const name = modalState.name.trim()
    const description = modalState.description.trim()

    if (!name) {
      setModalField('error', 'Name is required.')
      return false
    }

    if (modalState.type === 'workspace') {
      if (!userId) {
        setModalField('error', 'Unable to detect logged-in user. Please sign in again.')
        return false
      }

      const payload = { name, projectName: name, userId }
      try {
        const response = await createWorkspaceRequest(payload)
        const nextWorkspaceId =
          resolveWorkspaceIdFromResponse(response) || `ws-${Date.now()}`
        const nextWorkspace = {
          id: nextWorkspaceId,
          _id: nextWorkspaceId,
          name,
          projectName: name,
          userId: payload.userId,
        }
        setWorkspaceList((prev) => [...prev, nextWorkspace])
        setSelectedWorkspace(nextWorkspace.id)
        closeModal()
        return true
      } catch (error) {
        setModalField('error', error.message)
        return false
      }
    }

    if (modalState.type === 'collection') {
      const payload = {
        name,
        collectionName: name,
        workspaceId: selectedWorkspace,
        projectId: selectedWorkspace,
        parentCollectionId: modalState.parentCollectionId ?? null,
        description,
        collectionDescription: description,
        envVariable: [],
      }

      try {
        setIsCreatingCollection(true)
        setModalField('error', '')
        const response = await createCollection(payload)
        const nextCollectionId = resolveCollectionId(response)
        const nextCollection = {
          id: nextCollectionId,
          _id: nextCollectionId,
          name: payload.name,
          collectionName: payload.name,
          workspaceId: payload.workspaceId,
          projectId: payload.workspaceId,
          parentCollectionId: payload.parentCollectionId,
          description: payload.description,
          collectionDescription: payload.description,
          api: [],
        }
        setCollectionList((prev) => [...prev, nextCollection])
        closeModal()
        return true
      } catch (error) {
        setModalField('error', error.message)
        return false
      } finally {
        setIsCreatingCollection(false)
      }
    }

    if (modalState.type === 'api') {
      if (!selectedWorkspace) {
        setModalField('error', 'Select a workspace before creating an API request.')
        return false
      }
      if (!modalState.parentCollectionId) {
        setModalField('error', 'Choose a collection before creating an API request.')
        return false
      }

      const payload = {
        name,
        apiName: name,
        method: (modalState.method || 'GET').toUpperCase(),
        url: modalState.url.trim(),
        apiUrl: modalState.url.trim(),
        collectionId: modalState.parentCollectionId,
        workspaceId: selectedWorkspace,
        projectId: selectedWorkspace,
      }

      try {
        setIsCreatingCollection(true)
        setModalField('error', '')
        const response = await createApiRequest(payload)
        const nextApiId = resolveApiId(response)
        const defaultHeaders = getDefaultRequestHeaders()
        const nextApi = {
          id: nextApiId,
          _id: nextApiId,
          name: payload.name,
          apiName: payload.name,
          method: payload.method,
          url: payload.url,
          apiUrl: payload.url,
          collectionId: payload.collectionId,
          workspaceId: payload.workspaceId,
          headers: defaultHeaders,
          header: defaultHeaders.map((header) => ({ ...header })),
          params: [{ key: '', value: '', enabled: true }],
          bodyType: 'none',
          body: '',
          authType: 'none',
          authToken: '',
          authUsername: '',
          authPassword: '',
          preRequestScript: '',
          postResponseScript: '',
          vars: [{ key: 'baseUrl', value: '', enabled: true }],
          variables: [{ key: 'baseUrl', value: '', enabled: true }],
          envVariable: [{ key: 'baseUrl', value: '', enabled: true }],
        }

        setCollectionList((prev) =>
          prev.map((collection) => {
            if (collection.id !== payload.collectionId) return collection
            return {
              ...collection,
              api: [...(collection.api || []), nextApi],
            }
          })
        )
        closeModal()
        return true
      } catch (error) {
        setModalField('error', error.message)
        return false
      } finally {
        setIsCreatingCollection(false)
      }
    }

    return false
  }

  const workspaceMembersForSelected = workspaceMembers[selectedWorkspace] || []
  const currentUserWorkspaceEntry = workspaceMembersForSelected.find(
    (member) => member.userId && userId && member.userId === userId
  )
  const workspaceMeta =
    workspaceList.find((workspace) => workspace.id === selectedWorkspace) || null
  const currentUserPermission =
    currentUserWorkspaceEntry?.permission ||
    workspaceMeta?.permission ||
    'owner'
  const canInviteWorkspaceMembers = ['owner', 'admin'].includes(currentUserPermission)

  return {
    workspaceList,
    selectedWorkspace,
    setSelectedWorkspace,
    workspaceCollections,
    modalState,
    isCreatingCollection,
    openModal,
    closeModal,
    setModalField,
    createEntity,
    deleteWorkspace,
    deleteCollection,
    deleteApi,
    updateWorkspaceName,
    workspaceMembers,
    workspaceMembersForSelected,
    isWorkspaceMembersLoading,
    refreshWorkspaceMembers,
    inviteWorkspaceMember,
    updateWorkspaceMemberPermission,
    removeWorkspaceMember,
    canInviteWorkspaceMembers,
    currentUserPermission,
  }
}

export { useWorkspaceState }
