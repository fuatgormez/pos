import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { v4 as uuidv4 } from "uuid";
import { Category, JsonCategory } from "../models/types";
import FileService from "../services/FileService";
import db from "../db/database";

const CategoryManagementPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [jsonCategories, setJsonCategories] = useState<JsonCategory[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Partial<Category>>({});
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({
    open: false,
    message: "",
    severity: "info",
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      // Veritabanından kategorileri yükle
      const dbCategories = await db.categories.getAll();
      setCategories(dbCategories);

      // JSON dosyasından kategorileri yükle
      const fileCategories = await FileService.readCategories();
      setJsonCategories(fileCategories);
    } catch (error) {
      console.error("Kategoriler yüklenirken hata oluştu:", error);
      showSnackbar("Kategoriler yüklenirken hata oluştu", "error");
    }
  };

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setCurrentCategory({ ...category });
      setEditMode(true);
    } else {
      setCurrentCategory({ name: "", parentId: null });
      setEditMode(false);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentCategory({});
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setCurrentCategory((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e: any) => {
    const value = e.target.value === "" ? null : e.target.value;
    setCurrentCategory((prev) => ({
      ...prev,
      parentId: value as string | null,
    }));
  };

  const handleSaveCategory = async () => {
    if (!currentCategory.name) return;

    try {
      let updatedCategories: Category[];

      if (editMode && currentCategory.id) {
        // Kategoriyi güncelle
        await db.categories.update(
          currentCategory.id,
          currentCategory.name!,
          currentCategory.parentId
        );
        updatedCategories = categories.map((cat) =>
          cat.id === currentCategory.id
            ? ({ ...cat, ...currentCategory } as Category)
            : cat
        );
      } else {
        // Yeni kategori ekle
        const newCategory: Omit<Category, "createdAt" | "updatedAt"> = {
          id: uuidv4(),
          name: currentCategory.name!,
          parentId: currentCategory.parentId || null,
        };
        await db.categories.add(newCategory.name, newCategory.parentId);
        updatedCategories = [...categories, newCategory as Category];
      }

      setCategories(updatedCategories);

      // JSON dosyasını da güncelle
      const jsonCategoryList: JsonCategory[] = updatedCategories.map(
        ({ id, name, parentId }) => ({
          id,
          name,
          parentId,
        })
      );
      setJsonCategories(jsonCategoryList);
      await FileService.saveCategories(jsonCategoryList);

      handleCloseDialog();
      showSnackbar("Kategori başarıyla kaydedildi", "success");
    } catch (error) {
      console.error("Kategori kaydedilirken hata oluştu:", error);
      showSnackbar("Kategori kaydedilemedi", "error");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await db.categories.delete(id);
      const updatedCategories = categories.filter((cat) => cat.id !== id);
      setCategories(updatedCategories);

      // JSON dosyasını da güncelle
      const jsonCategoryList: JsonCategory[] = updatedCategories.map(
        ({ id, name, parentId }) => ({
          id,
          name,
          parentId,
        })
      );
      setJsonCategories(jsonCategoryList);
      await FileService.saveCategories(jsonCategoryList);

      showSnackbar("Kategori başarıyla silindi", "success");
    } catch (error) {
      console.error("Kategori silinirken hata oluştu:", error);
      showSnackbar("Kategori silinemedi", "error");
    }
  };

  const saveToJson = async () => {
    try {
      // Sadece gerekli alanları içeren JSON listesi oluştur
      const jsonCategoryList: JsonCategory[] = categories.map(
        ({ id, name, parentId }) => ({
          id,
          name,
          parentId,
        })
      );

      await FileService.saveCategories(jsonCategoryList);
      setJsonCategories(jsonCategoryList);
      showSnackbar("Kategoriler JSON dosyasına kaydedildi", "success");
    } catch (error) {
      console.error("JSON dosyası kaydedilirken hata oluştu:", error);
      showSnackbar("JSON dosyası kaydedilemedi", "error");
    }
  };

  const syncFromJson = async () => {
    try {
      const fileCategories = await FileService.readCategories();

      // Her bir JSON kategorisini veritabanına ekle veya güncelle
      for (const category of fileCategories) {
        const existingCategory = categories.find((c) => c.id === category.id);

        if (existingCategory) {
          // Varsa güncelle
          await db.categories.update(
            category.id,
            category.name,
            category.parentId
          );
        } else {
          // Yoksa ekle
          await db.categories.add(category.name, category.parentId);
        }
      }

      // Veritabanındaki kategorileri yeniden yükle
      const dbCategories = await db.categories.getAll();
      setCategories(dbCategories);
      setJsonCategories(fileCategories);

      showSnackbar("Kategoriler JSON dosyasından senkronize edildi", "success");
    } catch (error) {
      console.error("JSON dosyasından senkronizasyon hatası:", error);
      showSnackbar("JSON dosyasından senkronizasyon başarısız", "error");
    }
  };

  const showSnackbar = (
    message: string,
    severity: "success" | "error" | "info" | "warning"
  ) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getCategoryName = (id: string | null): string => {
    if (!id) return "Ana Kategori";
    const category = categories.find((cat) => cat.id === id);
    return category ? category.name : "Bilinmeyen Kategori";
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h4" component="h1">
          Kategori Yönetimi
        </Typography>
        <Box>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={saveToJson}
            sx={{ mr: 1 }}
          >
            JSON'a Kaydet
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<SaveIcon />}
            onClick={syncFromJson}
            sx={{ mr: 1 }}
          >
            JSON'dan Senkronize Et
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Yeni Kategori
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Kategoriler
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Ad</TableCell>
                <TableCell>Üst Kategori</TableCell>
                <TableCell>İşlemler</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>{category.id}</TableCell>
                  <TableCell>{category.name}</TableCell>
                  <TableCell>{getCategoryName(category.parentId)}</TableCell>
                  <TableCell>
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenDialog(category)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteCategory(category.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          JSON Kategorileri
        </Typography>
        <TableContainer sx={{ maxHeight: 300 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Ad</TableCell>
                <TableCell>Üst Kategori</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {jsonCategories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>{category.id}</TableCell>
                  <TableCell>{category.name}</TableCell>
                  <TableCell>{getCategoryName(category.parentId)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Kategori Ekle/Düzenle Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>
          {editMode ? "Kategori Düzenle" : "Yeni Kategori Ekle"}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Kategori Adı"
            fullWidth
            variant="outlined"
            value={currentCategory.name || ""}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel id="parent-category-label">Üst Kategori</InputLabel>
            <Select
              labelId="parent-category-label"
              id="parent-category"
              value={currentCategory.parentId || ""}
              onChange={handleSelectChange}
              label="Üst Kategori"
            >
              <MenuItem value="">
                <em>Ana Kategori (Üst Kategori Yok)</em>
              </MenuItem>
              {categories
                .filter((cat) => cat.id !== currentCategory.id) // Kendisini üst kategori olarak seçmeyi engelle
                .map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>İptal</Button>
          <Button onClick={handleSaveCategory} variant="contained">
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bildirim Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CategoryManagementPage;
