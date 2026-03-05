const DEFAULT_WORKSPACE_ID = 'ws-main'
const DEFAULT_REQUEST_HEADERS = Object.freeze([
  { key: 'Accept', value: 'application/json', enabled: true },
  { key: 'Content-Type', value: 'application/json', enabled: true },
])

function getDefaultRequestHeaders() {
  return DEFAULT_REQUEST_HEADERS.map((header) => ({ ...header }))
}

function resolveRequestHeaders(apiItem) {
  const source = apiItem.headers || apiItem.header || []
  if (Array.isArray(source) && source.length > 0) return source
  return getDefaultRequestHeaders()
}

function normalizeWorkspaces(seedWorkspaces = []) {
  return seedWorkspaces.map((workspace) => ({
    ...workspace,
    id: workspace.id || workspace._id || `ws-${Date.now()}`,
    name: workspace.name || workspace.projectName || 'Untitled Workspace',
  }))
}

function normalizeCollections(seedCollections, defaultWorkspaceId = DEFAULT_WORKSPACE_ID) {
  return seedCollections.map((collection) => ({
    ...collection,
    id: collection.id || collection._id || `col-${Date.now()}`,
    name: collection.name || collection.collectionName || 'Untitled Collection',
    workspaceId:
      collection.workspaceId ||
      collection.projectId ||
      defaultWorkspaceId,
    parentCollectionId: collection.parentCollectionId ?? null,
    description:
      collection.description || collection.collectionDescription || '',
    api: (collection.api || []).map((apiItem) => ({
      ...apiItem,
      id: apiItem.id || apiItem._id || `api-${Date.now()}`,
      name: apiItem.name || apiItem.apiName || 'Untitled API',
      method: (apiItem.method || 'GET').toUpperCase(),
      url: apiItem.url || apiItem.apiUrl || '',
      apiUrl: apiItem.apiUrl || apiItem.url || '',
      headers: resolveRequestHeaders(apiItem),
      header: resolveRequestHeaders(apiItem),
      params: apiItem.params || [],
      bodyType: apiItem.bodyType || 'none',
      body: apiItem.body ?? '',
      authType: apiItem.authType || apiItem.auth?.type || 'none',
      authToken: apiItem.authToken || apiItem.auth?.token || '',
      authUsername: apiItem.authUsername || apiItem.auth?.username || '',
      authPassword: apiItem.authPassword || apiItem.auth?.password || '',
      preRequestScript: apiItem.preRequestScript || apiItem.script?.preRequest || '',
      postResponseScript:
        apiItem.postResponseScript || apiItem.script?.postResponse || '',
      vars: apiItem.vars || apiItem.variables || apiItem.envVariable || [],
      variables: apiItem.variables || apiItem.vars || apiItem.envVariable || [],
      envVariable: apiItem.envVariable || apiItem.vars || apiItem.variables || [],
    })),
  }))
}

function collectDescendantIds(collections, rootId) {
  const ids = new Set([rootId])
  let found = true

  while (found) {
    found = false
    collections.forEach((collection) => {
      if (!ids.has(collection.id) && ids.has(collection.parentCollectionId)) {
        ids.add(collection.id)
        found = true
      }
    })
  }

  return ids
}

function getRequestsFromCollections(collections) {
  return collections.flatMap((collection) => {
    if (Array.isArray(collection.api)) {
      return collection.api
    }

    return (collection.folders || []).flatMap((folder) => folder.requests || [])
  })
}

function getInitialRequest(collections) {
  return getRequestsFromCollections(collections)[0] || null
}

function resolveCollectionId(responseData) {
  return (
    responseData?.collection?.id ??
    responseData?.collection?._id ??
    responseData?.data?.collection?.id ??
    responseData?.data?.collection?._id ??
    responseData?.id ??
    responseData?._id ??
    responseData?.data?.id ??
    responseData?.data?._id ??
    `col-${Date.now()}`
  )
}

function resolveApiId(responseData) {
  return (
    responseData?.api?.id ??
    responseData?.api?._id ??
    responseData?.data?.api?.id ??
    responseData?.data?.api?._id ??
    responseData?.id ??
    responseData?._id ??
    responseData?.data?.id ??
    responseData?.data?._id ??
    `api-${Date.now()}`
  )
}

export {
  collectDescendantIds,
  getInitialRequest,
  getRequestsFromCollections,
  getDefaultRequestHeaders,
  normalizeCollections,
  normalizeWorkspaces,
  resolveApiId,
  resolveCollectionId,
}
