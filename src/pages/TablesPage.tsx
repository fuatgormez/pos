import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Fab,
  Tooltip,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  Add as AddIcon,
  Restaurant as RestaurantIcon,
} from "@mui/icons-material";
import db from "../db/database";
import { Table } from "../models/types";

const TablesPage: React.FC = () => {
  const navigate = useNavigate();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [dialogError, setDialogError] = useState("");

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    setLoading(true);
    try {
      const allTables = await db.tables.getAll();
      setTables(allTables);
    } catch (error) {
      console.error("Masalar yüklenirken hata oluştu:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTable = (tableId: string) => {
    navigate(`/tables/${tableId}`);
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
    setNewTableName("");
    setDialogError("");
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleAddTable = async () => {
    if (!newTableName.trim()) {
      setDialogError("Masa adı boş olamaz");
      return;
    }

    try {
      await db.tables.add(newTableName.trim());
      await loadTables();
      handleCloseDialog();
    } catch (error) {
      console.error("Masa eklenirken hata oluştu:", error);
      setDialogError("Masa eklenirken bir hata oluştu");
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
          Masalar
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {tables.map((table) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={table.id}>
              <Paper
                elevation={3}
                sx={{
                  p: 2,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  cursor: "pointer",
                  height: "100%",
                  borderRadius: 2,
                  borderLeft: 5,
                  borderColor:
                    table.status === "occupied" ? "error.main" : "success.main",
                  transition: "transform 0.2s",
                  "&:hover": {
                    transform: "scale(1.02)",
                  },
                }}
                onClick={() => handleOpenTable(table.id)}
              >
                <RestaurantIcon
                  color={table.status === "occupied" ? "error" : "success"}
                  sx={{ fontSize: 60, mb: 2 }}
                />
                <Typography variant="h6" component="h2">
                  {table.name}
                </Typography>
                <Typography
                  color={table.status === "occupied" ? "error" : "success"}
                >
                  {table.status === "occupied" ? "Dolu" : "Boş"}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      <Tooltip title="Masa Ekle" placement="left">
        <Fab
          color="primary"
          sx={{ position: "fixed", bottom: 20, right: 20 }}
          onClick={handleOpenDialog}
        >
          <AddIcon />
        </Fab>
      </Tooltip>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Yeni Masa Ekle</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Masa Adı"
            fullWidth
            variant="outlined"
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            error={!!dialogError}
            helperText={dialogError}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>İptal</Button>
          <Button onClick={handleAddTable} variant="contained" color="primary">
            Ekle
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TablesPage;
