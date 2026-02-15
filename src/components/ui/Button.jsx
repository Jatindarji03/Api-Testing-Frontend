function Button({ type = 'button', children, className = '', ...props }) {
  const baseClassName =
    'w-full rounded-xl bg-primary-brand px-4 py-3 font-semibold text-white transition hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight/70 disabled:cursor-not-allowed disabled:opacity-60'

  return (
    <button
      type={type}
      className={`${baseClassName} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
