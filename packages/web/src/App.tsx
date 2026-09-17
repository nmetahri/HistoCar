import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { Login } from "./pages/Login";
import { NotFound } from "./pages/NotFound";
import { VehiculeDetail } from "./pages/VehiculeDetail";
import { VehiculeList } from "./pages/VehiculeList";

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <VehiculeList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vehicules/:id"
            element={
              <ProtectedRoute>
                <VehiculeDetail />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
