function RequestPanel({
  request,
  requestTabs,
  activeRequestTab,
  onRequestTabChange,
  onRequestChange,
  onSendRequest,
  isSending,
}) {
  const defaultHeaders = [
    { key: 'Accept', value: 'application/json', enabled: true },
    { key: 'Content-Type', value: 'application/json', enabled: true },
  ]
  const normalizeRows = (rows, defaultRow = { key: '', value: '', enabled: true }) => {
    const source = Array.isArray(rows) && rows.length ? rows : [defaultRow]
    return source.map((row) => ({
      key: row?.key || row?.name || '',
      value: row?.value ?? '',
      enabled: row?.enabled ?? true,
    }))
  }

  const queryParams = normalizeRows(request?.params || [])
  const rawHeaders = request?.headers || request?.header || []
  const headers = normalizeRows(
    Array.isArray(rawHeaders) && rawHeaders.length ? rawHeaders : defaultHeaders
  )
  const requestBody =
    typeof request?.body === 'string'
      ? request.body
      : request?.body
        ? JSON.stringify(request.body, null, 2)
        : ''
  const bodyType = request?.bodyType || 'none'
  const requestUrl = request?.url ?? request?.apiUrl ?? ''
  const requestMethod = (request?.method || 'GET').toUpperCase()
  const auth = request?.auth || {}
  const authType = request?.authType || auth?.type || 'none'
  const authToken = request?.authToken || auth?.token || ''
  const authUsername = request?.authUsername || auth?.username || ''
  const authPassword = request?.authPassword || auth?.password || ''
  const preRequestScript =
    request?.preRequestScript || request?.script?.preRequest || ''
  const postResponseScript =
    request?.postResponseScript || request?.script?.postResponse || ''
  const requestVars = normalizeRows(
    request?.vars || request?.variables || request?.envVariable || [],
    { key: 'baseUrl', value: '', enabled: true }
  )

  const updateRequest = (updater) => {
    if (!onRequestChange) return
    onRequestChange((current) => {
      if (!current) return current
      return typeof updater === 'function'
        ? updater(current)
        : {
            ...current,
            ...updater,
          }
    })
  }

  const updateRows = (fieldName, rows, aliases = []) => {
    const normalized = rows.map((row) => ({
      key: row?.key || row?.name || '',
      value: row?.value ?? '',
      enabled: row?.enabled ?? true,
    }))

    updateRequest((current) => {
      const next = {
        ...current,
        [fieldName]: normalized,
      }

      aliases.forEach((alias) => {
        next[alias] = normalized
      })

      return next
    })
  }

  const renderEditableKeyValueTable = (
    rows,
    title,
    onRowsChange,
    defaultRow = { key: '', value: '', enabled: true }
  ) => {
    const handleRowChange = (index, field, value) => {
      const nextRows = rows.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
      onRowsChange(nextRows)
    }

    const removeRow = (index) => {
      const nextRows = rows.filter((_, rowIndex) => rowIndex !== index)
      onRowsChange(nextRows.length ? nextRows : [defaultRow])
    }

    return (
      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-white/55">{title}</p>
        <div className="overflow-hidden rounded-md border border-white/10">
          <div className="grid grid-cols-[62px_1fr_1fr_60px] bg-white/5 px-2 py-1.5 text-xs font-semibold text-white/65">
            <span>Use</span>
            <span>Name</span>
            <span>Value</span>
            <span>Action</span>
          </div>
          {rows.map((row, index) => (
            <div
              key={`${title}-${index}`}
              className="grid grid-cols-[62px_1fr_1fr_60px] gap-2 border-t border-white/10 px-2 py-1.5 text-xs text-white/80"
            >
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={row.enabled ?? true}
                  onChange={(event) =>
                    handleRowChange(index, 'enabled', event.target.checked)
                  }
                  className="h-3.5 w-3.5 rounded border-white/30 bg-transparent"
                />
              </label>
              <input
                type="text"
                value={row.key || ''}
                onChange={(event) => handleRowChange(index, 'key', event.target.value)}
                placeholder="name"
                className="rounded border border-white/10 bg-[#0a0f1f] px-2 py-1 text-xs text-white/85 outline-none"
              />
              <input
                type="text"
                value={row.value ?? ''}
                onChange={(event) => handleRowChange(index, 'value', event.target.value)}
                placeholder="value"
                className="rounded border border-white/10 bg-[#0a0f1f] px-2 py-1 text-xs text-white/85 outline-none"
              />
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="rounded border border-white/15 px-2 py-1 text-[11px] text-white/75 hover:bg-white/10"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onRowsChange([...rows, defaultRow])}
          className="mt-2 rounded-md border border-white/15 px-2.5 py-1.5 text-xs text-white/80 hover:bg-white/10"
        >
          Add Row
        </button>
      </div>
    )
  }

  const renderRequestTab = () => {
    if (activeRequestTab === 'Params') {
      return renderEditableKeyValueTable(queryParams, 'Query Params', (rows) =>
        updateRows('params', rows)
      )
    }

    if (activeRequestTab === 'Headers') {
      return renderEditableKeyValueTable(headers, 'Headers', (rows) =>
        updateRows('headers', rows, ['header'])
      )
    }

    if (activeRequestTab === 'Body') {
      return (
        <div className="space-y-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-white/55">
            Request Body ({bodyType.toUpperCase()})
          </p>
          <select
            value={bodyType}
            onChange={(event) => updateRequest({ bodyType: event.target.value })}
            className="w-full rounded-md border border-white/10 bg-[#0a0f1f] px-3 py-2 text-xs text-white/85 outline-none"
          >
            {['none', 'raw', 'json', 'form-data', 'x-www-form-urlencoded'].map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <textarea
            value={requestBody}
            onChange={(event) => updateRequest({ body: event.target.value })}
            placeholder="Request body..."
            className="h-[230px] w-full resize-y rounded-md border border-white/10 bg-[#0a0f1f] p-3 font-mono text-xs leading-5 text-[#e8d7aa] outline-none"
          />
        </div>
      )
    }

    if (activeRequestTab === 'Auth') {
      return (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-white/55">
            Authentication
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded-md border border-white/10 bg-[#0a0f1f] px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-white/50">Type</p>
              <select
                value={authType}
                onChange={(event) => {
                  const value = event.target.value
                  updateRequest((current) => ({
                    ...current,
                    authType: value,
                    auth: {
                      ...(current.auth || {}),
                      type: value,
                    },
                  }))
                }}
                className="mt-1 w-full rounded border border-white/10 bg-[#10162a] px-2 py-1.5 text-xs text-white/85 outline-none"
              >
                {['none', 'bearer', 'basic', 'apikey'].map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-md border border-white/10 bg-[#0a0f1f] px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-white/50">Token</p>
              <input
                value={authToken}
                onChange={(event) => {
                  const value = event.target.value
                  updateRequest((current) => ({
                    ...current,
                    authToken: value,
                    auth: {
                      ...(current.auth || {}),
                      token: value,
                    },
                  }))
                }}
                className="mt-1 w-full rounded border border-white/10 bg-[#10162a] px-2 py-1.5 text-xs text-white/85 outline-none"
              />
            </div>
            <div className="rounded-md border border-white/10 bg-[#0a0f1f] px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-white/50">Username</p>
              <input
                value={authUsername}
                onChange={(event) => {
                  const value = event.target.value
                  updateRequest((current) => ({
                    ...current,
                    authUsername: value,
                    auth: {
                      ...(current.auth || {}),
                      username: value,
                    },
                  }))
                }}
                className="mt-1 w-full rounded border border-white/10 bg-[#10162a] px-2 py-1.5 text-xs text-white/85 outline-none"
              />
            </div>
            <div className="rounded-md border border-white/10 bg-[#0a0f1f] px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-white/50">Password</p>
              <input
                type="password"
                value={authPassword}
                onChange={(event) => {
                  const value = event.target.value
                  updateRequest((current) => ({
                    ...current,
                    authPassword: value,
                    auth: {
                      ...(current.auth || {}),
                      password: value,
                    },
                  }))
                }}
                className="mt-1 w-full rounded border border-white/10 bg-[#10162a] px-2 py-1.5 text-xs text-white/85 outline-none"
              />
            </div>
          </div>
        </div>
      )
    }

    if (activeRequestTab === 'Vars') {
      return renderEditableKeyValueTable(
        requestVars,
        'Request Variables',
        (rows) => updateRows('vars', rows, ['variables', 'envVariable']),
        { key: 'baseUrl', value: '', enabled: true }
      )
    }

    if (activeRequestTab === 'Script') {
      return (
        <div className="grid gap-3 xl:grid-cols-2">
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-white/55">
              Pre-request Script
            </p>
            <textarea
              value={preRequestScript}
              onChange={(event) => {
                const value = event.target.value
                updateRequest((current) => ({
                  ...current,
                  preRequestScript: value,
                  script: {
                    ...(current.script || {}),
                    preRequest: value,
                  },
                }))
              }}
              placeholder="// Add pre-request script"
              className="h-[190px] w-full resize-y rounded-md border border-white/10 bg-[#0a0f1f] p-3 font-mono text-xs leading-5 text-[#e8d7aa] outline-none"
            />
          </div>
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-white/55">
              Post-response Script
            </p>
            <textarea
              value={postResponseScript}
              onChange={(event) => {
                const value = event.target.value
                updateRequest((current) => ({
                  ...current,
                  postResponseScript: value,
                  script: {
                    ...(current.script || {}),
                    postResponse: value,
                  },
                }))
              }}
              placeholder="// Add post-response script"
              className="h-[190px] w-full resize-y rounded-md border border-white/10 bg-[#0a0f1f] p-3 font-mono text-xs leading-5 text-[#e8d7aa] outline-none"
            />
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <section className="rounded-xl border border-white/10 bg-[#0b1120]">
      <div className="border-b border-white/10 p-3">
        <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center">
          <select
            value={requestMethod}
            onChange={(event) => updateRequest({ method: event.target.value })}
            className="rounded-md border border-white/10 bg-[#0a0f1f] px-2 py-2 text-xs font-bold text-emerald-300 outline-none"
          >
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map(
              (method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              )
            )}
          </select>
          <input
            value={requestUrl}
            onChange={(event) =>
              updateRequest({
                url: event.target.value,
                apiUrl: event.target.value,
              })
            }
            placeholder="https://api.example.com/resource"
            className="flex-1 rounded-md border border-white/10 bg-[#0a0f1f] px-3 py-2 text-sm text-white/85 outline-none"
          />
          <button
            type="button"
            onClick={onSendRequest}
            disabled={isSending}
            className="rounded-md bg-highlight/95 px-3 py-2 text-xs font-semibold text-[#111827] hover:bg-highlight disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {requestTabs.map((tab) => {
            const isActive = tab === activeRequestTab
            return (
              <button
                key={tab}
                type="button"
                onClick={() => onRequestTabChange(tab)}
                className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                  isActive
                    ? 'bg-primary-brand/30 text-white'
                    : 'text-white/55 hover:bg-white/5 hover:text-white/85'
                }`}
              >
                {tab}
              </button>
            )
          })}
        </div>
      </div>

      <div className="p-3">{renderRequestTab()}</div>
    </section>
  )
}

export default RequestPanel
