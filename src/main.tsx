import {StrictMode} from "react"
import {createRoot} from "react-dom/client"
import "./index.css"
import App from "./App.tsx"
import {BrowserRouter, Route, Routes} from 'react-router'
import About from "@/pages/About.tsx";
import LoginPage from "./pages/LoginPage.tsx"

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter>
            <Routes>
                <Route path='/' element={<App/>}>
                </Route>
                <Route path='about' element={<About/>}></Route>
                <Route path='login' element={<LoginPage/>}></Route>
            </Routes>
        </BrowserRouter>
    </StrictMode>
)
