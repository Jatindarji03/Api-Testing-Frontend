import Input from './Input'

function FormField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  ...props
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-white">
        {label}
      </label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="text-xs text-rose-300">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export default FormField
