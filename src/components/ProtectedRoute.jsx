import { useAuthStore } from '../store/store'

export const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin">
            <div className="text-4xl">✨</div>
          </div>
          <p className="text-dark-300 mt-4">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    window.location.href = '/login'
    return null
  }

  return children
}
