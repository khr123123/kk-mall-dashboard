import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Route, Routes } from "react-router"
import App from "./App"
import LoginPage from "@/pages/LoginPage"
import { Toaster } from "@/components/ui/sonner"
import { AuthWrapper } from "@/wrapper/AuthWrapper"
import { AuthCheck } from "@/wrapper/AuthCheck"
import { ThemeProvider } from "@/lib/theme"
import { setLocale } from "@/lib/i18n"
import "./index.css"

// Pages
import DashBoardPage from "@/pages/DashBoardPage"
import OrdersPage from "@/pages/OrdersPage"
import ProductsPage from "@/pages/ProductsPage"
import ProductFormPage from "@/pages/ProductFormPage"
import CatalogPage from "@/pages/CatalogPage"
import UsersPage from "@/pages/UsersPage"
import NotificationsPage from "@/pages/NotificationsPage"
import SettingsPage from "@/pages/SettingsPage"
import ChartPage from "@/pages/ChartPage"
import DataLibraryPage from "@/pages/DataLibraryPage"
import ReportsPage from "@/pages/ReportsPage"

// Initialise locale (reads from localStorage or defaults to zh-CN)
setLocale(
  (localStorage.getItem("kmall-locale") as "zh-CN" | "en-US" | "ja-JP" | "ko-KR") ?? "zh-CN"
)

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        {/* Skip-to-content link for keyboard / screen-reader users */}
        <a href="#main-content" className="skip-link">
          跳转到主要内容
        </a>

        <AuthWrapper>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<AuthCheck />}>
              <Route path="/" element={<App />}>
                <Route index element={<DashBoardPage />} />
                {/* Orders */}
                <Route path="/orders" element={<OrdersPage />} />
                {/* Keep old route for backward compatibility */}
                <Route path="/orderConsole" element={<OrdersPage />} />
                {/* Products */}
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/products/add" element={<ProductFormPage />} />
                <Route path="/products/edit/:id" element={<ProductFormPage />} />
                {/* Catalog (Categories & Brands) */}
                <Route path="/catalog" element={<CatalogPage />} />
                {/* Users */}
                <Route path="/users" element={<UsersPage />} />
                {/* Notifications */}
                <Route path="/notifications" element={<NotificationsPage />} />
                {/* Analytics & Reports */}
                <Route path="/chart" element={<ChartPage />} />
                <Route path="/dataLibrary" element={<DataLibraryPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                {/* Settings */}
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Routes>
        </AuthWrapper>
      </BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          classNames: {
            toast:
              "group border bg-background text-foreground shadow-md rounded-xl",
            description: "text-muted-foreground",
            actionButton: "bg-primary text-primary-foreground",
            cancelButton: "bg-muted text-muted-foreground",
          },
        }}
      />
    </ThemeProvider>
  </StrictMode>
)
