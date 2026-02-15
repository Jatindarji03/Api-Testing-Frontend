function Input({
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  className = '',
  ...props
}) {
  const baseClassName =
    'w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/45 outline-none transition focus:border-highlight focus:ring-2 focus:ring-highlight/30'

  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`${baseClassName} ${className}`.trim()}
      {...props}
    />
  )
}

export default Input
