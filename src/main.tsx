import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {BrowserRouter, Route, Routes} from 'react-router'
import App from './App'
import SettingsPage from '@/pages/SettingsPage.tsx'
import LoginPage from '@/pages/LoginPage'
import {Toaster} from '@/components/ui/sonner'
import {AuthWrapper} from '@/wrapper/AuthWrapper'
import {AuthCheck} from '@/wrapper/AuthCheck'
import "./index.css"
import DashBoardPage from "@/pages/DashBoardPage.tsx";
import OrderConsolePage from "@/pages/OrderConsolePage.tsx";
import DataLibraryPage from "@/pages/DataLibraryPage.tsx";
import ReportsPage from "@/pages/ReportsPage.tsx";
import ChartPage from "@/pages/ChartPage.tsx";

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <AuthWrapper>
                <Routes>
                    <Route path="/login" element={<LoginPage/>}/>
                    <Route element={<AuthCheck/>}>
                        <Route path="/" element={<App/>}>
                            <Route index element={<DashBoardPage/>}/>
                            <Route path="/orderConsole" element={<OrderConsolePage/>}/>
                            <Route path="/chart" element={<ChartPage/>}/>
                            <Route path="/dataLibrary" element={<DataLibraryPage/>}/>
                            <Route path="/reports" element={<ReportsPage/>}/>
                            <Route path="/settings" element={<SettingsPage/>}/>
                        </Route>
                    </Route>
                </Routes>
            </AuthWrapper>
        </BrowserRouter>
        {/*全局组件*/}
        <Toaster position="top-center"/>
    </StrictMode>
)
