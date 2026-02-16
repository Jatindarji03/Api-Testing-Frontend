import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { signIn } from '../../../api/auth/signInApi'
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
  } else if (form.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.'
  }

  return errors
}

function SignInPage() {
  const [form, setForm] = useState(initialForm)
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')

  const errors = useMemo(() => validate(form), [form])
  const hasErrors = Object.keys(errors).length > 0

  const showError = (field) => touched[field] || submitted

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
    setApiError('')
  }

  const handleBlur = (field) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitted(true)

    if (hasErrors) return

    try {
      setIsSubmitting(true)
      setApiError('')
      await signIn(form)
      console.log('Sign in success')
    } catch (error) {
      setApiError(error.message)
    } finally {
      setIsSubmitting(false)
    }
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
            New to GetMan?{' '}
            <Link className="font-medium text-highlight hover:underline" to="/signup">
              Create an account
            </Link>
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

          <div className="flex items-center justify-between text-sm text-white/75">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary-brand focus:ring-primary-brand/60"
              />
              <span>Remember me</span>
            </label>
            <a className="text-highlight hover:underline" href="/">
              Forgot password?
            </a>
          </div>

          {apiError ? <p className="text-sm text-rose-300">{apiError}</p> : null}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </AuthCard>
    </main>
  )
}

export default SignInPage
