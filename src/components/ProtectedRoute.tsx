import React from "react";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Bu uygulama için basit bir koruma, gerçek bir kimlik doğrulama yoktur
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // Burada normalde oturum açma durumunu kontrol ederdik
  // Şimdilik her zaman erişime izin veriyoruz
  const isAuthenticated = true;

  if (!isAuthenticated) {
    // Eğer kimlik doğrulanmadıysa, login sayfasına yönlendir
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
