interface DebugBannerProps {
  enabled: boolean
}

export default function DebugBanner({ enabled }: DebugBannerProps) {
  if (!enabled) return null

  return (
    <div className="bg-red-600 text-white text-center py-1 text-sm font-medium">
      DEBUG MODE ACTIVE - Not for production use
    </div>
  )
}
