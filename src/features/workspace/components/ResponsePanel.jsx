function ResponsePanel({
  responseTabs,
  activeResponseTab,
  onResponseTabChange,
  responseText,
  responseMeta,
  responseHeaders,
  isSending,
}) {
  const statusLabel = responseMeta?.statusLabel || 'Ready'
  const durationLabel = responseMeta?.durationLabel || '--'
  const sizeLabel = responseMeta?.sizeLabel || '--'
  const responseContent = responseText || 'Send a request to view the response.'
  const headers = Array.isArray(responseHeaders) ? responseHeaders : []

  const renderTabContent = () => {
    if (isSending) {
      return (
        <pre className="h-[430px] overflow-auto p-3 font-mono text-xs leading-5 text-[#e8d7aa]">
          Sending request...
        </pre>
      )
    }

    if (activeResponseTab === 'Headers') {
      return (
        <div className="h-[430px] overflow-auto p-3">
          <div className="overflow-hidden rounded-md border border-white/10">
            <div className="grid grid-cols-[1fr_2fr] bg-white/5 px-2 py-1.5 text-xs font-semibold text-white/65">
              <span>Header</span>
              <span>Value</span>
            </div>
            {headers.map((header) => (
              <div
                key={header.key}
                className="grid grid-cols-[1fr_2fr] gap-2 border-t border-white/10 px-2 py-1.5 text-xs text-white/80"
              >
                <span className="font-mono">{header.key}</span>
                <span className="break-all font-mono text-[#e8d7aa]">
                  {header.value || '--'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (activeResponseTab === 'Timeline') {
      return (
        <pre className="h-[430px] overflow-auto p-3 font-mono text-xs leading-5 text-[#e8d7aa]">
          Duration: {durationLabel}
        </pre>
      )
    }

    return (
      <pre className="h-130 overflow-auto p-3 font-mono text-xs leading-5 text-[#e8d7aa]">
        {responseContent}
      </pre>
    )
  }

  return (
    <section className="rounded-xl border border-white/10 bg-[#0b1120]">
      <div className="flex items-center justify-between border-b border-white/10 p-3">
        <div className="flex flex-wrap gap-2">
          {responseTabs.map((tab) => {
            const isActive = tab === activeResponseTab
            return (
              <button
                key={tab}
                type="button"
                onClick={() => onResponseTabChange(tab)}
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

        <div className="flex items-center gap-3 text-xs text-white/70">
          <span className="font-semibold text-emerald-400">{statusLabel}</span>
          <span>{durationLabel}</span>
          <span>{sizeLabel}</span>
        </div>
      </div>

      {renderTabContent()}
    </section>
  )
}

export default ResponsePanel
