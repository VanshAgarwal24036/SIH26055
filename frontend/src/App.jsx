import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
  } from "react-router-dom";

  import { AuthProvider } from "./context/AuthContext";
  import ProtectedRoute from "./components/ProtectedRoute";

  import Login from "./pages/Login";
  import Dashboard from "./pages/Dashboard";

  export default function App() {
    return (
      <AuthProvider>
        <BrowserRouter>
          <Routes>

            <Route
              path="/login"
              element={<Login />}
            />

            <Route element={<ProtectedRoute />}>
              <Route
                path="/dashboard"
                element={<Dashboard />}
              />
            </Route>

            <Route
              path="*"
              element={
                <Navigate
                  to="/login"
                  replace
                />
              }
            />

          </Routes>
        </BrowserRouter>
      </AuthProvider>
    );
  }