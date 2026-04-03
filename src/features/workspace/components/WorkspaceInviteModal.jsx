import { useMemo, useState } from 'react'

const ROLE_OPTIONS = [
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
]

function WorkspaceInviteModal({
  isOpen,
  workspaceName,
  workspaceId,
  members = [],
  isLoading,
  canInvite,
  currentUserPermission,
  onClose,
  onInvite,
  onRefresh,
}) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('viewer')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const invitationSubtitle = useMemo(() => {
    if (!workspaceName) return 'Manage collaborators'
    return `Manage collaborators for ${workspaceName}`
  }, [workspaceName])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!email) {
      setError('Enter an email to invite.')
      return
    }
    if (!canInvite) return
    setIsSubmitting(true)
    setError('')
    try {
      await onInvite({ email, role })
      setEmail('')
      setRole('viewer')
    } catch (submitError) {
      setError(submitError?.message || 'Failed to send invite.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-slate-950/80 px-4 py-6">
      <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-[#0a0f1f] p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Invite Collaborators</h2>
            <p className="text-xs text-white/60">{invitationSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 px-2 py-1 text-xs font-semibold text-white/70 hover:bg-white/5"
          >
            Close
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="text-xs text-white/70">
            Your role: <span className="font-semibold">{currentUserPermission}</span>
          </p>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-md border border-white/15 px-3 py-1 text-xs font-semibold text-white/70 hover:border-highlight/70 hover:text-white"
            disabled={isLoading}
          >
            {isLoading ? 'Refreshing...' : 'Refresh list'}
          </button>
        </div>

        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                if (error) setError('')
              }}
              placeholder="teammate@example.com"
              className="w-full rounded-md border border-white/15 bg-[#0d1428] px-3 py-2 text-sm text-white outline-none focus:border-highlight/70"
              disabled={!canInvite || isSubmitting}
            />
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="w-full rounded-md border border-white/15 bg-[#0d1428] px-3 py-2 text-sm text-white outline-none focus:border-highlight/70"
              disabled={!canInvite || isSubmitting}
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!canInvite || isSubmitting}
              className="rounded-md bg-highlight/95 px-4 py-2 text-sm font-semibold text-[#111827] transition hover:bg-highlight disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Inviting...' : 'Send invite'}
            </button>
            {!canInvite ? (
              <p className="text-xs text-white/60">
                Only owners or admins can invite collaborators.
              </p>
            ) : null}
          </div>
          {error ? <p className="text-xs text-rose-300">{error}</p> : null}
        </form>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
          <header className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-white/60">
              Members &amp; Invitations
            </h3>
            <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase text-white/70">
              {members.length} entries
            </span>
          </header>
          {isLoading ? (
            <p className="mt-3 text-xs text-white/60">Loading collaborators...</p>
          ) : !members.length ? (
            <p className="mt-3 text-xs text-white/60">No collaborators yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="rounded-xl border border-white/10 bg-[#11182d] px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {member.name || member.email}
                      </p>
                      <p className="text-xs text-white/60">
                        {member.email}
                      </p>
                      <p className="text-xs text-white/60">
                        Status: {member.status || 'accepted'}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-white/60">
                        Role
                      </span>
                      <p className="text-sm font-semibold text-white">
                        {member.permission || 'viewer'}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

export default WorkspaceInviteModal
