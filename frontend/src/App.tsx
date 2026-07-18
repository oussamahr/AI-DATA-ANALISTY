import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth'
import { AppRoutes } from '@/routes'

function App() {
  const { initialize, isInitialized } = useAuthStore()

  useEffect(() => {
    if (!isInitialized) {
      initialize()
    }
  }, [initialize, isInitialized])

  return <AppRoutes />
}

export default App
