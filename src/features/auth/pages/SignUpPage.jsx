import { useMemo, useState } from 'react'
import AuthCard from '../../../components/ui/AuthCard'
import Button from '../../../components/ui/Button'
import FormField from '../../../components/ui/FormField'

const initialForm = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
}

function validate(form) {
  const errors = {}

  if (!form.fullName.trim()) {
    errors.fullName = 'Full name is required.'
  }

  if (!form.email.trim()) {
    errors.email = 'Email is required.'
  } else if (!/\S+@\S+\.\S+/.test(form.email)) {
    errors.email = 'Please enter a valid email address.'
  }

  if (!form.password) {
    errors.password = 'Password is required.'
  } else if (form.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.'
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.'
  } else if (form.confirmPassword !== form.password) {
    errors.confirmPassword = 'Passwords do not match.'
  }

  return errors
}

function SignUpPage() {
  const [form, setForm] = useState(initialForm)
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)

  const errors = useMemo(() => validate(form), [form])
  const hasErrors = Object.keys(errors).length > 0

  const showError = (field) => touched[field] || submitted

  const handleChange = (field) => (event) => {
    const { value } = event.target
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleBlur = (field) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setSubmitted(true)

    if (hasErrors) return

    console.log('Sign up payload:', form)
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg-main px-4 py-10 font-jakarta">
      <div className="pointer-events-none absolute -left-12 top-6 h-44 w-44 rounded-full bg-primary-brand/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -right-6 h-52 w-52 rounded-full bg-accent-soft/40 blur-3xl" />
      <AuthCard
        title="Create your account"
        subtitle="Start building and testing APIs with your workspace."
        footer={
          <p>
            Already have an account?{' '}
            <a className="font-medium text-highlight hover:underline" href="/">
              Sign in
            </a>
          </p>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <FormField
            id="fullName"
            label="Full Name"
            value={form.fullName}
            onChange={handleChange('fullName')}
            onBlur={handleBlur('fullName')}
            placeholder="Aman Sharma"
            error={showError('fullName') ? errors.fullName : undefined}
            autoComplete="name"
          />

          <FormField
            id="email"
            type="email"
            label="Email"
            value={form.email}
            onChange={handleChange('email')}
            onBlur={handleBlur('email')}
            placeholder="aman@example.com"
            error={showError('email') ? errors.email : undefined}
            autoComplete="email"
          />

          <FormField
            id="password"
            type="password"
            label="Password"
            value={form.password}
            onChange={handleChange('password')}
            onBlur={handleBlur('password')}
            placeholder="At least 8 characters"
            error={showError('password') ? errors.password : undefined}
            autoComplete="new-password"
          />

          <FormField
            id="confirmPassword"
            type="password"
            label="Confirm Password"
            value={form.confirmPassword}
            onChange={handleChange('confirmPassword')}
            onBlur={handleBlur('confirmPassword')}
            placeholder="Retype your password"
            error={
              showError('confirmPassword') ? errors.confirmPassword : undefined
            }
            autoComplete="new-password"
          />

          <Button type="submit">Create Account</Button>
        </form>
      </AuthCard>
    </main>
  )
}

export default SignUpPage
