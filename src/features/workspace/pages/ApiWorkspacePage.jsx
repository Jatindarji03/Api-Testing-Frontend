import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import CollectionsSidebar from '../components/CollectionsSidebar'
import CreateEntityModal from '../components/CreateEntityModal'
import RequestPanel from '../components/RequestPanel'
import ResponsePanel from '../components/ResponsePanel'
import WorkspaceNavbar from '../components/WorkspaceNavbar'
import { useRequestTabs } from '../hooks/useRequestTabs'
import { useWorkspaceState } from '../hooks/useWorkspaceState'
import { requestTabs, responseTabs } from '../data/workspaceUiConstants'
import { clearAuthState, isAuthenticated } from '../../../utils/auth'
import { useUser } from '../../../context/useUser'
import { getWorkspaces } from '../../../api/workspace/workspaceApi'
import { getCollections } from '../../../api/workspace/collectionApi'
import { getApis, getRequestById, updateApi } from '../../../api/workspace/apiApi'
import { getDefaultRequestHeaders } from '../utils/workspaceDataHelpers'

const DEFAULT_RESPONSE_TEXT = 'Send a request to view the response.'
const DEFAULT_RESPONSE_META = {
  statusLabel: 'Ready',
  durationLabel: '--',
  sizeLabel: '--',
}
const IMPORTANT_RESPONSE_HEADER_KEYS = [
  'content-type',
  'content-length',
  'date',
  'server',
  'cache-control',
  'etag',
]
const DEFAULT_RESPONSE_HEADERS = IMPORTANT_RESPONSE_HEADER_KEYS.map((key) => ({
  key,
  value: '--',
}))
const createGuestRequest = () => ({
  id: 'guest-request',
  name: 'Quick Request',
  method: 'GET',
  url: '',
  apiUrl: '',
  headers: getDefaultRequestHeaders(),
  header: getDefaultRequestHeaders(),
  params: [{ key: '', value: '', enabled: true }],
  bodyType: 'none',
  body: '',
  bodyFormData: [],
  formData: [],
  bodyUrlEncoded: [],
  urlEncoded: [],
  formParams: [],
  formUrlEncoded: [],
  authType: 'none',
  authToken: '',
  authUsername: '',
  authPassword: '',
  preRequestScript: '',
  postResponseScript: '',
  vars: [{ key: 'baseUrl', value: '', enabled: true }],
  variables: [{ key: 'baseUrl', value: '', enabled: true }],
  envVariable: [{ key: 'baseUrl', value: '', enabled: true }],
})

function buildRequestUrl(rawUrl, params = []) {
  if (!rawUrl) return ''

  const isAbsolute = /^https?:\/\//i.test(rawUrl)
  const base = isAbsolute ? undefined : window.location.origin
  const url = new URL(rawUrl, base)

  params.forEach((param) => {
    const key = param?.name || param?.key
    const value = param?.value
    const enabled = param?.enabled ?? true
    if (!enabled || !key) return
    url.searchParams.set(key, value ?? '')
  })

  return url.toString()
}

function formatBody(body) {
  if (body == null || body === '') return undefined
  if (typeof body === 'string') return body
  try {
    return JSON.stringify(body)
  } catch {
    return undefined
  }
}

function parseBodyText(bodyText) {
  if (!bodyText) return ''
  try {
    return JSON.stringify(JSON.parse(bodyText), null, 2)
  } catch {
    return bodyText
  }
}

function normalizeKeyValueRows(rows = []) {
  if (!Array.isArray(rows)) return []
  return rows.map((item) => ({
    key: item?.key || item?.name || '',
    value: item?.value ?? '',
    enabled: item?.enabled ?? true,
    type: item?.type === 'file' ? 'file' : 'text',
    fileName: item?.fileName || item?.file?.name || '',
    file: item?.file || null,
  }))
}

function getActiveKeyValueRows(rows = []) {
  return normalizeKeyValueRows(rows).filter(
    (row) => (row.enabled ?? true) && Boolean(row.key)
  )
}

function sanitizeFormDataRows(rows = []) {
  return rows.map((row) => {
    const type = row?.type === 'file' ? 'file' : 'text'
    const value =
      type === 'file'
        ? row?.fileName || row?.value || ''
        : row?.value ?? ''
    const sanitized = {
      key: row?.key || '',
      value,
      enabled: row?.enabled ?? true,
      type,
    }
    if (type === 'file' && (row?.fileName || row?.value)) {
      sanitized.fileName = row?.fileName || row?.value
    }
    return sanitized
  })
}

