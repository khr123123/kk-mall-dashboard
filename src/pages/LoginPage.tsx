/**
 * LoginPage — Authentication Entry
 *
 * Design:
 * - Split-screen layout: form on left, brand image on right
 * - Accessible: semantic <main>, labeled form, focus management
 * - Fun interaction: password focus changes background image
 * - Brand image hidden on mobile (space preserved for form)
 * - bg-background used for correct theme adaptation
 */

import { useState } from "react"
import { LoginForm } from "@/components/login-form"
import catImg  from "@/assets/kitten.png"
import catImg3 from "@/assets/kitten3.jpg"
import logo    from "@/assets/logo.png"

export default function LoginPage() {
  const [backgroundImg, setBackgroundImg] = useState(catImg)

  return (
    <div className="grid min-h-svh lg:grid-cols-2 bg-background">
      {/* ── Left: Form panel ── */}
      <main className="flex flex-col gap-4 p-6 md:p-10" id="main-content">
        {/* Brand */}
        <header>
          <div className="flex justify-center gap-2 md:justify-start">
            <span className="flex items-center gap-2 font-medium" aria-label="K Mall 管理后台">
              <div
                className="flex size-6 items-center justify-center rounded-md"
                aria-hidden="true"
              >
                <img src={logo} alt="" className="size-5 object-contain" />
              </div>
              <span className="font-mono text-base font-semibold">K Mall.</span>
            </span>
          </div>
        </header>

        {/* Form */}
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm
              onPasswordFocus={() => setBackgroundImg(catImg3)}
              onPasswordBlur={() => setBackgroundImg(catImg)}
            />
          </div>
        </div>

        {/* Footer */}
        <footer>
          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} K Mall · 安全登录
          </p>
        </footer>
      </main>

      {/* ── Right: Brand image (decorative) ── */}
      <div
        className="relative hidden lg:block overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute inset-0 transition-all duration-500 ease-in-out dark:brightness-[0.2] dark:grayscale"
          style={{
            backgroundImage: `url(${backgroundImg})`,
            backgroundSize: "cover",
            backgroundPosition: "center right",
          }}
        />
        {/* Overlay gradient for legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </div>
    </div>
  )
}
