function AuthCard({ title, subtitle, children, footer }) {
  return (
    <section
      className="w-full max-w-md rounded-2xl border border-white/20 bg-black/35 p-6 shadow-2xl backdrop-blur-md sm:p-8"
      aria-labelledby="auth-title"
    >
      <header className="mb-6 space-y-2">
        <h1 id="auth-title" className="text-2xl font-bold text-white sm:text-3xl">
          {title}
        </h1>
        {subtitle ? <p className="text-sm leading-relaxed text-white/70">{subtitle}</p> : null}
      </header>

      {children}

      {footer ? <footer className="mt-5 text-sm text-white/70">{footer}</footer> : null}
    </section>
  )
}

export default AuthCard
