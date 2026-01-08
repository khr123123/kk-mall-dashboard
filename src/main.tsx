import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {BrowserRouter, Route, Routes} from 'react-router'
import App from './App'
import About from '@/pages/About'
import LoginPage from '@/pages/LoginPage'
import {Toaster} from '@/components/ui/sonner'
import {AuthWrapper} from '@/wrapper/AuthWrapper'
import {AuthCheck} from '@/wrapper/AuthCheck'
import "./index.css"

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <AuthWrapper>
                <Routes>
                    <Route path="/login" element={<LoginPage/>}/>
                    <Route element={<AuthCheck/>}>
                        <Route path="/" element={<App/>}/>
                        <Route path="/about" element={<About/>}/>
                    </Route>
                </Routes>
            </AuthWrapper>
        </BrowserRouter>
        {/*全局组件*/}
        <Toaster position="top-center"/>
    </StrictMode>
)
