import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Paper,
  Box,
  Divider,
  Button,
  IconButton,
  Tabs,
  Tab,
  Alert,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import PersonIcon from "@mui/icons-material/Person";
import LocalDiningIcon from "@mui/icons-material/LocalDining";
import logger from "../utils/logger";
import Layout from "../components/Layout";
import { ActivityLog, DailySalesReport } from "../models/types";
import { useNavigate } from "react-router-dom";

// Tab panel bileşeni
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`logs-tabpanel-${index}`}
      aria-labelledby={`logs-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const LogsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [salesReports, setSalesReports] = useState<DailySalesReport[]>([]);
  const [filterDate, setFilterDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [filterOperation, setFilterOperation] = useState<string>("all");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Admin kontrolü
  useEffect(() => {
    const checkAdminStatus = () => {
      try {
        const currentUserStr = localStorage.getItem("currentUser");
        if (currentUserStr) {
          const currentUser = JSON.parse(currentUserStr);
          setIsAdmin(currentUser.isAdmin === true);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("Kullanıcı bilgisi kontrol edilirken hata:", error);
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, []);

  // Logları yükle
  const loadLogs = async () => {
    if (filterDate) {
      try {
        const filteredLogs = await logger.getLogsByDate(filterDate);

        // Operasyon filtresi uygula
        if (filterOperation !== "all") {
          setLogs(
            filteredLogs.filter((log) => log.operation === filterOperation)
          );
        } else {
          setLogs(filteredLogs);
        }
      } catch (error) {
        console.error("Loglar yüklenirken hata:", error);
        setLogs([]);
      }
    } else {
      try {
        const allLogs = await logger.getLogs();
        setLogs(allLogs);
      } catch (error) {
        console.error("Tüm loglar yüklenirken hata:", error);
        setLogs([]);
      }
    }
  };

  // Satış raporlarını yükle
  const loadSalesReports = async () => {
    try {
      const reports = await logger.getSalesReports();
      setSalesReports(reports.sort((a, b) => b.date.localeCompare(a.date)));
    } catch (error) {
      console.error("Satış raporları yüklenirken hata:", error);
      setSalesReports([]);
    }
  };

  // Sayfa yüklendiğinde logları ve raporları getir
  useEffect(() => {
    if (!isAdmin) {
      // Admin olmayan kullanıcılar için ana sayfaya yönlendir
      navigate("/");
      return;
    }

    loadLogs();
    loadSalesReports();
  }, [isAdmin, navigate]);

  // Filtre değiştiğinde yeniden yükle
  useEffect(() => {
    if (isAdmin) {
      loadLogs();
    }
  }, [filterDate, filterOperation, isAdmin]);

  // Tab değişikliği
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Tüm logları temizle
  const handleClearLogs = async () => {
    if (
      window.confirm("Tüm işlem günlüklerini silmek istediğinize emin misiniz?")
    ) {
      try {
        await logger.clearLogs();
        loadLogs();
      } catch (error) {
        console.error("Loglar temizlenirken hata:", error);
      }
    }
  };

  // Tüm satış raporlarını temizle
  const handleClearSalesReports = async () => {
    if (
      window.confirm("Tüm satış raporlarını silmek istediğinize emin misiniz?")
    ) {
      try {
        await logger.clearSalesReports();
        loadSalesReports();
      } catch (error) {
        console.error("Satış raporları temizlenirken hata:", error);
      }
    }
  };

  // Filtreleme işlemlerini yönet
  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterDate(event.target.value);
  };

  const handleOperationFilterChange = (event: any) => {
    setFilterOperation(event.target.value);
  };

  // Admin olmayan kullanıcılar için erişimi engelle
  if (!isAdmin) {
    return null; // navigate zaten ana sayfaya yönlendiriyor
  }

  return (
    <Layout>
      <Container maxWidth="lg">
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
              Yönetim Paneli
            </Typography>
          </Box>

          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              aria-label="logs tabs"
            >
              <Tab
                label="İşlem Günlükleri"
                icon={<LocalDiningIcon />}
                iconPosition="start"
              />
              <Tab
                label="Günlük Cirolar"
                icon={<MonetizationOnIcon />}
                iconPosition="start"
              />
              <Tab
                label="Kullanıcılar"
                icon={<PersonIcon />}
                iconPosition="start"
              />
            </Tabs>
          </Box>

          {/* İşlem Günlükleri Tab */}
          <TabPanel value={activeTab} index={0}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h6">İşlem Günlükleri</Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <TextField
                  label="Tarih Seç"
                  type="date"
                  value={filterDate}
                  onChange={handleDateChange}
                  size="small"
                  InputLabelProps={{
                    shrink: true,
                  }}
                />

                <FormControl sx={{ minWidth: 150 }} size="small">
                  <InputLabel id="operation-filter-label">
                    İşlem Türü
                  </InputLabel>
                  <Select
                    labelId="operation-filter-label"
                    value={filterOperation}
                    label="İşlem Türü"
                    onChange={handleOperationFilterChange}
                  >
                    <MenuItem value="all">Tümü</MenuItem>
                    <MenuItem value="Sipariş Oluşturma">
                      Sipariş Oluşturma
                    </MenuItem>
                    <MenuItem value="Sipariş Tamamlama">
                      Sipariş Tamamlama
                    </MenuItem>
                    <MenuItem value="Ürün Ekleme">Ürün Ekleme</MenuItem>
                    <MenuItem value="Ürün Silme">Ürün Silme</MenuItem>
                    <MenuItem value="Ödeme Alma">Ödeme Alma</MenuItem>
                    <MenuItem value="Masa Durumu Değişikliği">
                      Masa Durumu
                    </MenuItem>
                    <MenuItem value="Ürün Dağıtımı">Ürün Dağıtımı</MenuItem>
                  </Select>
                </FormControl>

                <IconButton
                  color="primary"
                  onClick={() => loadLogs()}
                  title="Yenile"
                >
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
                  Seçilen tarih için kaydedilmiş işlem günlüğü bulunmamaktadır.
                </Typography>
              ) : (
                <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Zaman</TableCell>
                        <TableCell>Kullanıcı</TableCell>
                        <TableCell>İşlem</TableCell>
                        <TableCell>Masa</TableCell>
                        <TableCell>Detaylar</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </TableCell>
                          <TableCell>{log.userName}</TableCell>
                          <TableCell>{log.operation}</TableCell>
                          <TableCell>{log.tableId || "-"}</TableCell>
                          <TableCell>
                            <Typography
                              component="pre"
                              variant="body2"
                              sx={{
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                fontSize: "0.75rem",
                                maxWidth: 400,
                                maxHeight: 100,
                                overflow: "auto",
                              }}
                            >
                              {JSON.stringify(log.details, null, 2)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>

            {logs.length > 0 && (
              <Box sx={{ mt: 2, textAlign: "right" }}>
                <Typography variant="body2" color="text.secondary">
                  Toplam {logs.length} işlem günlüğü görüntüleniyor. Maksimum
                  1000 günlük saklanmaktadır.
                </Typography>
              </Box>
            )}
          </TabPanel>

          {/* Günlük Cirolar Tab */}
          <TabPanel value={activeTab} index={1}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h6">Günlük Ciro Raporları</Typography>
              <Box>
                <IconButton
                  color="primary"
                  onClick={() => loadSalesReports()}
                  title="Yenile"
                >
                  <RefreshIcon />
                </IconButton>
                <IconButton
                  color="error"
                  onClick={handleClearSalesReports}
                  title="Tümünü Temizle"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Box>

            {salesReports.length === 0 ? (
              <Alert severity="info">
                Henüz kaydedilmiş ciro raporu bulunmamaktadır.
              </Alert>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(12, 1fr)",
                  gap: "24px",
                }}
              >
                {salesReports.map((report) => (
                  <div key={report.id} style={{ gridColumn: "span 12" }}>
                    <Card raised>
                      <CardContent>
                        <Typography
                          variant="h6"
                          sx={{ borderBottom: "1px solid #eee", pb: 1, mb: 2 }}
                        >
                          {new Date(report.date).toLocaleDateString("tr-TR", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </Typography>

                        <Box sx={{ mb: 2 }}>
                          <Typography variant="h4" color="primary" gutterBottom>
                            {report.totalSales.toLocaleString("tr-TR", {
                              style: "currency",
                              currency: "TRY",
                            })}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Toplam {report.totalOrders} sipariş
                          </Typography>
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="subtitle2" gutterBottom>
                          Ödeme Yöntemlerine Göre
                        </Typography>

                        <TableContainer>
                          <Table size="small">
                            <TableBody>
                              <TableRow>
                                <TableCell>Nakit</TableCell>
                                <TableCell align="right">
                                  {report.salesByMethod.cash.toLocaleString(
                                    "tr-TR",
                                    {
                                      style: "currency",
                                      currency: "TRY",
                                    }
                                  )}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Kredi Kartı</TableCell>
                                <TableCell align="right">
                                  {report.salesByMethod.credit_card.toLocaleString(
                                    "tr-TR",
                                    {
                                      style: "currency",
                                      currency: "TRY",
                                    }
                                  )}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Banka Kartı</TableCell>
                                <TableCell align="right">
                                  {report.salesByMethod.debit_card.toLocaleString(
                                    "tr-TR",
                                    {
                                      style: "currency",
                                      currency: "TRY",
                                    }
                                  )}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Diğer</TableCell>
                                <TableCell align="right">
                                  {report.salesByMethod.other.toLocaleString(
                                    "tr-TR",
                                    {
                                      style: "currency",
                                      currency: "TRY",
                                    }
                                  )}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </TabPanel>

          {/* Kullanıcılar Tab */}
          <TabPanel value={activeTab} index={2}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6">Kullanıcı Yönetimi</Typography>
              <Typography variant="body2" color="text.secondary">
                Bu bölüm henüz geliştirme aşamasındadır.
              </Typography>
            </Box>

            <Alert severity="info">
              Kullanıcı yönetimi özelliği yakında eklenecektir. Şu anda sadece
              mevcut admin kullanıcılar raporları görüntüleyebilir.
            </Alert>
          </TabPanel>
        </Box>
      </Container>
    </Layout>
  );
};

export default LogsPage;
