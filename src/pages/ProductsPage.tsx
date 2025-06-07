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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
  Divider,
  Tooltip,
  ListSubheader,
  Card,
  CardContent,
  CardActions,
  InputAdornment,
  Tab,
  Tabs,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  AddCircleOutline as AddVariantIcon,
  ArrowBack as ArrowBackIcon,
  FilterList as FilterIcon,
  Category as CategoryIcon,
} from "@mui/icons-material";
import db from "../db/database";
import {
  Product,
  Category,
  ProductVariant,
  ProductFormData,
  CategoryWithChildren,
} from "../models/types";

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryHierarchy, setCategoryHierarchy] = useState<
    CategoryWithChildren[]
  >([]);
  const [variants, setVariants] = useState<Record<string, ProductVariant[]>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    price: 0,
    categoryId: null,
    isWeighted: false,
    variants: [],
  });
  const [categoryName, setCategoryName] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [currentView, setCurrentView] = useState<"table" | "grid">("table");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allProducts, allCategories, categoryHierarchyData] =
        await Promise.all([
          db.products.getAll(),
          db.categories.getAll(),
          db.categories.getHierarchy(),
        ]);

      setProducts(allProducts);
      setCategories(allCategories);
      setCategoryHierarchy(categoryHierarchyData);

      // Tüm ürünlerin varyantlarını yükle
      const productVariants: Record<string, ProductVariant[]> = {};

      for (const product of allProducts) {
        const productVariantList = await db.variants.getByProduct(product.id);
        productVariants[product.id] = productVariantList;
      }

      setVariants(productVariants);
    } catch (error) {
      console.error("Veri yüklenirken hata oluştu:", error);
      showSnackbar("Veri yüklenirken hata oluştu", "error");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      price: 0,
      categoryId: null,
      isWeighted: false,
      variants: [],
    });
    setEditingProduct(null);
  };

  const handleOpenDialog = (product?: Product) => {
    resetForm();

    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        price: product.price,
        categoryId: product.categoryId,
        isWeighted: product.isWeighted,
        variants: variants[product.id]
          ? variants[product.id].map((v) => ({
              name: v.name,
              price: v.price,
            }))
          : [],
      });
    }

    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleOpenCategoryDialog = () => {
    setCategoryName("");
    setOpenCategoryDialog(true);
  };

  const handleCloseCategoryDialog = () => {
    setOpenCategoryDialog(false);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "price" ? parseFloat(value) || 0 : value,
    });
  };

  const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      isWeighted: e.target.checked,
    });
  };

  const handleCategoryChange = (
    event:
      | React.ChangeEvent<HTMLInputElement>
      | (Event & { target: { value: string; name: string } })
  ) => {
    setFormData({
      ...formData,
      categoryId: event.target.value === "" ? null : event.target.value,
    });
  };

  const handleAddVariant = () => {
    setFormData({
      ...formData,
      variants: [...formData.variants, { name: "", price: 0 }],
    });
  };

  const handleVariantChange = (
    index: number,
    field: "name" | "price",
    value: string | number
  ) => {
    const updatedVariants = [...formData.variants];

    if (field === "price") {
      updatedVariants[index][field] =
        typeof value === "string" ? parseFloat(value) || 0 : value;
    } else {
      updatedVariants[index][field] = value as string;
    }

    setFormData({
      ...formData,
      variants: updatedVariants,
    });
  };

  const handleRemoveVariant = (index: number) => {
    const updatedVariants = [...formData.variants];
    updatedVariants.splice(index, 1);
    setFormData({
      ...formData,
      variants: updatedVariants,
    });
  };

  const handleSaveProduct = async () => {
    try {
      if (editingProduct) {
        // Ürünü güncelle
        await db.products.update(editingProduct.id, {
          name: formData.name,
          price: formData.price,
          categoryId: formData.categoryId,
          isWeighted: formData.isWeighted,
        });

        // Mevcut varyantları sil
        const existingVariants = variants[editingProduct.id] || [];
        for (const variant of existingVariants) {
          await db.variants.delete(variant.id);
        }

        // Yeni varyantları ekle
        for (const variantData of formData.variants) {
          await db.variants.add({
            productId: editingProduct.id,
            name: variantData.name,
            price: variantData.price,
          });
        }

        showSnackbar("Ürün başarıyla güncellendi", "success");
      } else {
        // Yeni ürün ekle
        const newProduct = await db.products.add({
          name: formData.name,
          price: formData.price,
          categoryId: formData.categoryId,
          isWeighted: formData.isWeighted,
        });

        // Varyantları ekle
        for (const variantData of formData.variants) {
          await db.variants.add({
            productId: newProduct.id,
            name: variantData.name,
            price: variantData.price,
          });
        }

        showSnackbar("Ürün başarıyla eklendi", "success");
      }

      await loadData();
      handleCloseDialog();
    } catch (error) {
      console.error("Ürün kaydedilirken hata oluştu:", error);
      showSnackbar("Ürün kaydedilirken bir hata oluştu", "error");
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) return;

    try {
      await db.categories.add(categoryName.trim());
      showSnackbar("Kategori başarıyla eklendi", "success");
      await loadData();
      handleCloseCategoryDialog();
    } catch (error) {
      console.error("Kategori eklenirken hata oluştu:", error);
      showSnackbar("Kategori eklenirken bir hata oluştu", "error");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm("Bu ürünü silmek istediğinizden emin misiniz?")) {
      try {
        await db.products.delete(productId);
        showSnackbar("Ürün başarıyla silindi", "success");
        await loadData();
      } catch (error) {
        console.error("Ürün silinirken hata oluştu:", error);
        showSnackbar("Ürün silinirken bir hata oluştu", "error");
      }
    }
  };

  const getCategoryName = (categoryId: string | null): string => {
    if (!categoryId) return "Kategorisiz";
    const category = categories.find((c) => c.id === categoryId);
    return category ? category.name : "Kategorisiz";
  };

  const getCategoryPath = (categoryId: string | null): string => {
    if (!categoryId) return "Kategorisiz";

    const category = categories.find((c) => c.id === categoryId);
    if (!category) return "Kategorisiz";

    if (category.parentId) {
      const parentCategory = categories.find((c) => c.id === category.parentId);
      if (parentCategory) {
        return `${parentCategory.name} > ${category.name}`;
      }
    }

    return category.name;
  };

  const filterProductsByCategory = (categoryId: string | null): Product[] => {
    if (!categoryId) return products;

    // Seçilen kategori bir alt kategoriyse, sadece o kategoriye ait ürünleri göster
    const category = categories.find((c) => c.id === categoryId);
    if (category && category.parentId) {
      return products.filter((p) => p.categoryId === categoryId);
    }

    // Seçilen kategori bir ana kategoriyse, tüm alt kategorilerindeki ürünleri de göster
    const childCategories = categories.filter((c) => c.parentId === categoryId);
    const allCategoryIds = [categoryId, ...childCategories.map((c) => c.id)];

    return products.filter(
      (p) => p.categoryId && allCategoryIds.includes(p.categoryId)
    );
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

  const renderCategorySelect = () => {
    return (
      <FormControl fullWidth variant="outlined" margin="normal">
        <InputLabel id="category-select-label">Kategori</InputLabel>
        <Select
          labelId="category-select-label"
          id="category-select"
          value={selectedCategoryId || ""}
          onChange={(e) =>
            setSelectedCategoryId(e.target.value === "" ? null : e.target.value)
          }
          label="Kategori"
        >
          <MenuItem value="">
            <em>Tüm Ürünler</em>
          </MenuItem>

          {categoryHierarchy.map((mainCategory) => [
            <ListSubheader key={`header-${mainCategory.id}`}>
              {mainCategory.name}
            </ListSubheader>,
            <MenuItem key={mainCategory.id} value={mainCategory.id}>
              Tüm {mainCategory.name}
            </MenuItem>,
            ...(mainCategory.children || []).map((subCategory) => (
              <MenuItem
                key={subCategory.id}
                value={subCategory.id}
                sx={{ pl: 4 }}
              >
                {subCategory.name}
              </MenuItem>
            )),
          ])}
        </Select>
      </FormControl>
    );
  };

  const renderProductTable = (filteredProducts: Product[]) => {
    return (
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Ürün Adı</TableCell>
              <TableCell>Kategori</TableCell>
              <TableCell align="right">Fiyat (₺)</TableCell>
              <TableCell align="center">Tartılı</TableCell>
              <TableCell align="center">Varyantlar</TableCell>
              <TableCell align="right">İşlemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography
                    variant="body1"
                    color="textSecondary"
                    sx={{ py: 2 }}
                  >
                    {selectedCategoryId
                      ? "Bu kategoride henüz ürün bulunmuyor."
                      : "Henüz ürün bulunmuyor. Ürün eklemek için 'Ürün Ekle' butonunu kullanın."}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={getCategoryPath(product.categoryId)}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {product.price.toFixed(2)} ₺
                  </TableCell>
                  <TableCell align="center">
                    {product.isWeighted ? "Evet" : "Hayır"}
                  </TableCell>
                  <TableCell align="center">
                    {variants[product.id] ? variants[product.id].length : 0}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenDialog(product)}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteProduct(product.id)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderProductGrid = (filteredProducts: Product[]) => {
    return (
      <Grid container spacing={2}>
        {filteredProducts.length === 0 ? (
          <Grid size={12}>
            <Box p={3} textAlign="center">
              <Typography variant="body1" color="textSecondary">
                {selectedCategoryId
                  ? "Bu kategoride henüz ürün bulunmuyor."
                  : "Henüz ürün bulunmuyor. Ürün eklemek için 'Ürün Ekle' butonunu kullanın."}
              </Typography>
            </Box>
          </Grid>
        ) : (
          filteredProducts.map((product) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={product.id}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="div" gutterBottom>
                    {product.name}
                  </Typography>
                  <Typography color="text.secondary" gutterBottom>
                    <CategoryIcon
                      fontSize="small"
                      sx={{ verticalAlign: "middle", mr: 0.5 }}
                    />
                    {getCategoryPath(product.categoryId)}
                  </Typography>
                  <Typography
                    variant="body1"
                    color="primary"
                    sx={{ fontWeight: "bold", mt: 1 }}
                  >
                    {product.price.toFixed(2)} ₺
                  </Typography>
                  {product.isWeighted && (
                    <Chip
                      label="Tartılı Ürün"
                      size="small"
                      color="secondary"
                      sx={{ mt: 1 }}
                    />
                  )}
                  {variants[product.id] && variants[product.id].length > 0 && (
                    <Box mt={1}>
                      <Typography variant="body2">
                        {variants[product.id].length} varyant
                      </Typography>
                    </Box>
                  )}
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => handleOpenDialog(product)}
                  >
                    Düzenle
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDeleteProduct(product.id)}
                  >
                    Sil
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
    );
  };

  const filteredProducts = selectedCategoryId
    ? filterProductsByCategory(selectedCategoryId)
    : products;

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
          Ürünler
        </Typography>
        <Box>
          <Button
            variant="outlined"
            sx={{ mr: 2 }}
            onClick={handleOpenCategoryDialog}
          >
            Kategori Ekle
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Ürün Ekle
          </Button>
        </Box>
      </Box>

      <Box mb={3}>
        <Paper elevation={2} sx={{ p: 2 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Box sx={{ flexGrow: 1 }}>{renderCategorySelect()}</Box>
            <Box sx={{ display: "flex", ml: 2 }}>
              <Tabs
                value={currentView}
                onChange={(_, newValue) => setCurrentView(newValue)}
                aria-label="Görünüm seçenekleri"
              >
                <Tab value="table" label="Tablo" />
                <Tab value="grid" label="Izgara" />
              </Tabs>
            </Box>
          </Box>
        </Paper>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper elevation={3} sx={{ borderRadius: 2, overflow: "hidden" }}>
          {currentView === "table"
            ? renderProductTable(filteredProducts)
            : renderProductGrid(filteredProducts)}
        </Paper>
      )}

      {/* Ürün Ekleme/Düzenleme Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingProduct ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ my: 1 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  autoFocus
                  margin="dense"
                  name="name"
                  label="Ürün Adı"
                  fullWidth
                  variant="outlined"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  margin="dense"
                  name="price"
                  label="Fiyat (₺)"
                  fullWidth
                  variant="outlined"
                  type="number"
                  inputProps={{ step: "0.01", min: "0" }}
                  value={formData.price}
                  onChange={handleInputChange}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">₺</InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={12}>
                <FormControl fullWidth margin="dense" variant="outlined">
                  <InputLabel id="category-label">Kategori</InputLabel>
                  <Select
                    labelId="category-label"
                    id="category"
                    value={formData.categoryId || ""}
                    onChange={handleCategoryChange}
                    label="Kategori"
                  >
                    <MenuItem value="">
                      <em>Kategorisiz</em>
                    </MenuItem>

                    {categoryHierarchy.map((mainCategory) => [
                      <ListSubheader key={`header-${mainCategory.id}`}>
                        {mainCategory.name}
                      </ListSubheader>,
                      ...(mainCategory.children || []).map((subCategory) => (
                        <MenuItem
                          key={subCategory.id}
                          value={subCategory.id}
                          sx={{ pl: 4 }}
                        >
                          {subCategory.name}
                        </MenuItem>
                      )),
                    ])}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isWeighted}
                      onChange={handleSwitchChange}
                      color="primary"
                    />
                  }
                  label="Tartılı Ürün"
                  sx={{ mt: 1 }}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography variant="subtitle1">Varyantlar</Typography>
                <Button
                  startIcon={<AddVariantIcon />}
                  onClick={handleAddVariant}
                  size="small"
                >
                  Varyant Ekle
                </Button>
              </Box>

              {formData.variants.map((variant, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    mb: 1,
                    gap: 1,
                  }}
                >
                  <TextField
                    size="small"
                    label="Varyant Adı"
                    value={variant.name}
                    onChange={(e) =>
                      handleVariantChange(index, "name", e.target.value)
                    }
                    sx={{ flexGrow: 1 }}
                  />
                  <TextField
                    size="small"
                    label="Fiyat (₺)"
                    type="number"
                    inputProps={{ step: "0.01", min: "0" }}
                    value={variant.price}
                    onChange={(e) =>
                      handleVariantChange(index, "price", e.target.value)
                    }
                    sx={{ width: 120 }}
                  />
                  <IconButton
                    color="error"
                    onClick={() => handleRemoveVariant(index)}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>İptal</Button>
          <Button
            onClick={handleSaveProduct}
            variant="contained"
            color="primary"
          >
            {editingProduct ? "Güncelle" : "Ekle"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Kategori Ekleme Dialog */}
      <Dialog open={openCategoryDialog} onClose={handleCloseCategoryDialog}>
        <DialogTitle>Yeni Kategori Ekle</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Kategori Adı"
            fullWidth
            variant="outlined"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
          />
          <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
            Not: Daha kapsamlı kategori yönetimi için Kategoriler sayfasını
            kullanın.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCategoryDialog}>İptal</Button>
          <Button
            onClick={handleSaveCategory}
            variant="contained"
            color="primary"
            disabled={!categoryName.trim()}
          >
            Ekle
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

      {/* Ürün Ekle FAB (Mobil için) */}
      <Tooltip title="Ürün Ekle" placement="left">
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

export default ProductsPage;
