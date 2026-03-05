import { useEffect, useState } from 'react'

function WorkspaceNavbar({
  workspaces,
  selectedWorkspace,
  onWorkspaceChange,
  onWorkspaceRename,
  onAddWorkspace,
  onDeleteWorkspace,
  onLogout,
  isLocked,
  onSignInSuggestion,
}) {
  const selectedWorkspaceData =
    workspaces.find((workspace) => workspace.id === selectedWorkspace) || null
  const [workspaceNameDraft, setWorkspaceNameDraft] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)

  useEffect(() => {
    setWorkspaceNameDraft(selectedWorkspaceData?.name || '')
  }, [selectedWorkspaceData?.name, selectedWorkspace])

  const handleRename = async () => {
    const nextName = workspaceNameDraft.trim()
    if (!nextName || !selectedWorkspaceData) return
    if (nextName === selectedWorkspaceData.name) return
    setIsRenaming(true)
    try {
      await onWorkspaceRename(nextName)
    } finally {
      setIsRenaming(false)
    }
  }

  return (
    <header className="relative flex h-14 items-center justify-between border-b border-white/10 bg-[#0a0f1f]/80 px-4 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary-brand/25 text-sm font-bold text-highlight">
          {isLocked ? 'LK' : 'GM'}
        </div>
        <p className="text-sm font-semibold text-white">
          {isLocked ? 'Workspace Locked' : 'GetMan'}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-white/80">
          <span className="text-white/60">Workspace</span>
          <select
            className="rounded-md border border-white/15 bg-[#0d1428] px-2 py-1.5 text-sm text-white outline-none focus:border-highlight/70 disabled:cursor-not-allowed disabled:opacity-50"
            value={selectedWorkspace}
            onChange={(event) => onWorkspaceChange(event.target.value)}
            disabled={isLocked}
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-white/80">
          <span className="text-white/60">Project</span>
          <input
            value={workspaceNameDraft}
            onChange={(event) => setWorkspaceNameDraft(event.target.value)}
            disabled={isLocked || !selectedWorkspaceData || isRenaming}
            className="w-44 rounded-md border border-white/15 bg-[#0d1428] px-2 py-1.5 text-sm text-white outline-none focus:border-highlight/70 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </label>
        <button
          type="button"
          onClick={handleRename}
          disabled={
            isLocked ||
            !selectedWorkspaceData ||
            isRenaming ||
            !workspaceNameDraft.trim() ||
            workspaceNameDraft.trim() === selectedWorkspaceData.name
          }
          className="rounded-md border border-sky-400/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-200 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRenaming ? 'Saving...' : 'Save Name'}
        </button>
        <button
          type="button"
          onClick={onAddWorkspace}
          disabled={isLocked}
          className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          New Workspace
        </button>
        <button
          type="button"
          onClick={onDeleteWorkspace}
          disabled={isLocked || workspaces.length <= 1}
          className="rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Delete Workspace
        </button>
        <button
          type="button"
          onClick={onLogout}
          disabled={isLocked}
          className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Logout
        </button>
      </div>

      {isLocked ? (
        <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/25 backdrop-blur-lg">
          <p className="text-xs font-medium text-white/80">
            Sign in to unlock workspace navigation.
          </p>
          <button
            type="button"
            onClick={onSignInSuggestion}
            className="rounded-md bg-highlight/95 px-3 py-1.5 text-xs font-semibold text-[#111827] hover:bg-highlight"
          >
            Go to Sign In
          </button>
        </div>
      ) : null}
    </header>
  )
}

export default WorkspaceNavbar
