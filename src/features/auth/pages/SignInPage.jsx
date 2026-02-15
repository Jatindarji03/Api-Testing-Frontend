import { useMemo, useState } from 'react'
import AuthCard from '../../../components/ui/AuthCard'
import Button from '../../../components/ui/Button'
import FormField from '../../../components/ui/FormField'

const initialForm = {
  email: '',
  password: '',
}

function validate(form) {
  const errors = {}

  if (!form.email.trim()) {
    errors.email = 'Email is required.'
  } else if (!/\S+@\S+\.\S+/.test(form.email)) {
    errors.email = 'Please enter a valid email address.'
  }

  if (!form.password) {
    errors.password = 'Password is required.'
  }

  return errors
}

function SignInPage() {
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

    console.log('Sign in payload:', form)
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg-main px-4 py-10 font-jakarta">
      <div className="pointer-events-none absolute -left-12 top-6 h-44 w-44 rounded-full bg-primary-brand/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -right-6 h-52 w-52 rounded-full bg-accent-soft/40 blur-3xl" />
      <AuthCard
        title="Welcome back"
        subtitle="Sign in to continue managing and testing your APIs."
        footer={
          <p>
            Don&apos;t have an account?{' '}
            <a className="font-medium text-highlight hover:underline" href="/">
              Sign up
            </a>
          </p>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
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
            placeholder="Enter your password"
            error={showError('password') ? errors.password : undefined}
            autoComplete="current-password"
          />

          <Button type="submit">Sign In</Button>
        </form>
      </AuthCard>
    </main>
  )
}

export default SignInPage
