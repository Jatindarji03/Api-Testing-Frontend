import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signUp } from '../../../api/auth/signUpApi'
import AuthCard from '../../../components/ui/AuthCard'
import Button from '../../../components/ui/Button'
import FormField from '../../../components/ui/FormField'
import GoogleLoginButton from '../../../components/ui/GoogleLoginButton'

const initialForm = {
  email: '',
  password: '',
  confirmPassword: '',
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')
const navigate=useNavigate()
  const errors = useMemo(() => validate(form), [form])
  const hasErrors = Object.keys(errors).length > 0

  const showError = (field) => touched[field] || submitted

  const handleChange = (field) => (event) => {
    const { value } = event.target
    setForm((prev) => ({ ...prev, [field]: value }))
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

      const res=await signUp({
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
      })
      if(res.success){
        // Redirect to sign-in page or dashboard after successful sign-up
        navigate('/signin')
      }

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
        title="Create your account"
        subtitle="Start building and testing APIs with your workspace."
        footer={
          <p>
            Already have an account?{' '}
            <Link className="font-medium text-highlight hover:underline" to="/signin">
              Sign in
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

          {apiError ? <p className="text-sm text-rose-300">{apiError}</p> : null}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Account'}
          </Button>

          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-white/15" />
            <span className="text-xs uppercase tracking-wide text-white/55">or</span>
            <span className="h-px flex-1 bg-white/15" />
          </div>

          <GoogleLoginButton />
        </form>
      </AuthCard>
    </main>
  )
}

export default SignUpPage
