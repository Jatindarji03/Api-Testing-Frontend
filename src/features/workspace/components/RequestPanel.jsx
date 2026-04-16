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
  const normalizeRows = (
    rows,
    defaultRow = { key: '', value: '', enabled: true, type: 'text' }
  ) => {
    const source = Array.isArray(rows) && rows.length ? rows : [{ ...defaultRow }]
    return source.map((row) => {
      const type = row?.type === 'file' ? 'file' : 'text'
      return {
        key: row?.key || row?.name || '',
        value: row?.value ?? '',
        enabled: row?.enabled ?? true,
        type,
        file: row?.file || null,
        fileName: row?.fileName || row?.file?.name || '',
      }
    })
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
  const bodyFormDataRows = normalizeRows(
    request?.bodyFormData || request?.formData || request?.formdata || [],
    { key: '', value: '', enabled: true }
  )
  const bodyUrlEncodedRows = normalizeRows(
    request?.bodyUrlEncoded ||
      request?.urlEncoded ||
      request?.formParams ||
      request?.formUrlEncoded ||
      [],
    { key: '', value: '', enabled: true }
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
      type: row?.type === 'file' ? 'file' : 'text',
      file: row?.file || null,
      fileName: row?.fileName || row?.file?.name || '',
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

  const renderFormDataTable = (
    rows,
    title,
    onRowsChange,
    defaultRow = {
      key: '',
      value: '',
      enabled: true,
      type: 'text',
    }
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

    const handleTypeChange = (index, type) => {
      const nextRows = rows.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              type,
              file: type === 'file' ? row.file : null,
              fileName: type === 'file' ? row.fileName : '',
            }
          : row
      )
      onRowsChange(nextRows)
    }

    const handleFileChange = (index, file) => {
      const nextRows = rows.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              file: file || null,
              fileName: file?.name || '',
              value: file?.name || row.value,
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
          <div className="grid grid-cols-[62px_1fr_96px_1fr_60px] bg-white/5 px-2 py-1.5 text-xs font-semibold text-white/65">
            <span>Use</span>
            <span>Name</span>
            <span>Type</span>
            <span>Value</span>
            <span>Action</span>
          </div>
          {rows.map((row, index) => (
            <div
              key={`${title}-${index}`}
              className="grid grid-cols-[62px_1fr_96px_1fr_60px] gap-2 border-t border-white/10 px-2 py-1.5 text-xs text-white/80"
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
              <select
                value={row.type || 'text'}
                onChange={(event) => handleTypeChange(index, event.target.value)}
                className="rounded border border-white/10 bg-[#0a0f1f] px-2 py-1 text-xs text-white/85 outline-none"
              >
                <option value="text">Text</option>
                <option value="file">File</option>
              </select>
              <div className="flex flex-col space-y-1">
                {row.type === 'file' ? (
                  <>
                    <input
                      key={`formdata-file-${row.key}-${row.fileName}`}
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        handleFileChange(index, event.target.files?.[0] || null)
                      }
                      className="text-xs text-white/80"
                    />
                    <span className="text-[11px] text-white/50">
                      {row.fileName || 'No file selected'}
                    </span>
                  </>
                ) : (
                  <input
                    type="text"
                    value={row.value ?? ''}
                    onChange={(event) =>
                      handleRowChange(index, 'value', event.target.value)
                    }
                    placeholder="value"
                    className="rounded border border-white/10 bg-[#0a0f1f] px-2 py-1 text-xs text-white/85 outline-none"
                  />
                )}
              </div>
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
      const renderBodyEditor = () => {
        if (bodyType === 'none') {
          return (
            <p className="text-xs text-white/60">
              Select a body type to provide content for this request.
            </p>
          )
        }

        if (bodyType === 'form-data') {
          return renderFormDataTable(
            bodyFormDataRows,
            'Form Data Body',
            (rows) =>
              updateRows('bodyFormData', rows, [
                'formData',
                'formdata',
              ]),
            { key: '', value: '', enabled: true, type: 'text' }
          )
        }

        if (bodyType === 'x-www-form-urlencoded') {
          return renderEditableKeyValueTable(
            bodyUrlEncodedRows,
            'Form URL Encoded Body',
            (rows) =>
              updateRows('bodyUrlEncoded', rows, [
                'urlEncoded',
                'urlencoded',
                'formParams',
                'formUrlEncoded',
              ]),
            { key: '', value: '', enabled: true }
          )
        }

        const isJson = bodyType === 'json'
        return (
          <textarea
            value={requestBody}
            onChange={(event) => updateRequest({ body: event.target.value })}
            placeholder={isJson ? 'JSON body...' : 'Request body...'}
            className="h-[230px] w-full resize-y rounded-md border border-white/10 bg-[#0a0f1f] p-3 font-mono text-xs leading-5 text-[#e8d7aa] outline-none"
          />
        )
      }

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
            {['none', 'raw', 'json', 'form-data', 'x-www-form-urlencoded'].map(
              (type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              )
            )}
          </select>
          {renderBodyEditor()}
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
