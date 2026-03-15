import { useMemo, useState } from 'react'

function CollectionsSidebar({
  collections,
  activeRequestId,
  onSelectRequest,
  onCollectionToggle,
  onAddCollection,
  onDeleteCollection,
  onAddApi,
  onDeleteApi,
  isLocked,
  onSignInSuggestion,
}) {
  const [expandedIds, setExpandedIds] = useState(() => new Set())

  const { rootCollections, childrenMap } = useMemo(() => {
    const map = new Map()
    const roots = []

    collections.forEach((collection) => {
      const parentId = collection.parentCollectionId || null
      if (!parentId) {
        roots.push(collection)
        return
      }
      const existing = map.get(parentId) || []
      existing.push(collection)
      map.set(parentId, existing)
    })

    return { rootCollections: roots, childrenMap: map }
  }, [collections])

  const toggleCollection = (collectionId) => {
    let shouldFetch = false
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(collectionId)) {
        next.delete(collectionId)
      } else {
        next.add(collectionId)
        shouldFetch = true
      }
      return next
    })
    return shouldFetch
  }

  const renderCollectionNode = (collection, depth = 0) => {
    const childCollections = childrenMap.get(collection.id) || []
    const hasChildren = childCollections.length > 0
    const isExpanded = expandedIds.has(collection.id)
    // const paddingLeft = `${depth * 10 + 4}px`

    return (
      <section key={collection.id} className="space-y-2">
        <div
          className="rounded-md border border-white/10 bg-white/[0.03] p-2"
          
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                const shouldFetch = toggleCollection(collection.id)
                if (shouldFetch) {
                  onCollectionToggle?.(collection.id)
                }
              }}
              className="flex flex-1 items-center gap-2 text-left"
              disabled={isLocked}
            >
              <span className="text-xs text-white/60">{isExpanded ? 'v' : '>'}</span>
              <span className="text-xs font-semibold text-white">{collection.name}</span>
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onAddCollection(collection.id)}
                disabled={isLocked}
                className="rounded-md border border-white/15 px-2 py-1 text-[11px] font-semibold text-white/75 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                title="Create sub collection"
              >
                + Sub
              </button>
              <button
                type="button"
                onClick={() => onAddApi(collection.id)}
                disabled={isLocked}
                className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                title="Create API request"
              >
                + Api
              </button>
              <button
                type="button"
                onClick={() => onDeleteCollection(collection.id)}
                disabled={isLocked}
                className="rounded-md border border-rose-400/35 bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                title="Delete collection"
              >
                Del
              </button>
            </div>
          </div>

          {collection.description ? (
            <p className="mt-1 text-[11px] text-white/55">{collection.description}</p>
          ) : null}

          {isExpanded ? (
            <div className="mt-2 space-y-2">
              <ul className="space-y-1">
                {(collection.api || []).map((request) => {
                  const isActive = request.id === activeRequestId
                  return (
                    <li key={request.id}>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onSelectRequest(request)}
                          disabled={isLocked}
                          className={`flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition ${
                            isActive
                              ? 'bg-primary-brand/25 text-white'
                              : 'text-white/75 hover:bg-white/5'
                          } disabled:cursor-not-allowed disabled:opacity-45`}
                        >
                          <span className="text-[11px] font-bold text-emerald-400">
                            {request.method}
                          </span>
                          <span className="truncate">{request.name}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteApi(collection.id, request.id)}
                          disabled={isLocked}
                          className="rounded-md border border-rose-400/35 bg-rose-500/10 px-2 py-1 text-[10px] font-semibold text-rose-200 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Delete API request"
                        >
                          Del
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>

              {hasChildren ? (
                <div className="space-y-2">
                  {childCollections.map((childCollection) =>
                    renderCollectionNode(childCollection, depth + 1)
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    )
  }

  return (
    <aside className="relative h-full overflow-y-auto border-r border-white/10 bg-[#070b17]/80 p-3 backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-white/60">
          Collections
        </h2>
        <button
          type="button"
          onClick={() => onAddCollection(null)}
          className="rounded-md border border-white/15 px-2 py-1 text-xs text-white/70 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isLocked}
        >
          + New
        </button>
      </div>

      <div className="space-y-2">
        {rootCollections.map((collection) => renderCollectionNode(collection))}
      </div>

      {isLocked ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/35 px-4 text-center backdrop-blur-lg">
          <p className="text-sm font-semibold text-white">Workspace sidebar is locked</p>
          <p className="text-xs text-white/75">
            Sign in to access collections and requests.
          </p>
          <button
            type="button"
            onClick={onSignInSuggestion}
            className="rounded-md bg-highlight/95 px-3 py-2 text-xs font-semibold text-[#111827] hover:bg-highlight"
          >
            Login Suggestion
          </button>
        </div>
      ) : null}
    </aside>
  )
}

export default CollectionsSidebar
