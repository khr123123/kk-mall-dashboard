// wrapper/AuthCheck.tsx
import {Navigate, Outlet} from 'react-router'
import {useAuthStore} from '@/stores/authStore'
import { Skeleton } from "@/components/ui/skeleton"
export function AuthCheck() {
    const {isLogin, initialized} = useAuthStore()
    if (!initialized) {
        return  <Skeleton className="h-screen w-screen" />
    }
    if (!isLogin) {
        return <Navigate to="/login" replace/>
    }
    return <Outlet/>
}
