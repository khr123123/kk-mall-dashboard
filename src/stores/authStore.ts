// stores/authStore.ts
import {create} from 'zustand'
import pb from '@/lib/pocketbase'

export type UserRecord = {
    id: string
    email: string
    name: string
    avatar: string
    created: string
    updated: string
}

type AuthState = {
    user: UserRecord | null
    isLogin: boolean
    initialized: boolean

    initialize: () => void
    logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isLogin: false,
    initialized: false,

    initialize: () => {
        // 同步 PocketBase 状态
        const sync = () => {
            set({
                user: pb.authStore.record as UserRecord | null,
                isLogin: pb.authStore.isValid,
                initialized: true,
            })
        }

        sync()
        pb.authStore.onChange(sync) // 监听变化
    },

    logout: () => {
        pb.authStore.clear()
    },
}))
