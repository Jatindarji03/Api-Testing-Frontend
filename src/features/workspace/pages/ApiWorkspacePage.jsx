import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { getApis } from '../../../api/workspace/apiApi'
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
  const navigate = useNavigate()
  const { userId, setUser } = useUser()
  const isLocked = !isAuthenticated()
  const [seedWorkspaces, setSeedWorkspaces] = useState([])
  const [seedCollections, setSeedCollections] = useState([])
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [responseText, setResponseText] = useState(DEFAULT_RESPONSE_TEXT)
  const [responseMeta, setResponseMeta] = useState(DEFAULT_RESPONSE_META)
  const [responseHeaders, setResponseHeaders] = useState(DEFAULT_RESPONSE_HEADERS)
  const [isSendingRequest, setIsSendingRequest] = useState(false)
  const [guestRequest, setGuestRequest] = useState(createGuestRequest)
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

  useEffect(() => {
    let isCancelled = false

    const loadWorkspaceData = async () => {
      if (isLocked) {
        setSeedWorkspaces([])
        setSeedCollections([])
        setLoadError('')
        return
      }

      try {
        setIsLoadingData(true)
        setLoadError('')

        const workspacesResponse = await getWorkspaces({
          userId: userId || undefined,
        })

        const workspaces = extractList(workspacesResponse, ['workspaces', 'projects'])
        const effectiveWorkspaceId =
          selectedWorkspace ||
          workspaces[0]?.id ||
          workspaces[0]?._id ||
          ''

        const [collectionsResponse, apisResponse] = effectiveWorkspaceId
          ? await Promise.all([
              getCollections({ workspaceId: effectiveWorkspaceId }),
              getApis({ workspaceId: effectiveWorkspaceId }),
            ])
          : [[], []]

        if (isCancelled) return

        const collections = extractList(collectionsResponse, ['collections'])
        const apis = extractList(apisResponse, ['apis', 'requests'])
        const collectionsWithApis = mergeApisIntoCollections(collections, apis)

        setSeedWorkspaces(workspaces)
        setSeedCollections(collectionsWithApis)
      } catch (error) {
        if (isCancelled) return
        setSeedWorkspaces([])
        setSeedCollections([])
        setLoadError(error.message || 'Failed to load workspace data.')
      } finally {
        if (!isCancelled) setIsLoadingData(false)
      }
    }

    loadWorkspaceData()

    return () => {
      isCancelled = true
    }
  }, [isLocked, userId, selectedWorkspace])

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
  }

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
    const body = method !== 'GET' && method !== 'HEAD' ? formatBody(requestData.body) : undefined
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
                <span>{request.name}</span>
              </button>
              <button
                type="button"
                onClick={() => closeRequestTab(request.id)}
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
            <span>{guestRequest.name || 'Quick Request'}</span>
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
        onDeleteWorkspace={deleteWorkspace}
        onLogout={handleLogout}
        isLocked={isLocked}
        onSignInSuggestion={handleSignInSuggestion}
      />

      <section className="grid h-[calc(100vh-56px)] grid-cols-1 md:grid-cols-[320px_1fr]">
        <CollectionsSidebar
          collections={workspaceCollections}
          activeRequestId={activeRequest?.id}
          onSelectRequest={selectRequest}
          onAddCollection={(parentCollectionId) =>
            openModal('collection', parentCollectionId)
          }
          onAddApi={(collectionId) => openModal('api', collectionId)}
          onDeleteApi={deleteApi}
          onDeleteCollection={deleteCollection}
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
    </main>
  )
}

export default ApiWorkspacePage
