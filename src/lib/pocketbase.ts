import PocketBase from 'pocketbase'
import type {UserRecord} from "@/stores/authStore.ts";

const PB_URL = import.meta.env.VITE_PB_URL as string

if (!PB_URL) {
    throw new Error('VITE_PB_URL is not defined')
}

const pb = new PocketBase(PB_URL)

// 防止请求重复
pb.autoCancellation(true)

export default pb

export function getUserAvatarUrl(
    record: UserRecord,
    fileName: string
) {
    return pb.files.getURL(record, fileName)
}
