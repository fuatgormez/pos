import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  Tooltip,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Collapse,
  ListItemText,
  ListItem,
  List,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";
import Grid from "@mui/material/Grid";
import db from "../db/database";
import { Category, CategoryWithChildren } from "../models/types";

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryHierarchy, setCategoryHierarchy] = useState<
    CategoryWithChildren[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [dialogError, setDialogError] = useState("");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({
    open: false,
    message: "",
    severity: "success",
  });
  const [expandedCategories, setExpandedCategories] = useState<{
    [key: string]: boolean;
  }>({});

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const allCategories = await db.categories.getAll();
      const hierarchy = await db.categories.getHierarchy();
      setCategories(allCategories);
      setCategoryHierarchy(hierarchy);

      // Tüm ana kategorileri genişletilmiş olarak ayarla
      const expanded: { [key: string]: boolean } = {};
      hierarchy.forEach((cat) => {
        expanded[cat.id] = true;
      });
      setExpandedCategories(expanded);
    } catch (error) {
      console.error("Kategoriler yüklenirken hata oluştu:", error);
      showSnackbar("Kategoriler yüklenirken hata oluştu", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryName(category.name);
      setParentId(category.parentId);
    } else {
      setEditingCategory(null);
      setCategoryName("");
      setParentId(null);
    }
    setDialogError("");
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      setDialogError("Kategori adı boş olamaz");
      return;
    }

    try {
      if (editingCategory) {
        // Kategori güncelleme
        await db.categories.update(
          editingCategory.id,
          categoryName.trim(),
          parentId
        );
        showSnackbar("Kategori başarıyla güncellendi", "success");
      } else {
        // Yeni kategori ekleme
        await db.categories.add(categoryName.trim(), parentId);
        showSnackbar("Kategori başarıyla eklendi", "success");
      }
      await loadCategories();
      handleCloseDialog();
    } catch (error) {
      console.error("Kategori kaydedilirken hata oluştu:", error);
      showSnackbar("Kategori kaydedilirken bir hata oluştu", "error");
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (window.confirm("Bu kategoriyi silmek istediğinizden emin misiniz?")) {
      try {
        await db.categories.delete(categoryId);
        showSnackbar("Kategori başarıyla silindi", "success");
        await loadCategories();
      } catch (error) {
        console.error("Kategori silinirken hata oluştu:", error);
        if (error instanceof Error) {
          showSnackbar(error.message, "error");
        } else {
          showSnackbar("Kategori silinirken bir hata oluştu", "error");
        }
      }
    }
  };

  const toggleCategoryExpand = (categoryId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
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

  const getCategoryPath = (category: Category): string => {
    if (!category.parentId) return category.name;

    const parentCategory = categories.find((c) => c.id === category.parentId);
    if (!parentCategory) return category.name;

    return `${parentCategory.name} > ${category.name}`;
  };

  const addBakeryCategories = async () => {
    setLoading(true);
    try {
      const bakeryData = [
        {
          kategorie: "Backwaren",
          unterkategorien: [
            {
              name: "Brot",
              produkte: [
                "Weizenbrot",
                "Roggenbrot",
                "Vollkornbrot",
                "Dinkelbrot",
              ],
            },
            {
              name: "Brötchen",
              produkte: [
                "Klassische Brötchen",
                "Körnerbrötchen",
                "Laugenbrötchen",
              ],
            },
          ],
        },
        {
          kategorie: "Feingebäck",
          unterkategorien: [
            {
              name: "Croissants & Plundergebäck",
              produkte: ["Buttercroissant", "Schokocroissant", "Apfeltasche"],
            },
            {
              name: "Blätterteiggebäck",
              produkte: ["Kirschtasche", "Nuss-Schnecke"],
            },
          ],
        },
        {
          kategorie: "Kuchen & Torten",
          unterkategorien: [
            {
              name: "Kuchen",
              produkte: ["Marmorkuchen", "Zitronenkuchen", "Streuselkuchen"],
            },
            {
              name: "Torten",
              produkte: [
                "Schwarzwälder Kirschtorte",
                "Sachertorte",
                "Erdbeertorte",
              ],
            },
          ],
        },
        {
          kategorie: "Kleingebäck & Süßes",
          unterkategorien: [
            {
              name: "Donuts & Muffins",
              produkte: ["Schokodonuts", "Vanilledonuts", "Blaubeermuffins"],
            },
            {
              name: "Cookies & Kekse",
              produkte: ["Schokokekse", "Haferflockenkekse"],
            },
          ],
        },
        {
          kategorie: "Snacks & Herzhaftes",
          unterkategorien: [
            {
              name: "Belegte Brötchen",
              produkte: ["Mit Käse", "Mit Wurst", "Mit Ei"],
            },
            {
              name: "Laugengebäck",
              produkte: ["Brezel", "Laugenstange"],
            },
            {
              name: "Warme Snacks",
              produkte: ["Mini-Pizza", "Quiche", "Blätterteig mit Spinat"],
            },
          ],
        },
        {
          kategorie: "Getränke",
          unterkategorien: [
            {
              name: "Kaffee & Tee",
              produkte: ["Espresso", "Cappuccino", "Schwarzer Tee"],
            },
            {
              name: "Kaltgetränke",
              produkte: ["Orangensaft", "Mineralwasser", "Kakao"],
            },
          ],
        },
      ];

      for (const mainCategory of bakeryData) {
        // Ana kategoriyi ekle
        const mainCat = await db.categories.add(mainCategory.kategorie);

        // Alt kategorileri ekle
        for (const subCategory of mainCategory.unterkategorien) {
          const subCat = await db.categories.add(subCategory.name, mainCat.id);

          // Ürünleri ekle
          for (const productName of subCategory.produkte) {
            await db.products.add({
              name: productName,
              price: Math.floor(Math.random() * 30 + 10) / 10, // 1.0 - 4.0 arası rastgele fiyat
              categoryId: subCat.id,
              isWeighted: false,
            });
          }
        }
      }

      showSnackbar("Kategoriler ve ürünler başarıyla eklendi", "success");
      await loadCategories();
    } catch (error) {
      console.error("Kategoriler eklenirken hata oluştu:", error);
      showSnackbar("Kategoriler eklenirken hata oluştu", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Typography variant="h4" component="h1">
          Kategoriler
        </Typography>
        <Box>
          <Button
            variant="outlined"
            onClick={addBakeryCategories}
            sx={{ mr: 2 }}
          >
            Örnek Kategorileri Ekle
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Kategori Ekle
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2}>
          <Grid size={12}>
            <Paper elevation={3} sx={{ borderRadius: 2, overflow: "hidden" }}>
              {categoryHierarchy.length === 0 ? (
                <Box p={3} textAlign="center">
                  <Typography variant="body1" color="textSecondary">
                    Henüz kategori bulunmuyor. Kategori eklemek için "Kategori
                    Ekle" butonunu kullanın.
                  </Typography>
                </Box>
              ) : (
                <List>
                  {categoryHierarchy.map((mainCategory) => (
                    <React.Fragment key={mainCategory.id}>
                      <ListItem
                        divider
                        secondaryAction={
                          <Box>
                            <IconButton
                              color="primary"
                              onClick={() => handleOpenDialog(mainCategory)}
                              size="small"
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              color="error"
                              onClick={() =>
                                handleDeleteCategory(mainCategory.id)
                              }
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        }
                      >
                        <Box
                          onClick={() => toggleCategoryExpand(mainCategory.id)}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            cursor: "pointer",
                            width: "100%",
                          }}
                        >
                          {expandedCategories[mainCategory.id] ? (
                            <ExpandLessIcon />
                          ) : (
                            <ExpandMoreIcon />
                          )}
                          <ListItemText
                            primary={mainCategory.name}
                            secondary={`${
                              mainCategory.children?.length || 0
                            } alt kategori`}
                          />
                        </Box>
                      </ListItem>

                      <Collapse
                        in={expandedCategories[mainCategory.id]}
                        timeout="auto"
                        unmountOnExit
                      >
                        <List component="div" disablePadding>
                          {mainCategory.children?.map((subCategory) => (
                            <ListItem
                              key={subCategory.id}
                              sx={{ pl: 4 }}
                              secondaryAction={
                                <Box>
                                  <IconButton
                                    color="primary"
                                    onClick={() =>
                                      handleOpenDialog(subCategory)
                                    }
                                    size="small"
                                  >
                                    <EditIcon />
                                  </IconButton>
                                  <IconButton
                                    color="error"
                                    onClick={() =>
                                      handleDeleteCategory(subCategory.id)
                                    }
                                    size="small"
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => {
                                      // Alt kategoriye ürün eklemek için ürünler sayfasına yönlendir
                                    }}
                                    sx={{ ml: 1 }}
                                  >
                                    Ürünler
                                  </Button>
                                </Box>
                              }
                            >
                              <ListItemText
                                primary={subCategory.name}
                                secondary={`${mainCategory.name} altında`}
                              />
                            </ListItem>
                          ))}
                          <ListItem sx={{ pl: 4, pt: 1, pb: 1 }}>
                            <Button
                              startIcon={<AddIcon />}
                              onClick={() => {
                                setParentId(mainCategory.id);
                                setCategoryName("");
                                setEditingCategory(null);
                                setOpenDialog(true);
                              }}
                              variant="text"
                            >
                              Alt Kategori Ekle
                            </Button>
                          </ListItem>
                        </List>
                      </Collapse>
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Kategori Ekleme/Düzenleme Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>
          {editingCategory ? "Kategori Düzenle" : "Yeni Kategori Ekle"}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Kategori Adı"
            fullWidth
            variant="outlined"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            error={!!dialogError}
            helperText={dialogError}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth variant="outlined">
            <InputLabel id="parent-category-label">Üst Kategori</InputLabel>
            <Select
              labelId="parent-category-label"
              id="parent-category"
              value={parentId || ""}
              onChange={(e) =>
                setParentId(e.target.value === "" ? null : e.target.value)
              }
              label="Üst Kategori"
            >
              <MenuItem value="">
                <em>Ana Kategori</em>
              </MenuItem>
              {categories
                .filter(
                  (c) =>
                    c.parentId === null &&
                    (!editingCategory || c.id !== editingCategory.id)
                )
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
          <Button
            onClick={handleSaveCategory}
            variant="contained"
            color="primary"
          >
            {editingCategory ? "Güncelle" : "Ekle"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Kategori Ekle FAB (Mobil için) */}
      <Tooltip title="Kategori Ekle" placement="left">
        <Fab
          color="primary"
          sx={{ position: "fixed", bottom: 20, right: 20 }}
          onClick={() => handleOpenDialog()}
        >
          <AddIcon />
        </Fab>
      </Tooltip>
    </Container>
  );
};

export default CategoriesPage;
