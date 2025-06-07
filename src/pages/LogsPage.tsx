import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Paper,
  Box,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import logger from "../utils/logger";
import Layout from "../components/Layout";

const LogsPage: React.FC = () => {
  const [logs, setLogs] = useState<Array<any>>([]);

  // Logları yükle
  const loadLogs = () => {
    const currentLogs = logger.getLogs();
    setLogs(currentLogs.reverse()); // En yeni log en üstte
  };

  // Sayfa yüklendiğinde logları getir
  useEffect(() => {
    loadLogs();
  }, []);

  // Tüm logları temizle
  const handleClearLogs = () => {
    if (
      window.confirm("Tüm işlem günlüklerini silmek istediğinize emin misiniz?")
    ) {
      logger.clearLogs();
      loadLogs();
    }
  };

  return (
    <Layout>
      <Container maxWidth="md">
        <Box sx={{ my: 4 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h4" component="h1" gutterBottom>
              İşlem Günlükleri
            </Typography>
            <Box>
              <IconButton color="primary" onClick={loadLogs} title="Yenile">
                <RefreshIcon />
              </IconButton>
              <IconButton
                color="error"
                onClick={handleClearLogs}
                title="Tümünü Temizle"
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>

          <Paper elevation={3} sx={{ p: 2 }}>
            {logs.length === 0 ? (
              <Typography variant="body1" sx={{ textAlign: "center", py: 4 }}>
                Henüz kaydedilmiş işlem günlüğü bulunmamaktadır.
              </Typography>
            ) : (
              <List>
                {logs.map((log, index) => (
                  <React.Fragment key={index}>
                    <ListItem alignItems="flex-start">
                      <ListItemText
                        primary={
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <Typography
                              component="span"
                              variant="subtitle1"
                              color="primary"
                              fontWeight="bold"
                            >
                              {log.operation}
                            </Typography>
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.secondary"
                            >
                              {new Date(log.timestamp).toLocaleString()}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            <Typography
                              component="pre"
                              variant="body2"
                              sx={{
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                backgroundColor: "#f5f5f5",
                                p: 1,
                                borderRadius: 1,
                              }}
                            >
                              {JSON.stringify(log.details, null, 2)}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < logs.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>

          {logs.length > 0 && (
            <Box sx={{ mt: 2, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Toplam {logs.length} işlem günlüğü görüntüleniyor. Maksimum 100
                günlük saklanmaktadır.
              </Typography>
              <Button
                variant="outlined"
                color="error"
                onClick={handleClearLogs}
                sx={{ mt: 1 }}
              >
                Tüm Günlükleri Temizle
              </Button>
            </Box>
          )}
        </Box>
      </Container>
    </Layout>
  );
};

export default LogsPage;
