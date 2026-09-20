import { BrowserRouter, Route, Routes } from "react-router-dom";
import { InstallPrompt } from "@/components/InstallPrompt";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthProvider } from "@/context/AuthContext";
import { Login } from "@/pages/Login";
import { NotFound } from "@/pages/NotFound";
import { Register } from "@/pages/Register";
import { VehicleDetail } from "@/pages/VehicleDetail";
import { VehicleList } from "@/pages/VehicleList";

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <InstallPrompt />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <VehicleList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vehicles/:id"
            element={
              <ProtectedRoute>
                <VehicleDetail />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
