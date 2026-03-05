import { useEffect, useMemo, useState } from 'react'
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
  collectDescendantIds,
  getDefaultRequestHeaders,
  normalizeCollections,
  normalizeWorkspaces,
  resolveApiId,
  resolveCollectionId,
} from '../utils/workspaceDataHelpers'

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

  const workspaceCollections = useMemo(
    () =>
      collectionList.filter(
        (collection) => collection.workspaceId === selectedWorkspace
      ),
    [collectionList, selectedWorkspace]
  )

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
          response?.workspace?.id ??
          response?.workspace?._id ??
          response?.data?.workspace?.id ??
          response?.data?.workspace?._id ??
          response?.id ??
          response?._id ??
          response?.data?.id ??
          response?.data?._id ??
          `ws-${Date.now()}`
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
  }
}

export { useWorkspaceState }
