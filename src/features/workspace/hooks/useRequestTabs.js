import { useMemo, useState } from 'react'
import {
  getInitialRequest,
  getRequestsFromCollections,
} from '../utils/workspaceDataHelpers'

function useRequestTabs({
  workspaceCollections,
  defaultRequestTab,
  defaultResponseTab,
}) {
  const [activeRequestTab, setActiveRequestTab] = useState(defaultRequestTab)
  const [activeResponseTab, setActiveResponseTab] = useState(defaultResponseTab)
  const [activeRequestRaw, setActiveRequest] = useState(() =>
    getInitialRequest(workspaceCollections)
  )

  const allRequests = useMemo(
    () => getRequestsFromCollections(workspaceCollections),
    [workspaceCollections]
  )

  const [openRequestTabsRaw, setOpenRequestTabs] = useState(() => allRequests.slice(0, 3))

  const openRequestTabs = useMemo(() => {
    const validTabs = openRequestTabsRaw.filter((tab) =>
      allRequests.some((request) => request.id === tab.id)
    )
    if (validTabs.length > 0) return validTabs
    return allRequests[0] ? [allRequests[0]] : []
  }, [openRequestTabsRaw, allRequests])

  const activeRequest = useMemo(() => {
    if (activeRequestRaw && allRequests.some((request) => request.id === activeRequestRaw.id)) {
      return activeRequestRaw
    }
    return allRequests[0] || null
  }, [activeRequestRaw, allRequests])

  const selectRequest = (request) => {
    setOpenRequestTabs((prev) => {
      if (prev.some((tab) => tab.id === request.id)) return prev
      return [...prev, request]
    })
    setActiveRequest(request)
  }

  const closeRequestTab = (requestId) => {
    setOpenRequestTabs((prevTabs) => {
      if (prevTabs.length <= 1) return prevTabs

      const closingIndex = prevTabs.findIndex((tab) => tab.id === requestId)
      const nextTabs = prevTabs.filter((tab) => tab.id !== requestId)

      if (activeRequest?.id === requestId) {
        const fallbackIndex =
          closingIndex >= nextTabs.length ? nextTabs.length - 1 : closingIndex
        setActiveRequest(nextTabs[fallbackIndex] || null)
      }

      return nextTabs
    })
  }

  const updateActiveRequest = (updater) => {
    setActiveRequest((previous) => {
      const sourceRequest = previous || activeRequest
      if (!sourceRequest) return sourceRequest

      const next =
        typeof updater === 'function'
          ? updater(sourceRequest)
          : {
              ...sourceRequest,
              ...updater,
            }

      if (!next?.id) return next

      setOpenRequestTabs((previousTabs) =>
        previousTabs.map((tab) =>
          tab.id === next.id
            ? {
                ...tab,
                ...next,
              }
            : tab
        )
      )

      return next
    })
  }

  return {
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
  }
}

export { useRequestTabs }
