import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import LoginPage from "./pages/LoginPage";
import TablesPage from "./pages/TablesPage";
import TableDetailPage from "./pages/TableDetailPage";
import ProductsPage from "./pages/ProductsPage";
import CategoriesPage from "./pages/CategoriesPage";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import LogsPage from "./pages/LogsPage";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import CategoryManagementPage from "./pages/CategoryManagementPage";

// Tema
const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#dc004e",
    },
  },
});

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/tables"
              element={
                <ProtectedRoute>
                  <TablesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tables/:tableId"
              element={
                <ProtectedRoute>
                  <TableDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute>
                  <ProductsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/categories"
              element={
                <ProtectedRoute>
                  <CategoriesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/logs"
              element={
                <ProtectedRoute>
                  <LogsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/categories/management"
              element={
                <ProtectedRoute>
                  <CategoryManagementPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
