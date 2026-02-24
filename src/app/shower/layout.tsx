export default function ShowerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-50 to-warm-100 flex items-center justify-center p-4" data-theme="neutral">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
