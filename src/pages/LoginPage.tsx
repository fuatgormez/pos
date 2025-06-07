import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  Alert,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      setError("Lütfen kullanıcı adı ve şifre giriniz");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const success = await login(username, password);

      if (success) {
        navigate("/");
      } else {
        setError("Kullanıcı adı veya şifre hatalı");
      }
    } catch (error) {
      setError("Giriş sırasında bir hata oluştu");
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ mt: 8 }}>
      <Paper
        elevation={3}
        sx={{
          p: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          borderRadius: 2,
        }}
      >
        <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
          POS Sistemi Girişi
        </Typography>

        {error && (
          <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="Kullanıcı Adı"
            name="username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Şifre"
            type={showPassword ? "text" : "password"}
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="şifre görünürlüğünü değiştir"
                    onClick={handleTogglePasswordVisibility}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            sx={{ mt: 3, mb: 2, py: 1.5 }}
            disabled={loading}
          >
            {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
          </Button>

          <Typography variant="body2" color="textSecondary" align="center">
            * Kullanıcı adı: admin, Şifre: admin
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default LoginPage;