function buildRequestBody(requestData) {
  if (!requestData) return undefined
  const type = (requestData.bodyType || 'none').toLowerCase()
  if (type === 'none') return undefined

  if (type === 'form-data') {
    const rows = getActiveKeyValueRows(
      requestData.bodyFormData ||
        requestData.formData ||
        requestData.formdata ||
        []
    )
    if (!rows.length) return undefined
    const formData = new FormData()
    rows.forEach(({ key, value, type, file, fileName }) => {
      if (type === 'file') {
        const payloadValue =
          file instanceof File ? file : fileName || value || ''
        formData.append(key, payloadValue)
        return
      }
      formData.append(key, value ?? '')
    })
    return formData
  }

  if (type === 'x-www-form-urlencoded') {
    const rows = getActiveKeyValueRows(
      requestData.bodyUrlEncoded ||
        requestData.urlEncoded ||
        requestData.formParams ||
        requestData.formUrlEncoded ||
        []
    )
    if (!rows.length) return undefined
    const params = new URLSearchParams()
    rows.forEach(({ key, value }) => {
      params.append(key, value ?? '')
    })
    return params.toString()
  }

  return formatBody(requestData.body)
}

function normalizeRequestItem(apiItem) {
  if (!apiItem || typeof apiItem !== 'object') return null

  const headers = normalizeKeyValueRows(apiItem.headers || apiItem.header || [])
  const normalizedHeaders = headers.length ? headers : getDefaultRequestHeaders()
  const params = normalizeKeyValueRows(apiItem.params || [])
  const vars = normalizeKeyValueRows(
    apiItem.vars || apiItem.variables || apiItem.envVariable || []
  )
  const normalizedVars =
    vars.length > 0
      ? vars
      : [{ key: 'baseUrl', value: '', enabled: true }]
  const formDataRows = sanitizeFormDataRows(
    normalizeKeyValueRows(
      apiItem.bodyFormData || apiItem.formData || apiItem.formdata || []
    )
  )
  const urlEncodedRows = normalizeKeyValueRows(
    apiItem.bodyUrlEncoded ||
      apiItem.urlEncoded ||
      apiItem.formParams ||
      apiItem.formUrlEncoded ||
      []
  )

  return {
    ...apiItem,
    id: apiItem.id || apiItem._id || `api-${Date.now()}`,
    _id: apiItem._id || apiItem.id || `api-${Date.now()}`,
    name: apiItem.name || apiItem.apiName || 'Untitled API',
    apiName: apiItem.apiName || apiItem.name || 'Untitled API',
    method: (apiItem.method || 'GET').toUpperCase(),
    url: apiItem.url || apiItem.apiUrl || '',
    apiUrl: apiItem.apiUrl || apiItem.url || '',
    headers: normalizedHeaders,
    header: normalizedHeaders,
    params,
    bodyType: apiItem.bodyType || 'none',
    body: apiItem.body ?? '',
    bodyFormData: formDataRows,
    formData: formDataRows,
    formdata: formDataRows,
    bodyUrlEncoded: urlEncodedRows,
    urlEncoded: urlEncodedRows,
    urlencoded: urlEncodedRows,
    formParams: urlEncodedRows,
    formUrlEncoded: urlEncodedRows,
    authType: apiItem.authType || apiItem.auth?.type || 'none',
    authToken: apiItem.authToken || apiItem.auth?.token || '',
    authUsername: apiItem.authUsername || apiItem.auth?.username || '',
    authPassword: apiItem.authPassword || apiItem.auth?.password || '',
    preRequestScript: apiItem.preRequestScript || apiItem.script?.preRequest || '',
    postResponseScript: apiItem.postResponseScript || apiItem.script?.postResponse || '',
    vars: normalizedVars,
    variables: normalizedVars,
    envVariable: normalizedVars,
    script: apiItem.script || {},
    collectionId: apiItem.collectionId || apiItem.collectionid || '',
    collectionid: apiItem.collectionId || apiItem.collectionid || '',
    workspaceId: apiItem.workspaceId || apiItem.projectId || '',
    projectId: apiItem.projectId || apiItem.workspaceId || '',
  }
}

function extractRequestDetail(payload) {
  if (!payload || typeof payload !== 'object') return null

  const candidates = [
    payload.request,
    payload.data?.request,
    payload.api,
    payload.data?.api,
    payload.data,
    payload,
  ]

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object') {
      const id = candidate.id || candidate._id
      if (id) return candidate
    }
  }

  return null
}

