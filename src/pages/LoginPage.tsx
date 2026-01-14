import {useState} from "react"
import {LoginForm} from "@/components/login-form"
import catImg from "@/assets/kitten.png"
import catImg3 from "@/assets/kitten3.jpg"
import logo from "@/assets/logo.png"

export default function LoginPage() {
    const [backgroundImg, setBackgroundImg] = useState(catImg)

    const handlePasswordFocus = () => {
        setBackgroundImg(catImg3)
    }

    const handlePasswordBlur = () => {
        setBackgroundImg(catImg)
    }

    return (
        <div className="grid min-h-svh lg:grid-cols-2 bg-[#FCFCFC]">
            <div className="flex flex-col gap-4 p-6 md:p-10">
                <div className="flex justify-center gap-2 md:justify-start">
                    <a href="javascript:void(0)" className="flex items-center gap-2 font-medium">
                        <div
                            className="text-primary-foreground flex size-6 items-center justify-center rounded-md">
                            <img src={logo} alt="Logo"/>
                        </div>
                        <span className="font-mono">K Mall.</span>
                    </a>
                </div>
                <div className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-xs">
                        <LoginForm
                            onPasswordFocus={handlePasswordFocus}
                            onPasswordBlur={handlePasswordBlur}
                        />
                    </div>
                </div>
            </div>
            <div className="bg-muted relative hidden lg:block overflow-hidden">
                <img
                    src={catImg}
                    alt="Image"
                    className={`absolute inset-0 h-full w-full object-cover object-right dark:brightness-[0.2] dark:grayscale   ${
                        backgroundImg === catImg ? 'opacity-100' : 'opacity-0'
                    }`}
                />
                <img
                    src={catImg3}
                    alt="Image"
                    className={`absolute inset-0 h-full w-full object-cover object-right dark:brightness-[0.2] dark:grayscale  ${
                        backgroundImg === catImg3 ? 'opacity-100' : 'opacity-0'
                    }`}
                />
            </div>
        </div>
    )
}
