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
    const handelOAuth2Login = async (provider: string) => {
        setLoading(true)
        try {
            await pb.collection('users').authWithOAuth2({provider})
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
                    <Button variant="outline" type="button" className={"cursor-pointer"}
                            onClick={() => handelOAuth2Login("google")}>
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
                    <Button variant="outline" type="button" className={"cursor-pointer"}
                            onClick={() => handelOAuth2Login("github")}>
                        <svg className={"size-5 mr-2"} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path
                                d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                                fill="currentColor"
                            />
                        </svg>
                        Login with GitHub
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