function formatBytes(byteLength) {
  if (!Number.isFinite(byteLength) || byteLength < 0) return '--'
  if (byteLength < 1024) return `${byteLength}B`
  if (byteLength < 1024 * 1024) return `${(byteLength / 1024).toFixed(2)}KB`
  return `${(byteLength / (1024 * 1024)).toFixed(2)}MB`
}

function extractImportantResponseHeaders(response) {
  return IMPORTANT_RESPONSE_HEADER_KEYS.map((key) => ({
    key,
    value: response.headers.get(key) || '--',
  }))
}

function extractList(payload, keys = []) {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []

  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key]
  }

  if (Array.isArray(payload.data)) return payload.data
  if (Array.isArray(payload.items)) return payload.items
  if (Array.isArray(payload.results)) return payload.results

  if (payload.data && typeof payload.data === 'object') {
    for (const key of keys) {
      if (Array.isArray(payload.data[key])) return payload.data[key]
    }
  }

  return []
}

function mergeApisIntoCollections(rawCollections, rawApis) {
  const apisByCollectionId = new Map()

  rawApis.forEach((apiItem) => {
    const collectionId = apiItem.collectionId || apiItem.collectionid
    if (!collectionId) return

    const bucket = apisByCollectionId.get(collectionId) || []
    bucket.push(apiItem)
    apisByCollectionId.set(collectionId, bucket)
  })

  return rawCollections.map((collection) => {
    if (Array.isArray(collection.api) && collection.api.length > 0) {
      return collection
    }

    const collectionId = collection._id || collection.id
    return {
      ...collection,
      api: apisByCollectionId.get(collectionId) || [],
    }
  })
}

