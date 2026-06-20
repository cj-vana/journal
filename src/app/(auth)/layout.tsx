export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // Auth pages use neutral theme by default - no DB query needed for unauthenticated visitors.
  // After setup/login, the app layout provides the user's chosen theme.
  return (
    <div className="min-h-screen min-h-dvh bg-gradient-to-b from-cream-50 to-warm-100 flex items-center justify-center p-4" data-theme="neutral">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
