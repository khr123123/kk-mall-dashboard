import {cn} from "@/lib/utils"
import {Button} from "@/components/ui/button"
import {Field, FieldDescription, FieldGroup, FieldLabel, FieldSeparator,} from "@/components/ui/field"
import {Input} from "@/components/ui/input"
import pb from "@/lib/pocketbase.ts";
import {useState} from "react";
import {useNavigate} from "react-router";
import {toast} from "sonner"
import {Spinner} from "@/components/ui/spinner.tsx";
import {ClientResponseError} from "pocketbase";

export function LoginForm({
                              className,
                              ...props
                          }: React.ComponentProps<"form">) {
    const Navigate = useNavigate()

    const [email, setEmail] = useState<string>('')
    const [password, setPassword] = useState<string>('')
    const [loading, setLoading] = useState<boolean>(false)

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        try {
            await pb.collection('_superusers').authWithPassword(email, password)
            toast.success("Login Success.")
            Navigate('/')
        } catch (err) {
            const pbError = err as ClientResponseError
            const msg = pbError.status === 0 ? "Do not submit repeatedly!" : pbError.message
            toast.error(msg)
        } finally {
            setLoading(false)
        }
    }
    const googleLoginHandel = async () => {
        setLoading(true)
        try {
            await pb.collection('users').authWithOAuth2({provider: 'google'})
            toast.success("Login Success.")
            Navigate('/')
        } catch (err) {
            const pbError = err as ClientResponseError
            const msg = pbError.status === 0 ? "Do not submit repeatedly!" : pbError.message
            toast.error(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <form className={cn("flex flex-col gap-6", className)} {...props} onSubmit={handleLogin}>
            <FieldGroup>
                <div className="flex flex-col items-center gap-1 text-center">
                    <h1 className="text-2xl font-bold">Welcome back</h1>
                    <p className="text-muted-foreground text-sm text-balance">
                        Enter your email below to login to your account
                    </p>
                </div>
                <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input id="email" type="email" placeholder="m@example.com" required value={email}
                           onChange={(e) => setEmail(e.target.value)}/>
                </Field>
                <Field>
                    <div className="flex items-center">
                        <FieldLabel htmlFor="password">Password</FieldLabel>
                        <a
                            href="script:void(0)"
                            className="ml-auto text-sm underline-offset-4 hover:underline"
                            onClick={() =>
                                toast.info("Please contact the supervisor！")
                            }
                        >
                            Forgot your password?
                        </a>

                    </div>
                    <Input id="password" type="password" required value={password}
                           onChange={(e) => setPassword(e.target.value)}/>
                </Field>
                <Field>
                    <Button type="submit" className="cursor-pointer">{loading && <Spinner/>}Login</Button>
                </Field>
                <FieldSeparator>Or continue with</FieldSeparator>
                <Field>
                    <Button variant="outline" type="button" className={"cursor-pointer"} onClick={googleLoginHandel}>
                        <svg className={"size-5 mr-2"} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                            <path fill="#EA4335"
                                  d="M24 9.5c3.54 0 6.02 1.53 7.41 2.8l5.41-5.41C33.6 3.87 29.2 2 24 2 14.73 2 6.98 7.37 3.69 15.16l6.98 5.41C12.3 14.5 17.67 9.5 24 9.5z"/>
                            <path fill="#4285F4"
                                  d="M46 24c0-1.57-.14-3.08-.4-4.54H24v9.02h12.45c-.54 2.91-2.17 5.38-4.61 7.03l7.11 5.53C43.27 37.2 46 31.06 46 24z"/>
                            <path fill="#FBBC05"
                                  d="M10.67 28.57A14.47 14.47 0 0 1 9.9 24c0-1.58.27-3.11.77-4.57l-6.98-5.41A23.93 23.93 0 0 0 2 24c0 3.88.93 7.55 2.69 10.98l6.98-5.41z"/>
                            <path fill="#34A853"
                                  d="M24 46c5.2 0 9.6-1.71 12.8-4.66l-7.11-5.53c-1.98 1.33-4.52 2.12-5.69 2.12-6.33 0-11.7-5-13.33-11.07l-6.98 5.41C6.98 40.63 14.73 46 24 46z"/>
                        </svg>
                        Login with Google
                    </Button>
                    <FieldDescription className="text-center">
                        Don&apos;t have an account?{" "}
                        <a href="#" className="underline underline-offset-4">
                            Sign up
                        </a>
                    </FieldDescription>
                </Field>
            </FieldGroup>
        </form>
    )
}
