import React from "react";
import {
  Container,
  Typography,
  Paper,
  Box,
  Stack,
  Card,
  CardContent,
  CardActions,
  Button,
} from "@mui/material";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import {
  Category as CategoryIcon,
  Inventory as InventoryIcon,
  TableBar as TableIcon,
  Assignment as LogIcon,
} from "@mui/icons-material";

const HomePage: React.FC = () => {
  const menuItems = [
    {
      title: "Kategoriler",
      description: "Kategori ekleme, düzenleme ve yönetimi",
      icon: <CategoryIcon fontSize="large" color="primary" />,
      path: "/categories",
    },
    {
      title: "Ürünler",
      description: "Ürün ekleme, düzenleme ve yönetimi",
      icon: <InventoryIcon fontSize="large" color="primary" />,
      path: "/products",
    },
    {
      title: "Masalar",
      description: "Masa yönetimi ve sipariş işlemleri",
      icon: <TableIcon fontSize="large" color="primary" />,
      path: "/tables",
    },
    {
      title: "İşlem Günlükleri",
      description: "Sistem günlüklerini görüntüleme",
      icon: <LogIcon fontSize="large" color="primary" />,
      path: "/logs",
    },
  ];

  return (
    <Layout>
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            POS Sistemi - Ana Sayfa
          </Typography>
          <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Hoş Geldiniz
            </Typography>
            <Typography variant="body1">
              Bu POS uygulaması, işletmenizin sipariş ve stok yönetimini
              kolaylaştırmak için tasarlanmıştır. Aşağıdaki menülerden
              istediğiniz bölüme erişebilirsiniz.
            </Typography>
          </Paper>

          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
            {menuItems.map((item) => (
              <Box
                key={item.title}
                sx={{ width: { xs: "100%", sm: "45%", md: "22%" }, mb: 3 }}
              >
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Box
                    sx={{ display: "flex", justifyContent: "center", pt: 2 }}
                  >
                    {item.icon}
                  </Box>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" component="h2" align="center">
                      {item.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      align="center"
                    >
                      {item.description}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      fullWidth
                      variant="contained"
                      component={Link}
                      to={item.path}
                    >
                      Git
                    </Button>
                  </CardActions>
                </Card>
              </Box>
            ))}
          </Stack>
        </Box>
      </Container>
    </Layout>
  );
};

export default HomePage;
