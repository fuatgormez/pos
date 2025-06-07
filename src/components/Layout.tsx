import React, { useState } from "react";
import {
  Outlet,
  useNavigate,
  useLocation,
  Link as RouterLink,
} from "react-router-dom";
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Button,
  Avatar,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Restaurant as RestaurantIcon,
  Inventory as InventoryIcon,
  AssessmentOutlined as ReportIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  Category as CategoryIcon,
  Dashboard as DashboardIcon,
  TableBar as TableIcon,
  Assignment as LogIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";

const drawerWidth = 240;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate("/login");
  };

  const menuItems = [
    { text: "Ana Sayfa", icon: <DashboardIcon />, path: "/" },
    { text: "Kategoriler", icon: <CategoryIcon />, path: "/categories" },
    { text: "Ürünler", icon: <InventoryIcon />, path: "/products" },
    { text: "Masalar", icon: <TableIcon />, path: "/tables" },
    { text: "İşlem Günlükleri", icon: <LogIcon />, path: "/logs" },
  ];

  const drawer = (
    <div>
      <Toolbar sx={{ justifyContent: "center" }}>
        <Typography variant="h6" noWrap component="div">
          POS Sistemi
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem
            key={item.text}
            disablePadding
            component={RouterLink}
            to={item.path}
          >
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {menuItems.find((item) => item.path === location.pathname)?.text ||
              "POS Sistemi"}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography variant="body1" sx={{ mr: 2 }}>
              {user?.name}
            </Typography>
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={() => logout()}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: "secondary.main" }}>
                {user?.name.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: "100vh",
        }}
      >
        <Toolbar />
        {children}
      </Box>

      <Menu
        id="menu-appbar"
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        keepMounted
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Profil</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Ayarlar</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Çıkış Yap</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Layout;