function ApiWorkspacePage() {
  const truncateRequestName = (name) => {
    if (!name) return ''
    return name.length > 12 ? `${name.slice(0, 12)}…` : name
  }

  const navigate = useNavigate()
  const { userId, setUser } = useUser()
  const isLocked = !isAuthenticated()
  const [seedWorkspaces, setSeedWorkspaces] = useState([])
  const [seedCollections, setSeedCollections] = useState([])
  const [responseText, setResponseText] = useState(DEFAULT_RESPONSE_TEXT)
  const [responseMeta, setResponseMeta] = useState(DEFAULT_RESPONSE_META)
  const [responseHeaders, setResponseHeaders] = useState(DEFAULT_RESPONSE_HEADERS)
  const [isSendingRequest, setIsSendingRequest] = useState(false)
  const [isSavingRequest, setIsSavingRequest] = useState(false)
  const [dirtyRequestIds, setDirtyRequestIds] = useState(() => new Set())
  const [saveNotice, setSaveNotice] = useState(null)
  const [guestRequest, setGuestRequest] = useState(createGuestRequest)
  const saveNoticeTimeoutRef = useRef(null)
  const {
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
  } = useWorkspaceState({
    seedWorkspaces,
    seedCollections,
    defaultWorkspaceId: '',
    userId,
    isLocked,
  })

  const workspaceListQuery = useQuery({
    queryKey: ['workspace-list', userId],
    enabled: !isLocked,
    queryFn: () => getWorkspaces({ userId: userId || undefined }),
    select: (payload) => extractList(payload, ['workspaces', 'projects']),
    staleTime:4*60*1000,
    refetchOnWindowFocus:false
  })
  const queriedWorkspaces = useMemo(
    () => (isLocked ? [] : workspaceListQuery.data || []),
    [isLocked, workspaceListQuery.data]
  )
  const effectiveWorkspaceId =
    selectedWorkspace ||
    queriedWorkspaces[0]?.id ||
    queriedWorkspaces[0]?._id ||
    ''
  const collectionsQuery = useQuery({
    queryKey: ['workspace-collections', effectiveWorkspaceId],
    enabled: !isLocked && Boolean(effectiveWorkspaceId),
    queryFn: async () => {
      const collectionsResponse = await getCollections({
        workspaceId: effectiveWorkspaceId,
      })
      const collections = extractList(collectionsResponse, ['collections'])
      const collectionIds = collections
        .map((collection) => collection.id || collection._id)
        .filter(Boolean)

      const apisByCollection = await Promise.all(
        collectionIds.map(async (collectionId) => {
          try {
            const apisResponse = await getApis({ collectionId })
            return extractList(apisResponse, ['apis', 'requests', 'request'])
          } catch {
            return []
          }
        })
      )

      const apis = apisByCollection.flat()
      return mergeApisIntoCollections(collections, apis)
    },
  })
  const queriedCollections = useMemo(
    () => (isLocked ? [] : collectionsQuery.data || []),
    [isLocked, collectionsQuery.data]
  )
  const isLoadingData =
    !isLocked &&
    (workspaceListQuery.isPending ||
      (Boolean(effectiveWorkspaceId) && collectionsQuery.isPending))
  const loadError =
    workspaceListQuery.error?.message || collectionsQuery.error?.message || ''

  useEffect(() => {
    setSeedWorkspaces(queriedWorkspaces)
  }, [queriedWorkspaces])

  useEffect(() => {
    setSeedCollections(queriedCollections)
  }, [queriedCollections])

  const {
    activeRequest,
    setActiveRequest,
    updateActiveRequest,
    openRequestTabs,
    activeRequestTab,
    setActiveRequestTab,
    activeResponseTab,
    setActiveResponseTab,
    selectRequest,
    closeRequestTab,
  } = useRequestTabs({
    workspaceCollections,
    defaultRequestTab: requestTabs[0],
    defaultResponseTab: responseTabs[0],
  })

  const handleSignInSuggestion = () => navigate('/signin')
  const handleLogout = () => {
    clearAuthState()
    setUser(null)
    navigate('/signin', { replace: true })
  }

  const handleSubmitModal = async (event) => {
    event.preventDefault()
    await createEntity()
  }

  const handleRequestChange = (updater) => {
    if (!activeRequest) {
      setGuestRequest((current) => {
        if (!current) return current
        if (typeof updater === 'function') return updater(current)
        return {
          ...current,
          ...updater,
        }
      })
      return
    }

    updateActiveRequest((current) => {
      if (!current) return current
      if (typeof updater === 'function') return updater(current)
      return {
        ...current,
        ...updater,
      }
    })

    if (activeRequest?.id) {
      setDirtyRequestIds((previous) => {
        const next = new Set(previous)
        next.add(activeRequest.id)
        return next
      })
    }
  }

  const showSaveNotice = useCallback((message, tone = 'info', timeoutMs = 2200) => {
    if (saveNoticeTimeoutRef.current) {
      clearTimeout(saveNoticeTimeoutRef.current)
      saveNoticeTimeoutRef.current = null
    }

    setSaveNotice({ message, tone })

    if (timeoutMs > 0) {
      saveNoticeTimeoutRef.current = setTimeout(() => {
        setSaveNotice(null)
        saveNoticeTimeoutRef.current = null
      }, timeoutMs)
    }
  }, [])

  const findCollectionById = useCallback(
    (id) =>
      workspaceCollections.find(
        (collection) => collection.id === id || collection._id === id
      ),
    [workspaceCollections]
  )

  const handleDeleteCollection = useCallback(
    async (collectionId) => {
      if (!collectionId) return
      const confirmed = window.confirm('Are you sure?')
      if (!confirmed) return
      const collection = findCollectionById(collectionId)
      await deleteCollection(collectionId)
      showSaveNotice(`${collection?.name || 'Collection'} deleted.`, 'success')
    },
    [deleteCollection, findCollectionById, showSaveNotice]
  )

  const findApiById = useCallback(
    (collectionId, apiId) => {
      if (!collectionId || !apiId) return null
      const collection = findCollectionById(collectionId)
      if (!collection) return null
      return (collection.api || []).find(
        (apiItem) => apiItem.id === apiId || apiItem._id === apiId
      )
    },
    [findCollectionById]
  )

  const handleDeleteApi = useCallback(
    async (collectionId, apiId) => {
      if (!collectionId || !apiId) return
      const confirmed = window.confirm('Are you sure?')
      if (!confirmed) return
      const apiItem = findApiById(collectionId, apiId)
      await deleteApi(collectionId, apiId)
      showSaveNotice(`${apiItem?.name || 'API request'} deleted.`, 'success')
    },
    [deleteApi, findApiById, showSaveNotice]
  )

  const handleDeleteWorkspace = useCallback(async () => {
    if (!selectedWorkspace) return
    const confirmed = window.confirm('Are you sure?')
    if (!confirmed) return
    const workspace = workspaceList.find(
      (workspaceItem) => workspaceItem.id === selectedWorkspace
    )
    await deleteWorkspace()
    showSaveNotice(`${workspace?.name || 'Workspace'} deleted.`, 'success')
  }, [deleteWorkspace, selectedWorkspace, showSaveNotice, workspaceList])

  const handleSaveActiveRequest = useCallback(async () => {
    if (isLocked) {
      showSaveNotice('Sign in to save API requests.', 'error')
      return
    }

    const requestData = activeRequest || guestRequest
    const requestId = requestData?.id

    if (!requestId || requestId === 'guest-request') {
      showSaveNotice('Select a saved API tab to persist changes.', 'error')
      return
    }

    if (!dirtyRequestIds.has(requestId)) {
      showSaveNotice('No changes to save.', 'info')
      return
    }

    if (isSavingRequest) return

  const headers = normalizeKeyValueRows(requestData.headers || requestData.header || [])
  const params = normalizeKeyValueRows(requestData.params || [])
  const vars = normalizeKeyValueRows(
    requestData.vars || requestData.variables || requestData.envVariable || []
  )
    const apiUrl = requestData.url || requestData.apiUrl || ''
    const collectionId = requestData.collectionId || requestData.collectionid || ''
    const workspaceId =
      selectedWorkspace || requestData.workspaceId || requestData.projectId || ''
    const savedFormDataRows =
      requestData.bodyFormData || requestData.formData || requestData.formdata || []
    const savedUrlEncodedRows =
      requestData.bodyUrlEncoded ||
      requestData.urlEncoded ||
      requestData.formParams ||
      requestData.formUrlEncoded ||
      requestData.urlencoded ||
      []
    const persistedFormDataRows = sanitizeFormDataRows(savedFormDataRows)

    const payload = {
      name: requestData.name || requestData.apiName || 'Untitled API',
      apiName: requestData.name || requestData.apiName || 'Untitled API',
      method: (requestData.method || 'GET').toUpperCase(),
      url: apiUrl,
      apiUrl,
      collectionId,
      collectionid: collectionId,
      workspaceId,
      projectId: workspaceId,
      params,
      header: headers,
      headers,
      bodyType: requestData.bodyType || 'none',
      body: requestData.body ?? '',
      bodyFormData: persistedFormDataRows,
      formData: persistedFormDataRows,
      formdata: persistedFormDataRows,
      bodyUrlEncoded: savedUrlEncodedRows,
      urlEncoded: savedUrlEncodedRows,
      urlencoded: savedUrlEncodedRows,
      formParams: savedUrlEncodedRows,
      formUrlEncoded: savedUrlEncodedRows,
      authType: requestData.authType || requestData.auth?.type || 'none',
      authToken: requestData.authToken || requestData.auth?.token || '',
      authUsername: requestData.authUsername || requestData.auth?.username || '',
      authPassword: requestData.authPassword || requestData.auth?.password || '',
      preRequestScript:
        requestData.preRequestScript || requestData.script?.preRequest || '',
      postResponseScript:
        requestData.postResponseScript || requestData.script?.postResponse || '',
      vars,
      variables: vars,
      envVariable: vars,
    }

    setIsSavingRequest(true)
    showSaveNotice('Saving API...', 'info', 0)

    try {
      await updateApi(requestId, payload)
      const normalizedCollectionId =
        collectionId || requestData.collectionId || requestData.collectionid || ''
      const normalizedApiUrl = apiUrl
      const nextApiData = {
        ...requestData,
        id: requestId,
        _id: requestId,
        name: requestData.name || requestData.apiName || 'Untitled API',
        apiName: requestData.name || requestData.apiName || 'Untitled API',
        method: (requestData.method || 'GET').toUpperCase(),
        url: normalizedApiUrl,
        apiUrl: normalizedApiUrl,
        collectionId: normalizedCollectionId,
        collectionid: normalizedCollectionId,
        workspaceId:
          requestData.workspaceId || requestData.projectId || selectedWorkspace,
        projectId:
          requestData.projectId || requestData.workspaceId || selectedWorkspace,
        headers,
        header: headers,
        params,
        vars,
        variables: vars,
        envVariable: vars,
        bodyType: requestData.bodyType || 'none',
        body: requestData.body ?? '',
        bodyFormData: persistedFormDataRows,
        formData: persistedFormDataRows,
        formdata: persistedFormDataRows,
        bodyUrlEncoded: savedUrlEncodedRows,
        urlEncoded: savedUrlEncodedRows,
        urlencoded: savedUrlEncodedRows,
        formParams: savedUrlEncodedRows,
        formUrlEncoded: savedUrlEncodedRows,
        authType: requestData.authType || requestData.auth?.type || 'none',
        authToken: requestData.authToken || requestData.auth?.token || '',
        authUsername: requestData.authUsername || requestData.auth?.username || '',
        authPassword: requestData.authPassword || requestData.auth?.password || '',
        preRequestScript:
          requestData.preRequestScript || requestData.script?.preRequest || '',
        postResponseScript:
          requestData.postResponseScript || requestData.script?.postResponse || '',
        script: requestData.script,
      }

      if (normalizedCollectionId) {
        setSeedCollections((previous) =>
          previous.map((collection) => {
            const collectionKey = collection.id || collection._id
            if (!collectionKey || collectionKey !== normalizedCollectionId) return collection
            const existingApis = Array.isArray(collection.api) ? collection.api : []
            let matched = false
            const updatedApis = existingApis.map((apiItem) => {
              const apiItemId = apiItem.id || apiItem._id
              if (!apiItemId || apiItemId !== requestId) return apiItem
              matched = true
              return {
                ...apiItem,
                ...nextApiData,
              }
            })
            if (!matched) {
              updatedApis.push(nextApiData)
            }
            return {
              ...collection,
              api: updatedApis,
            }
          })
        )
      }
      setDirtyRequestIds((previous) => {
        const next = new Set(previous)
        next.delete(requestId)
        return next
      })
      showSaveNotice('API saved successfully.', 'success')
    } catch (error) {
      showSaveNotice(error.message || 'Failed to save API.', 'error')
    } finally {
      setIsSavingRequest(false)
    }
  }, [
    activeRequest,
    guestRequest,
    isLocked,
    isSavingRequest,
    selectedWorkspace,
    setSeedCollections,
    showSaveNotice,
  ])

  const handleCloseRequestTab = (requestId) => {
    setDirtyRequestIds((previous) => {
      const next = new Set(previous)
      next.delete(requestId)
      return next
    })
    closeRequestTab(requestId)
  }

  const handleCollectionToggle = useCallback(
    async (collectionId) => {
      if (isLocked || !collectionId) return

      try {
        const apisResponse = await getApis({ collectionId })
        const rawApis = extractList(apisResponse, ['apis', 'requests', 'request'])
        const filteredApis = rawApis.filter((apiItem) => {
          const targetCollectionId = apiItem.collectionId || apiItem.collectionid
          return !targetCollectionId || targetCollectionId === collectionId
        })

        setSeedCollections((previous) =>
          previous.map((collection) => {
            const currentId = collection.id || collection._id
            if (currentId !== collectionId) return collection
            return {
              ...collection,
              api: filteredApis,
            }
          })
        )
      } catch {
        // Keep existing collection APIs if re-fetch fails.
      }
    },
    [isLocked]
  )

  const handleSelectRequest = useCallback(
    async (request) => {
      if (!request) return
      selectRequest(request)

      if (isLocked) return
      const requestId = request.id || request._id
      if (!requestId) return

      try {
        const response = await getRequestById({ requestId })
        const fetchedRequest = extractRequestDetail(response)
        if (!fetchedRequest) return

        const normalized = normalizeRequestItem(fetchedRequest)
        if (!normalized) return

        updateActiveRequest(normalized)

        const targetCollectionId = normalized.collectionId || normalized.collectionid
        if (!targetCollectionId) return

        setSeedCollections((previous) =>
          previous.map((collection) => {
            const collectionKey = collection.id || collection._id
            if (!collectionKey || collectionKey !== targetCollectionId) return collection

            const existingApis = Array.isArray(collection.api) ? collection.api : []
            let found = false
            const updatedApis = existingApis.map((apiItem) => {
              const apiItemId = apiItem?.id || apiItem?._id
              if (!apiItemId || apiItemId !== normalized.id) return apiItem
              found = true
              return {
                ...apiItem,
                ...normalized,
              }
            })
            if (!found) {
              updatedApis.push(normalized)
            }

            return {
              ...collection,
              api: updatedApis,
            }
          })
        )
      } catch {
        // ignore hydration failures
      }
    },
    [isLocked, selectRequest, setSeedCollections, updateActiveRequest]
  )

  useEffect(() => {
    setDirtyRequestIds((previous) => {
      const validIds = new Set(openRequestTabs.map((request) => request.id))
      const next = new Set()
      previous.forEach((id) => {
        if (validIds.has(id)) next.add(id)
      })
      return next
    })
  }, [openRequestTabs])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return
      if (event.key.toLowerCase() !== 's') return
      event.preventDefault()
      void handleSaveActiveRequest()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSaveActiveRequest])

  useEffect(
    () => () => {
      if (saveNoticeTimeoutRef.current) {
        clearTimeout(saveNoticeTimeoutRef.current)
      }
    },
    []
  )

  const handleSendRequest = async () => {
    const requestData = activeRequest || guestRequest
    if (!requestData || isSendingRequest) return

    const method = (requestData.method || 'GET').toUpperCase()
    const requestUrl = buildRequestUrl(
      requestData.url || requestData.apiUrl || '',
      requestData.params || []
    )

    if (!requestUrl) {
      setResponseMeta({
        statusLabel: 'Error',
        durationLabel: '--',
        sizeLabel: '--',
      })
      setResponseText('Request URL is missing.')
      setResponseHeaders(DEFAULT_RESPONSE_HEADERS)
      return
    }

    const headerEntries = requestData.headers || requestData.header || []
    const normalizedBodyType = (requestData.bodyType || 'none').toLowerCase()
    const body =
      method !== 'GET' && method !== 'HEAD'
        ? buildRequestBody(requestData)
        : undefined
    const hasBody = body !== undefined
    const headers = {}

    headerEntries.forEach((item) => {
      const key = item?.name || item?.key
      const enabled = item?.enabled ?? true
      if (!enabled || !key) return
      const normalizedKey = String(key).toLowerCase()

      // Avoid unnecessary CORS preflight on body-less requests.
      if (!hasBody && normalizedKey === 'content-type') return

      headers[key] = item?.value ?? ''
    })

    if (hasBody) {
      const contentTypeKey = Object.keys(headers).find(
        (headerKey) => headerKey.toLowerCase() === 'content-type'
      )

      if (normalizedBodyType === 'form-data') {
        if (contentTypeKey) {
          delete headers[contentTypeKey]
        }
      }

      if (normalizedBodyType === 'x-www-form-urlencoded') {
        const encodedHeader =
          'application/x-www-form-urlencoded;charset=UTF-8'
        if (contentTypeKey) {
          headers[contentTypeKey] = encodedHeader
        } else {
          headers['Content-Type'] = encodedHeader
        }
      }
    }
    console.groupCollapsed('Outgoing API request')
    console.log('URL', requestUrl)
    console.log('Method', method)
    console.log('Headers', headers)
    console.log('Body type', normalizedBodyType)
    if (typeof body === 'string') {
      console.log('Request payload', body)
    } else if (body instanceof FormData) {
      console.log('Request FormData entries:')
      for (const entry of body.entries()) {
        console.log(entry[0], entry[1])
      }
    }
    console.groupEnd()

    const requestInit = {
      method,
      headers,
    }

    if (hasBody) {
      requestInit.body = body
    }

    const startedAt = performance.now()
    setIsSendingRequest(true)

    try {
      const response = await fetch(requestUrl, requestInit)
      const text = await response.text()
      const durationMs = performance.now() - startedAt
      const size = new TextEncoder().encode(text).length

      setResponseMeta({
        statusLabel: `${response.status} ${response.statusText}`.trim(),
        durationLabel: `${Math.round(durationMs)}ms`,
        sizeLabel: formatBytes(size),
      })
      setResponseHeaders(extractImportantResponseHeaders(response))
      setResponseText(parseBodyText(text))
    } catch (error) {
      setResponseMeta({
        statusLabel: 'Network Error',
        durationLabel: '--',
        sizeLabel: '--',
      })
      setResponseHeaders(DEFAULT_RESPONSE_HEADERS)
      setResponseText(error.message || 'Failed to send request.')
    } finally {
      setIsSendingRequest(false)
    }
  }

  const workspaceContent = (
    <div className="overflow-hidden p-3 md:p-4">
      <div className="mb-3 flex gap-2 overflow-x-auto border-b border-white/10 pb-2">
        {openRequestTabs.map((request) => {
          const isActive = request.id === activeRequest?.id
          const isDirty = dirtyRequestIds.has(request.id)
          return (
            <div
              key={request.id}
              className={`flex shrink-0 items-center rounded-md border text-sm transition ${
                isActive
                  ? 'border-primary-brand/60 bg-primary-brand/25 text-white'
                  : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveRequest(request)}
                className="flex items-center px-2 py-1.5 text-left"
              >
                <span className="mr-2 text-xs font-bold text-emerald-400">
                  {request.method}
                </span>
                <span>{truncateRequestName(request.name)}</span>
                {isDirty ? (
                  <span
                    className="ml-2 inline-block h-2 w-2 rounded-full bg-white"
                    title="Unsaved changes"
                    aria-label="Unsaved changes"
                  />
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => handleCloseRequestTab(request.id)}
                className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded text-white/60 hover:bg-white/10 hover:text-white"
                aria-label={`Close ${request.name} tab`}
              >
                x
              </button>
            </div>
          )
        })}
        {!openRequestTabs.length ? (
          <div className="flex shrink-0 items-center rounded-md border border-primary-brand/50 bg-primary-brand/20 px-2 py-1.5 text-sm text-white">
            <span className="mr-2 text-xs font-bold text-emerald-400">
              {(guestRequest.method || 'GET').toUpperCase()}
            </span>
            <span>
              {truncateRequestName(guestRequest.name) || 'Quick Request'}
            </span>
          </div>
        ) : null}
      </div>

      <div className="grid h-[calc(100%-46px)] grid-cols-1 gap-3 xl:grid-cols-2">
        <RequestPanel
          request={activeRequest || guestRequest}
          requestTabs={requestTabs}
          activeRequestTab={activeRequestTab}
          onRequestTabChange={setActiveRequestTab}
          onRequestChange={handleRequestChange}
          onSendRequest={handleSendRequest}
          isSending={isSendingRequest}
        />
        <ResponsePanel
          responseTabs={responseTabs}
          activeResponseTab={activeResponseTab}
          onResponseTabChange={setActiveResponseTab}
          responseText={responseText}
          responseMeta={responseMeta}
          responseHeaders={responseHeaders}
          isSending={isSendingRequest}
        />
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_15%_10%,#111b36_0%,#060913_45%,#04070f_100%)] text-white">
      <WorkspaceNavbar
        workspaces={workspaceList}
        selectedWorkspace={selectedWorkspace}
        onWorkspaceChange={setSelectedWorkspace}
        onWorkspaceRename={updateWorkspaceName}
        onAddWorkspace={() => openModal('workspace')}
        onDeleteWorkspace={handleDeleteWorkspace}
        onLogout={handleLogout}
        isLocked={isLocked}
        onSignInSuggestion={handleSignInSuggestion}
      />

      <section className="grid h-[calc(100vh-56px)] grid-cols-1 md:grid-cols-[320px_1fr]">
        <CollectionsSidebar
          collections={workspaceCollections}
          activeRequestId={activeRequest?.id}
          onSelectRequest={handleSelectRequest}
          onCollectionToggle={handleCollectionToggle}
          onAddCollection={(parentCollectionId) =>
            openModal('collection', parentCollectionId)
          }
          onAddApi={(collectionId) => openModal('api', collectionId)}
        onDeleteApi={handleDeleteApi}
        onDeleteCollection={handleDeleteCollection}
          isLocked={isLocked}
          onSignInSuggestion={handleSignInSuggestion}
        />
        {isLoadingData ? (
          <div className="grid h-full place-items-center text-sm text-white/70">
            Loading workspace data...
          </div>
        ) : loadError ? (
          <div className="grid h-full place-items-center p-6 text-center">
            <p className="text-sm text-rose-200">{loadError}</p>
          </div>
        ) : (
          workspaceContent
        )}
      </section>

      <CreateEntityModal
        modalState={modalState}
        selectedWorkspace={selectedWorkspace}
        userId={userId}
        isCreatingCollection={isCreatingCollection}
        onChangeField={setModalField}
        onClose={closeModal}
        onSubmit={handleSubmitModal}
      />
      {saveNotice ? (
        <div
          className={`fixed right-4 top-[68px] z-50 rounded-md border px-3 py-2 text-xs shadow-lg ${
            saveNotice.tone === 'error'
              ? 'border-rose-400/50 bg-rose-600/20 text-rose-100'
              : saveNotice.tone === 'success'
                ? 'border-emerald-400/50 bg-emerald-600/20 text-emerald-100'
                : 'border-sky-300/50 bg-sky-700/25 text-sky-100'
          }`}
          role="status"
          aria-live="polite"
        >
          {saveNotice.message}
        </div>
      ) : null}
    </main>
  )
}

export default ApiWorkspacePage
