// wrapper/AuthWrapper.tsx
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'

export function AuthWrapper({ children }: { children: React.ReactNode }) {
    const initialize = useAuthStore((state) => state.initialize)

    useEffect(() => {
        initialize()
    }, [])

    return <>{children}</>
}
