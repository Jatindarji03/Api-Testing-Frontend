import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { signIn } from '../../../api/auth/signInApi'
import AuthCard from '../../../components/ui/AuthCard'
import Button from '../../../components/ui/Button'
import FormField from '../../../components/ui/FormField'
import GoogleLoginButton from '../../../components/ui/GoogleLoginButton'
import { forgotPassword } from '../../../api/auth/forgotPasswordApi'
import { markAuthenticated } from '../../../utils/auth'
import { useUser } from '../../../context/useUser'
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
  const navigate = useNavigate()
  const location = useLocation()
  const { setUser } = useUser()
  const [form, setForm] = useState(initialForm)
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')
  const [isForgotOpen, setIsForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotTouched, setForgotTouched] = useState(false)

  const errors = useMemo(() => validate(form), [form])
  const hasErrors = Object.keys(errors).length > 0
  const forgotEmailError =
    forgotTouched && !/\S+@\S+\.\S+/.test(forgotEmail.trim())
      ? 'Please enter a valid email address.'
      : ''

  const showError = (field) => touched[field] || submitted
  const redirectPath = location.state?.from || '/workspace'

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
      const res = await signIn(form)
      const token =
        res?.data?.tokenInfo ??
        res?.tokenInfo ??
        res?.data?.token ??
        res?.token
      const user =
        res?.data?.user ??
        res?.user ??
        (res?.data?.userId ? { id: res.data.userId } : null) ??
        (res?.userId ? { id: res.userId } : null)
      if (token) {
        localStorage.setItem(
          'token',
          typeof token === 'string' ? token : JSON.stringify(token)
        )
      }
      if (user) {
        setUser(user)
      }
      markAuthenticated()
      navigate(redirectPath, { replace: true })
    } catch (error) {
      setApiError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const openForgotPassword = () => {
    setForgotEmail(form.email)
    setForgotTouched(false)
    setIsForgotOpen(true)
  }

  const closeForgotPassword = () => {
    setIsForgotOpen(false)
    setForgotTouched(false)
  }

  const handleForgotPasswordSubmit = async (event) => {
    event.preventDefault()
    setForgotTouched(true)

    if (!/\S+@\S+\.\S+/.test(forgotEmail.trim())) return
    try {
      setIsSubmitting(true)
      setApiError('')
      await forgotPassword({ email: forgotEmail })
    } catch (error) {
      setApiError(error.message)
    } finally {
      setIsSubmitting(false)
    }
    closeForgotPassword()
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
            <button
              type="button"
              className="text-highlight hover:underline"
              onClick={openForgotPassword}
            >
              Forgot password?
            </button>
          </div>

          {apiError ? <p className="text-sm text-rose-300">{apiError}</p> : null}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </Button>

          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-white/15" />
            <span className="text-xs uppercase tracking-wide text-white/55">or</span>
            <span className="h-px flex-1 bg-white/15" />
          </div>

          <GoogleLoginButton />
        </form>
      </AuthCard>

      {isForgotOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-bg-main p-6 shadow-2xl sm:p-7">
            <h2 className="text-xl font-semibold text-white">Reset password</h2>
            <p className="mt-2 text-sm text-white/70">
              Enter your email and we will send a reset password link.
            </p>

            <form className="mt-5 space-y-4" onSubmit={handleForgotPasswordSubmit} noValidate>
              <FormField
                id="forgot-email"
                type="email"
                label="Email"
                value={forgotEmail}
                onChange={(event) => setForgotEmail(event.target.value)}
                onBlur={() => setForgotTouched(true)}
                placeholder="aman@example.com"
                error={forgotEmailError || undefined}
                autoComplete="email"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeForgotPassword}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight/70"
                >
                  Cancel
                </button>
                <Button type="submit">Send Link</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  )
}

export default SignInPage
