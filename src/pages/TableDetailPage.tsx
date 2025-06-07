import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Fab,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Menu,
  MenuItem,
  Card,
  CardContent,
  Tooltip,
  Select,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Payment as PaymentIcon,
  Person as PersonIcon,
  RemoveCircle as RemoveCircleIcon,
  Assignment as AssignmentIcon,
} from "@mui/icons-material";
import db from "../db/database";
import {
  Table,
  Order,
  OrderItem,
  Product,
  ProductVariant,
  Category,
  Payment,
  PAYMENT_METHODS,
} from "../models/types";

// Toast mesajları için basit fonksiyonlar
const toast = {
  success: (
    message: string,
    options?: { autoClose?: number; hideProgressBar?: boolean }
  ) => {
    console.log("Başarılı:", message);
    // Popup göstermeyi kaldırdık, sadece konsola loglama yapılıyor
  },
  error: (message: string) => {
    console.error("Hata:", message);
    // Kritik hatalar için alert kullanmaya devam ediyoruz
    alert("❌ " + message);
  },
};

const TableDetailPage: React.FC = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();

  const [table, setTable] = useState<Table | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "credit_card" | "debit_card" | "other"
  >("cash");
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [assignPersonDialog, setAssignPersonDialog] = useState(false);
  const [assignItemId, setAssignItemId] = useState<string | null>(null);
  const [personName, setPersonName] = useState("");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [groupPaymentDialog, setGroupPaymentDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showDistribution, setShowDistribution] = useState(false);
  const [currentDistributionId, setCurrentDistributionId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (tableId) {
      loadTableData();
    }
  }, [tableId]);

  // Siparişler eklendiğinde/değiştiğinde masa durumunu güncelle
  useEffect(() => {
    const updateTableStatus = async () => {
      if (activeOrder && table && table.status !== "occupied") {
        try {
          // Masa durumunu güncelle
          console.log(
            `Masa durumu 'occupied' olarak güncelleniyor: ${table.id}`
          );
          await db.tables.update(table.id, { status: "occupied" });
          setTable({ ...table, status: "occupied" });
        } catch (error) {
          console.error("Masa durumu güncellenirken hata:", error);
        }
      } else if (!activeOrder && table && table.status === "occupied") {
        try {
          // Aktif sipariş yoksa masayı boş yap
          console.log(
            `Masa durumu 'available' olarak güncelleniyor: ${table.id}`
          );
          await db.tables.update(table.id, { status: "available" });
          setTable({ ...table, status: "available" });
        } catch (error) {
          console.error("Masa durumu güncellenirken hata:", error);
        }
      }
    };

    updateTableStatus();
  }, [activeOrder, table]);

  const loadTableData = async () => {
    if (!tableId) return;

    setLoading(true);
    try {
      // Masa bilgilerini al
      const tableData = await db.tables.get(tableId);
      setTable(tableData || null);

      // Aktif siparişi al
      const activeOrders = await db.orders.getActiveByTable(tableId);
      const currentOrder = activeOrders.length > 0 ? activeOrders[0] : null;
      setActiveOrder(currentOrder);

      // Aktif siparişi varsa masa durumunu "occupied" olarak ayarla
      if (currentOrder && tableData && tableData.status !== "occupied") {
        await db.tables.update(tableId, { status: "occupied" });
        tableData.status = "occupied";
      }

      // Sipariş öğelerini al
      if (currentOrder) {
        const items = await db.orderItems.getByOrder(currentOrder.id);
        setOrderItems(items);

        // Dağıtımda aktif ürünler var mı kontrol et ve varsa dağıtım panelini aç
        const distributionItems = items.filter(
          (item) => item.status === "active" && item.assignedTo !== null
        );

        if (distributionItems.length > 0) {
          // Dağıtımda ürün var, paneli göster
          setShowDistribution(true);

          // Dağıtım ID'sini ayarla (ilk dağıtım ürününün ID'sini kullan)
          if (distributionItems.length > 0 && distributionItems[0].assignedTo) {
            setCurrentDistributionId(distributionItems[0].assignedTo);
          }
        } else {
          // Dağıtımda ürün yoksa paneli gizle
          setShowDistribution(false);
          setCurrentDistributionId(null);
        }
      } else {
        setOrderItems([]);
        setShowDistribution(false);
        setCurrentDistributionId(null);
      }

      // Kategorileri yükle
      const allCategories = await db.categories.getAll();
      setCategories(allCategories);

      if (allCategories.length > 0 && !selectedCategory) {
        setSelectedCategory(allCategories[0].id);
      }

      // Kategoriye göre ürünleri yükle
      if (selectedCategory) {
        const categoryProducts = await db.products.getByCategory(
          selectedCategory
        );
        setProducts(categoryProducts);
      }
    } catch (error) {
      console.error("Masa bilgileri yüklenirken hata oluştu:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = async (categoryId: string | null) => {
    setSelectedCategory(categoryId);

    try {
      if (categoryId === null) {
        const allProducts = await db.products.getAll();
        setProducts(allProducts);
      } else {
        const categoryProducts = await db.products.getByCategory(categoryId);
        setProducts(categoryProducts);
      }
    } catch (error) {
      console.error("Ürünler yüklenirken hata oluştu:", error);
    }
  };

  const handleCreateOrder = async () => {
    if (!tableId) {
      console.error("tableId olmadan sipariş oluşturulamaz");
      return null;
    }

    try {
      console.log(`Masa ${tableId} için yeni sipariş oluşturuluyor`);

      // Önce masa durumunu güncelle, sonra sipariş oluştur
      if (table) {
        console.log(`Masa ${tableId} durumu "occupied" olarak güncelleniyor`);
        await db.tables.update(tableId, { status: "occupied" });
        setTable({ ...table, status: "occupied" });

        // İşlemin tamamlanması için kısa bir bekleme
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      const newOrder = await db.orders.create(tableId);
      console.log(`Yeni sipariş oluşturuldu:`, newOrder);

      // Doğrudan aktif siparişi ayarla
      setActiveOrder(newOrder);

      // İşlemin tamamlanması için kısa bir bekleme
      await new Promise((resolve) => setTimeout(resolve, 200));

      return newOrder;
    } catch (error) {
      console.error("Sipariş oluşturulurken hata oluştu:", error);
      // Masa durumunu geri al
      if (table) {
        try {
          console.log("Hata oluştu, masa durumunu resetleme girişimi");
          await loadTableData(); // Masa durumunu yeniden yükle
        } catch (resetError) {
          console.error("Masa durumu resetlenirken hata:", resetError);
        }
      }
      throw error; // Hatayı yukarı aktar
    }
  };

  const handleAddProduct = async (product: Product) => {
    console.log("Ürün ekleme başlatılıyor:", product.name);

    // Aktif sipariş yoksa önce yeni sipariş oluştur
    if (!activeOrder) {
      console.log("Aktif sipariş yok, yeni sipariş oluşturuluyor");
      try {
        // Önce mevcut durumu kontrol et
        await loadTableData();

        // Tekrar kontrol et, belki veritabanında sipariş vardı
        if (activeOrder) {
          console.log("Aktif sipariş zaten varmış, yeni oluşturmuyoruz");
        } else {
          // Yeni sipariş oluştur
          const newOrder = await handleCreateOrder();

          if (!newOrder) {
            toast.error("Sipariş oluşturulamadı, lütfen tekrar deneyin");
            return;
          }

          // Yeni siparişi aktif hale getir
          setActiveOrder(newOrder);

          // Veritabanı işlemlerinin tamamlanması için daha uzun bir bekleme
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Güncel durumu yükle
          await loadTableData();

          // Son bir kontrol daha yap
          if (!activeOrder) {
            console.log(
              "Sipariş oluşturuldu ama activeOrder hala null, manuel olarak ayarlanıyor"
            );
            setActiveOrder(newOrder);
            // Bir bekleme daha
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        }
      } catch (createError) {
        console.error("Sipariş oluşturulurken hata:", createError);
        toast.error("Sipariş oluşturulamadı, lütfen tekrar deneyin");
        return;
      }
    }

    // Yine kontrol et, eğer hala aktif sipariş yoksa çık
    if (!activeOrder) {
      console.error("Sipariş oluşturuldu ama activeOrder değeri atanmadı");
      toast.error("Sipariş oluşturulamadı, sayfayı yenileyin");
      return;
    }

    try {
      console.log(
        `Ürün ekleniyor: ${product.name}, Sipariş ID: ${activeOrder.id}`
      );

      // Variantları olan ürünleri kontrol et ve işle
      const variants = await db.variants.getByProduct(product.id);

      if (variants.length > 0) {
        // Popup göstermeden ilk varyantı kullan
        await addOrderItem(product, variants[0]);
      } else {
        // Varyantı olmayan normal ürün
        await addOrderItem(product);
      }

      // Verileri sessizce yeniden yükle
      await loadTableData();
    } catch (error) {
      console.error("Ürün eklenirken hata oluştu:", error);
      toast.error("Ürün eklenirken bir hata oluştu");
    }
  };

  const addOrderItem = async (product: Product, variant?: ProductVariant) => {
    if (!activeOrder) {
      console.error("Ürün eklenemiyor: Aktif sipariş bulunamadı");
      throw new Error("Aktif sipariş bulunamadı");
    }

    try {
      console.log(`Aktif sipariş kontrolü: ${activeOrder.id}`);

      const orderItem: Omit<OrderItem, "id" | "createdAt" | "updatedAt"> = {
        orderId: activeOrder.id,
        productId: product.id,
        variantId: variant ? variant.id : null,
        quantity: 1,
        price: variant ? variant.price : product.price,
        assignedTo: null,
        status: "active",
      };

      console.log(`Siparişe ürün ekleniyor:`, orderItem);
      const newItem = await db.orderItems.add(orderItem);
      console.log(`Ürün başarıyla eklendi: ${newItem.id}`);
      return newItem;
    } catch (error) {
      console.error("Sipariş öğesi eklenirken hata:", error);
      console.error("Hata detayları:", {
        orderId: activeOrder?.id,
        productId: product.id,
        variantId: variant?.id || null,
      });
      throw error;
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTabIndex(newValue);
  };

  const calculateTotal = () => {
    // Sadece masada kalan (dağıtılmamış) ürünlerin toplamı
    return orderItems
      .filter((item) => item.status === "active" && item.assignedTo === null)
      .reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const calculateTotalAll = () => {
    // Tüm aktif ürünlerin toplamı (dağıtılmış veya dağıtılmamış)
    return orderItems
      .filter((item) => item.status === "active")
      .reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const handleOpenAssignDialog = (itemId: string) => {
    setAssignItemId(itemId);
    setPersonName("");
    setAssignPersonDialog(true);
  };

  const handleCloseAssignDialog = () => {
    setAssignPersonDialog(false);
    setAssignItemId(null);
  };

  const handleAssignPerson = async () => {
    if (!assignItemId || !personName.trim()) return;

    try {
      await db.orderItems.assignTo(assignItemId, personName.trim());
      await loadTableData();
      handleCloseAssignDialog();
    } catch (error) {
      console.error("Kişi atanırken hata oluştu:", error);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await db.orderItems.cancel(itemId);
      await loadTableData();

      // Masada kalan ürün var mı kontrol et
      const remainingItems = orderItems.filter(
        (item) => item.id !== itemId && item.status === "active"
      );

      // Eğer son ürün kaldırıldıysa masalar sayfasına yönlendir
      if (remainingItems.length === 0 && activeOrder) {
        try {
          console.log("Son ürün kaldırıldı, sipariş kapatılıyor");
          await db.orders.complete(activeOrder.id);

          // Masa durumunu doğrudan güncelle
          if (table) {
            console.log("Masa durumu manuel olarak güncelleniyor:", table.id);
            try {
              await db.tables.update(table.id, { status: "available" });
              console.log("Masa boş durumuna getirildi:", table.id);
            } catch (tableError) {
              console.error("Masa durumu güncellenirken hata:", tableError);
            }
          }

          // Masalar sayfasına yönlendir
          navigate("/tables");
        } catch (error) {
          console.error("Sipariş tamamlanırken hata:", error);
        }
      }
    } catch (error) {
      console.error("Ürün kaldırılırken hata oluştu:", error);
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSelectItem = (itemId: string) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter((id) => id !== itemId));
    } else {
      setSelectedItems([...selectedItems, itemId]);
    }
  };

  const handleOpenPaymentDialog = () => {
    // Genel ödeme için tüm aktif ürünlerin toplamını kullan
    const total = calculateTotalAll();
    setPaymentAmount(total.toFixed(2));
    setPaymentDialog(true);
  };

  const handleClosePaymentDialog = () => {
    setPaymentDialog(false);
    setPaymentAmount("");
  };

  const handlePayment = async () => {
    if (!activeOrder) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    try {
      // Geçici bir değişkende hataları tutalım
      let hasError = false;

      // Tüm aktif ürünleri al
      const allActiveItems = orderItems.filter(
        (item) => item.status === "active"
      );

      console.log(`İşlenecek ${allActiveItems.length} ürün var`);

      // Önce tüm ürünleri işle
      for (const item of allActiveItems) {
        try {
          // Ürünü tamamlandı olarak işaretle
          await db.orderItems.complete(item.id);
          // Ödeme yöntemini ayarla (tamamlandıktan sonra)
          await db.orderItems.updatePaymentMethod(item.id, paymentMethod);
          console.log(`Ürün ${item.id} başarıyla işlendi`);
        } catch (itemError) {
          hasError = true;
          console.error(`Ürün ${item.id} işlenirken hata:`, itemError);
        }
      }

      // Ödemeyi kaydet
      const payment: Omit<Payment, "id" | "createdAt" | "updatedAt"> = {
        orderId: activeOrder.id,
        amount,
        method: paymentMethod,
      };

      console.log("Ödeme kaydediliyor:", payment);
      await db.payments.add(payment);
      console.log("Ödeme kaydedildi");

      // Son olarak siparişi tamamla (ürünler işlendikten sonra)
      try {
        console.log("Sipariş tamamlanıyor:", activeOrder.id);
        await db.orders.complete(activeOrder.id);
        console.log("Sipariş tamamlandı");

        // Masa durumunu doğrudan güncelle
        if (table) {
          console.log("Masa durumu manuel olarak güncelleniyor:", table.id);
          try {
            await db.tables.update(table.id, { status: "available" });
            setTable({ ...table, status: "available" });
            console.log("Masa boş durumuna getirildi:", table.id);
          } catch (tableError) {
            console.error("Masa durumu güncellenirken hata:", tableError);
          }
        }

        // Başarı mesajı göster
        if (hasError) {
          toast.success(
            "Ödeme alındı, fakat bazı ürünler işlenirken hata oluştu"
          );
        } else {
          toast.success("Ödeme başarıyla alındı");
        }

        handleClosePaymentDialog();
        // Masalar sayfasına yönlendir
        navigate("/tables");
      } catch (orderError) {
        console.error("Sipariş tamamlanırken hata:", orderError);
        toast.error(
          "Ödeme alındı fakat sipariş tamamlanamadı, lütfen sayfayı yenileyin"
        );
        handleClosePaymentDialog();
      }
    } catch (error) {
      console.error("Ödeme işlenirken hata oluştu:", error);
      toast.error("Ödeme alınırken bir hata oluştu");
    }
  };

  const handleAssignSelectedItems = () => {
    setAssignPersonDialog(true);
  };

  const handleRandomAssign = () => {
    const randomId = Math.floor(1000 + Math.random() * 9000).toString();
    handleBulkAssign(randomId);
  };

  const handleBulkAssign = async (randomId?: string) => {
    if (selectedItems.length === 0) return;

    try {
      const assignId =
        randomId || Math.floor(1000 + Math.random() * 9000).toString();

      for (const itemId of selectedItems) {
        await db.orderItems.assignTo(itemId, assignId);
      }

      setSelectedItems([]);
      await loadTableData();
      handleCloseAssignDialog();
    } catch (error) {
      console.error("Toplu atama sırasında hata oluştu:", error);
    }
  };

  const getProductName = (productId: string): string => {
    const product = products.find((p) => p.id === productId);
    return product ? product.name : "Bilinmeyen Ürün";
  };

  const handleReturnToTable = async (itemId: string) => {
    try {
      await db.orderItems.assignTo(itemId, null);

      // Eğer dağıtımda başka ürün kalmadıysa dağıtım panelini kapat
      const remainingItems = orderItems.filter(
        (item) =>
          item.status === "active" &&
          item.assignedTo === currentDistributionId &&
          item.id !== itemId // Bu şimdiki ürün olduğu için çıkarıyoruz
      );

      if (remainingItems.length === 0) {
        setShowDistribution(false);
        setCurrentDistributionId(null);
      }

      await loadTableData();

      // Tüm masada hiç aktif ürün kalmadıysa masalar sayfasına yönlendir
      const allActiveItems = orderItems.filter(
        (item) => item.status === "active" && item.id !== itemId
      );

      if (allActiveItems.length === 0 && activeOrder) {
        try {
          console.log("Masada aktif ürün kalmadı, sipariş kapatılıyor");
          await db.orders.complete(activeOrder.id);

          // Masa durumunu doğrudan güncelle
          if (table) {
            console.log("Masa durumu manuel olarak güncelleniyor:", table.id);
            try {
              await db.tables.update(table.id, { status: "available" });
              console.log("Masa boş durumuna getirildi:", table.id);
            } catch (tableError) {
              console.error("Masa durumu güncellenirken hata:", tableError);
            }
          }

          // Masalar sayfasına yönlendir
          navigate("/tables");
        } catch (error) {
          console.error("Sipariş tamamlanırken hata:", error);
        }
      }
    } catch (error) {
      console.error("Ürün masaya geri gönderilirken hata oluştu:", error);
    }
  };

  const handleCompleteItem = async (itemId: string) => {
    try {
      await db.orderItems.complete(itemId);
      await loadTableData();

      // Masada kalan aktif ürün var mı kontrol et
      const remainingItems = orderItems.filter(
        (item) => item.id !== itemId && item.status === "active"
      );

      // Eğer son ürün tamamlandıysa masalar sayfasına yönlendir
      if (remainingItems.length === 0 && activeOrder) {
        try {
          console.log("Son ürün tamamlandı, sipariş kapatılıyor");
          await db.orders.complete(activeOrder.id);

          // Masa durumunu doğrudan güncelle
          if (table) {
            console.log("Masa durumu manuel olarak güncelleniyor:", table.id);
            try {
              await db.tables.update(table.id, { status: "available" });
              console.log("Masa boş durumuna getirildi:", table.id);
            } catch (tableError) {
              console.error("Masa durumu güncellenirken hata:", tableError);
            }
          }

          // Masalar sayfasına yönlendir
          navigate("/tables");
        } catch (error) {
          console.error("Sipariş tamamlanırken hata:", error);
        }
      }
    } catch (error) {
      console.error("Ürün tamamlanırken hata oluştu:", error);
    }
  };

  const getItemPaymentMethod = (itemId: string): string | undefined => {
    const item = orderItems.find((i) => i.id === itemId);
    return item?.method;
  };

  const handleItemPaymentMethodChange = async (
    itemId: string,
    method: string
  ) => {
    try {
      await db.orderItems.updatePaymentMethod(itemId, method);
      await loadTableData();
    } catch (error) {
      console.error("Ürün ödeme yöntemi değiştirilirken hata oluştu:", error);
      toast.error("Ödeme yöntemi değiştirilemedi");
    }
  };

  const getOrderItemsByGroup = () => {
    const items = orderItems.filter(
      (item) => item.status === "active" && item.assignedTo !== null
    );

    // Kişilere göre grupla
    const groups: Record<string, OrderItem[]> = {};
    items.forEach((item) => {
      if (item.assignedTo) {
        if (!groups[item.assignedTo]) {
          groups[item.assignedTo] = [];
        }
        groups[item.assignedTo].push(item);
      }
    });

    // Grupları dizi haline getir
    return Object.entries(groups).map(([assignedTo, items]) => ({
      assignedTo,
      items,
    }));
  };

  const handleClosePaymentByGroupDialog = () => {
    setGroupPaymentDialog(false);
    setSelectedGroup(null);
  };

  const handlePaymentForGroup = (assignedTo: string) => {
    setSelectedGroup(assignedTo);

    // Grup için toplam tutarı hesapla
    const groupItems = orderItems.filter(
      (item) => item.status === "active" && item.assignedTo === assignedTo
    );
    const groupTotal = groupItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    setPaymentAmount(groupTotal.toFixed(2));
    setGroupPaymentDialog(true);
  };

  const handleGroupPayment = async () => {
    if (!selectedGroup || !activeOrder) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    try {
      // Gruptaki tüm ürünleri al
      const groupItems = orderItems.filter(
        (item) => item.status === "active" && item.assignedTo === selectedGroup
      );

      if (groupItems.length === 0) {
        toast.error("Grupta ödeme yapılacak ürün bulunamadı");
        return;
      }

      // Önce ürünleri tamamla
      let itemError = false;
      for (const item of groupItems) {
        try {
          // Önce tamamlama işlemi
          await db.orderItems.complete(item.id);
          // Sonra ödeme yöntemi atama
          await db.orderItems.updatePaymentMethod(item.id, paymentMethod);
          console.log(`Grup ürünü ${item.id} başarıyla işlendi`);
        } catch (error) {
          itemError = true;
          console.error(`Grup ürünü ${item.id} işlenirken hata:`, error);
        }
      }

      // Sonra ödemeyi kaydet
      const payment: Omit<Payment, "id" | "createdAt" | "updatedAt"> = {
        orderId: activeOrder.id,
        amount,
        method: paymentMethod,
      };

      await db.payments.add(payment);
      console.log("Grup ödemesi kaydedildi");

      // Eğer ödenen grup şu anki dağıtım grubuysa, dağıtım panelini kapat ve yeni dağıtıma hazırla
      if (selectedGroup === currentDistributionId) {
        setShowDistribution(false);
        setCurrentDistributionId(null);
      }

      // Verileri yeniden yükle
      await loadTableData();

      // Başarı mesajı göster ve diyaloğu kapat
      toast.success(
        itemError
          ? "Ödeme alındı, ancak bazı ürünlerde hata oluştu"
          : "Grup ödemesi başarıyla alındı"
      );
      handleClosePaymentByGroupDialog();

      // Aktif sipariş kontrolü: Masada başka ürün kalmadı mı?
      const remainingItems = orderItems.filter(
        (item) => item.status === "active"
      );

      if (remainingItems.length === 0) {
        // Masada hiç aktif ürün kalmadıysa siparişi tamamla
        try {
          console.log("Tüm ürünler tamamlandı, sipariş kapatılıyor");
          // Bir kez daha siparişi getir (en güncel durum için)
          const currentOrder = await db.orders.get(activeOrder.id);
          if (currentOrder && currentOrder.status === "active") {
            await db.orders.complete(activeOrder.id);
            console.log("Sipariş başarıyla kapatıldı");

            // Masa durumunu doğrudan güncelle
            if (table) {
              console.log("Masa durumu manuel olarak güncelleniyor:", table.id);
              try {
                await db.tables.update(table.id, { status: "available" });
                setTable({ ...table, status: "available" });
                console.log("Masa boş durumuna getirildi:", table.id);
              } catch (tableError) {
                console.error("Masa durumu güncellenirken hata:", tableError);
              }
            }
          }
          // Masalar sayfasına yönlendir
          navigate("/tables");
        } catch (error) {
          console.error("Sipariş tamamlanırken hata:", error);
          // Siparişi tamamlayamazsak bile devam et, ürünler zaten tamamlandı
        }
      }
    } catch (error) {
      console.error("Grup ödemesi işlenirken hata oluştu:", error);
      toast.error("Grup ödemesi sırasında bir hata oluştu");
    }
  };

  // Doğrudan dağıtıma ekleme işlemi (popup yok)
  const handleDistribute = async (itemId: string) => {
    try {
      // Dağıtım ID'si yoksa yeni bir ID oluştur
      let distributionId = currentDistributionId;
      if (!distributionId) {
        distributionId = Math.floor(Math.random() * 10000).toString();
        setCurrentDistributionId(distributionId);
      }

      // Öğeyi güncelle
      await db.orderItems.assignTo(itemId, distributionId);

      // Dağıtım panelini göster
      setShowDistribution(true);

      // Verileri yenile
      await loadTableData();

      // Masada kalan başka aktif ürün var mı kontrol et
      const remainingItems = orderItems.filter(
        (item) =>
          item.id !== itemId && item.status === "active" && !item.assignedTo
      );

      // Eğer masada hiç ürün kalmadıysa sipariş tamamlanmayacak, sadece dağıtım gösterilecek
      // Bu sebeple masalar sayfasına yönlendirmiyoruz, kullanıcı dağıtımdaki ürünleri işleyebilmeli

      // Toast bildirimi kaldırıldı
    } catch (error) {
      console.error("Ürün dağıtıma gönderilirken hata oluştu:", error);
      // Sadece hata durumunda bildirim göster
      toast.error("Ürün dağıtıma gönderilemedi");
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!table) {
    return (
      <Container>
        <Typography variant="h5" color="error" sx={{ mt: 4 }}>
          Masa bulunamadı.
        </Typography>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/tables")}
          sx={{ mt: 2 }}
        >
          Masalara Dön
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <IconButton onClick={() => navigate("/tables")} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" component="h1">
            {table.name}
          </Typography>
          <Chip
            label={table.status === "occupied" ? "Dolu" : "Boş"}
            color={table.status === "occupied" ? "error" : "success"}
            sx={{ ml: 2 }}
          />
        </Box>

        {activeOrder && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<PaymentIcon />}
            onClick={handleOpenPaymentDialog}
          >
            Ödeme Al
          </Button>
        )}
      </Box>

      <Grid container spacing={2}>
        {/* Sol Panel - Sipariş Listesi */}
        <Grid
          size={{
            xs: 12,
            md: showDistribution ? 4 : 6,
            lg: showDistribution ? 3 : 5,
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 2,
              borderRadius: 2,
              height: "calc(100vh - 140px)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>
              Sipariş Detayları
              {activeOrder && (
                <Typography variant="body2" color="textSecondary">
                  Sipariş No: #{activeOrder.id.substring(0, 8)}
                </Typography>
              )}
            </Typography>

            {!activeOrder ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: 1,
                }}
              >
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Bu masada aktif sipariş bulunmuyor.
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleCreateOrder}
                >
                  Sipariş Oluştur
                </Button>
              </Box>
            ) : (
              <>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 1,
                  }}
                >
                  <Typography variant="subtitle1">Ürünler</Typography>
                  {showDistribution ? (
                    <IconButton
                      color="primary"
                      onClick={() => setShowDistribution(false)}
                      title="Dağıtımı Gizle"
                    >
                      <ArrowBackIcon />
                    </IconButton>
                  ) : (
                    // Dağıtımda en az 1 ürün varsa dağıtım butonu görünsün
                    orderItems.some(
                      (item) =>
                        item.status === "active" && item.assignedTo !== null
                    ) && (
                      <IconButton
                        color="primary"
                        onClick={() => setShowDistribution(true)}
                        title="Dağıtımı Göster"
                      >
                        <AssignmentIcon />
                      </IconButton>
                    )
                  )}
                </Box>

                <Box sx={{ flex: 1, overflow: "auto" }}>
                  <List>
                    {orderItems
                      .filter(
                        (item) =>
                          item.status === "active" && item.assignedTo === null
                      )
                      // Ürünleri createdAt tarihine göre ters sırala (en son eklenen en üstte)
                      .sort(
                        (a, b) =>
                          new Date(b.createdAt).getTime() -
                          new Date(a.createdAt).getTime()
                      )
                      .map((item) => (
                        <Paper
                          key={item.id}
                          elevation={1}
                          sx={{
                            mb: 1,
                            borderRadius: 1,
                            border: selectedItems.includes(item.id) ? 2 : 0,
                            borderColor: "primary.main",
                          }}
                          onClick={() => handleSelectItem(item.id)}
                        >
                          <ListItem
                            secondaryAction={
                              <Box>
                                <IconButton
                                  edge="end"
                                  color="primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDistribute(item.id);
                                  }}
                                >
                                  <AssignmentIcon />
                                </IconButton>
                                <IconButton
                                  edge="end"
                                  color="error"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveItem(item.id);
                                  }}
                                >
                                  <RemoveCircleIcon />
                                </IconButton>
                              </Box>
                            }
                          >
                            <ListItemText
                              primary={
                                <Box
                                  sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                  }}
                                >
                                  <Typography variant="body1">
                                    {getProductName(item.productId)}
                                  </Typography>
                                  <Typography variant="body1">
                                    {(item.price * item.quantity).toFixed(2)} ₺
                                  </Typography>
                                </Box>
                              }
                              secondary={
                                <Box>
                                  <Typography
                                    variant="body2"
                                    color="textSecondary"
                                  >
                                    {item.quantity} x {item.price.toFixed(2)} ₺
                                  </Typography>
                                </Box>
                              }
                            />
                          </ListItem>
                        </Paper>
                      ))}
                  </List>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <span>Toplam (Tüm Sipariş)</span>
                    <span>{calculateTotalAll().toFixed(2)} ₺</span>
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: "bold",
                    }}
                  >
                    <span>Kalan Tutar</span>
                    <span>{calculateTotal().toFixed(2)} ₺</span>
                  </Typography>
                </Box>
              </>
            )}
          </Paper>
        </Grid>

        {/* Orta Panel - Dağıtım (koşullu göster) */}
        {(showDistribution ||
          orderItems.some(
            (item) => item.status === "active" && item.assignedTo !== null
          )) && (
          <Grid size={{ xs: 12, md: 4, lg: 3 }}>
            <Paper
              elevation={3}
              sx={{
                p: 2,
                borderRadius: 2,
                height: "calc(100vh - 140px)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
              >
                <Typography variant="h6">
                  Dağıtım {currentDistributionId && `#${currentDistributionId}`}
                </Typography>
                {orderItems.filter(
                  (item) => item.status === "active" && item.assignedTo !== null
                ).length > 0 && (
                  <Button
                    size="small"
                    color="primary"
                    variant="contained"
                    onClick={() =>
                      handlePaymentForGroup(currentDistributionId || "")
                    }
                  >
                    Ödeme Al
                  </Button>
                )}
              </Box>

              {!activeOrder ? (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: 1,
                  }}
                >
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    Aktif sipariş yok.
                  </Typography>
                </Box>
              ) : (
                <>
                  <Box sx={{ flex: 1, overflow: "auto" }}>
                    {/* Şu anki dağıtım grubundaki ürünleri göster */}
                    {showDistribution && (
                      <List>
                        {orderItems
                          .filter(
                            (item) =>
                              item.status === "active" &&
                              item.assignedTo !== null
                          )
                          // Ürünleri createdAt tarihine göre ters sırala (en son eklenen en üstte)
                          .sort(
                            (a, b) =>
                              new Date(b.createdAt).getTime() -
                              new Date(a.createdAt).getTime()
                          )
                          .map((item) => (
                            <ListItem
                              key={item.id}
                              secondaryAction={
                                <Box>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleReturnToTable(item.id)}
                                  >
                                    <RemoveCircleIcon />
                                  </IconButton>
                                </Box>
                              }
                            >
                              <ListItemText
                                primary={
                                  <Box
                                    sx={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                    }}
                                  >
                                    <Typography variant="body1">
                                      {getProductName(item.productId)}
                                    </Typography>
                                    <Typography variant="body1">
                                      {(item.price * item.quantity).toFixed(2)}{" "}
                                      ₺
                                    </Typography>
                                  </Box>
                                }
                                secondary={
                                  <Typography
                                    variant="body2"
                                    color="textSecondary"
                                  >
                                    {item.quantity} x {item.price.toFixed(2)} ₺
                                    - Dağıtım #{item.assignedTo}
                                  </Typography>
                                }
                              />
                            </ListItem>
                          ))}
                      </List>
                    )}

                    {orderItems.filter(
                      (item) =>
                        item.status === "active" &&
                        item.assignedTo === currentDistributionId
                    ).length === 0 && (
                      <Box sx={{ textAlign: "center", py: 4 }}>
                        <Typography variant="body1" color="textSecondary">
                          Dağıtımda ürün bulunmuyor. Dağıtıma göndermek için
                          siparişlerin yanındaki dağıtım butonuna tıklayın.
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Şu anki dağıtım grubu için toplam tutar */}
                  {currentDistributionId &&
                    orderItems.filter(
                      (item) =>
                        item.status === "active" &&
                        item.assignedTo === currentDistributionId
                    ).length > 0 && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            mb: 1,
                          }}
                        >
                          <Typography variant="subtitle1">
                            Toplam (Tüm Sipariş):
                          </Typography>
                          <Typography variant="subtitle1">
                            {calculateTotalAll().toFixed(2)} ₺
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography variant="h6">Dağıtım Tutarı:</Typography>
                          <Typography variant="h6">
                            {orderItems
                              .filter(
                                (item) =>
                                  item.status === "active" &&
                                  item.assignedTo === currentDistributionId
                              )
                              .reduce(
                                (sum, item) => sum + item.price * item.quantity,
                                0
                              )
                              .toFixed(2)}{" "}
                            ₺
                          </Typography>
                        </Box>
                      </>
                    )}
                </>
              )}
            </Paper>
          </Grid>
        )}

        {/* Sağ Panel - Ürün Listesi */}
        <Grid
          size={{
            xs: 12,
            md: showDistribution ? 4 : 6,
            lg: showDistribution ? 6 : 7,
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 2,
              borderRadius: 2,
              height: "calc(100vh - 140px)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Tabs
              value={activeTabIndex}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ mb: 2 }}
            >
              <Tab label="Kategoriler" />
              <Tab label="Tüm Ürünler" />
            </Tabs>

            {activeTabIndex === 0 && (
              <>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
                  {categories.map((category) => (
                    <Chip
                      key={category.id}
                      label={category.name}
                      onClick={() => handleCategoryChange(category.id)}
                      color={
                        selectedCategory === category.id ? "primary" : "default"
                      }
                      variant={
                        selectedCategory === category.id ? "filled" : "outlined"
                      }
                    />
                  ))}
                </Box>

                <Box sx={{ flex: 1, overflow: "auto" }}>
                  <Grid container spacing={2}>
                    {products.map((product) => (
                      <Grid size={{ xs: 6, sm: 4, md: 3 }} key={product.id}>
                        <Card
                          elevation={2}
                          sx={{
                            cursor: "pointer",
                            height: "100%",
                            transition: "transform 0.2s",
                            "&:hover": {
                              transform: "scale(1.02)",
                            },
                          }}
                          onClick={() => handleAddProduct(product)}
                        >
                          <CardContent>
                            <Typography variant="h6" component="div" noWrap>
                              {product.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {product.price.toFixed(2)} ₺
                            </Typography>
                            {product.isWeighted && (
                              <Chip
                                size="small"
                                label="Kilogram"
                                sx={{ mt: 1 }}
                              />
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </>
            )}

            {activeTabIndex === 1 && (
              <Box sx={{ flex: 1, overflow: "auto" }}>
                <Grid container spacing={2}>
                  {/* Burada tüm ürünler listelenecek */}
                </Grid>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Kişi Atama Dialog */}
      <Dialog open={assignPersonDialog} onClose={handleCloseAssignDialog}>
        <DialogTitle>
          {selectedItems.length > 0
            ? `${selectedItems.length} ürün için kişi ata`
            : "Ürün için kişi ata"}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Kişi Adı"
            fullWidth
            variant="outlined"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAssignDialog}>İptal</Button>
          <Button
            onClick={
              selectedItems.length > 0
                ? () => handleBulkAssign()
                : handleAssignPerson
            }
            variant="contained"
          >
            Ata
          </Button>
        </DialogActions>
      </Dialog>

      {/* Ödeme Dialog */}
      <Dialog open={paymentDialog} onClose={handleClosePaymentDialog}>
        <DialogTitle>Ödeme Al</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Bu ödeme masadaki ve dağıtımdaki tüm aktif ürünleri kapsamaktadır.
            Toplam tutar: {calculateTotalAll().toFixed(2)} ₺
          </Typography>

          <TextField
            margin="dense"
            label="Ödeme Tutarı"
            fullWidth
            variant="outlined"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            type="number"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">₺</InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          <Typography variant="subtitle1" gutterBottom>
            Ödeme Yöntemi
          </Typography>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {PAYMENT_METHODS.map((method) => (
              <Chip
                key={method.value}
                label={method.label}
                onClick={() => setPaymentMethod(method.value as any)}
                color={paymentMethod === method.value ? "primary" : "default"}
                variant={paymentMethod === method.value ? "filled" : "outlined"}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePaymentDialog}>İptal</Button>
          <Button onClick={handlePayment} variant="contained" color="primary">
            Ödeme Al
          </Button>
        </DialogActions>
      </Dialog>

      {/* Grup Ödeme Dialog */}
      <Dialog
        open={groupPaymentDialog}
        onClose={handleClosePaymentByGroupDialog}
      >
        <DialogTitle>
          {selectedGroup ? `#${selectedGroup} için Ödeme Al` : "Grup Ödeme Al"}
        </DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Ödeme Tutarı"
            fullWidth
            variant="outlined"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            type="number"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">₺</InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          <Typography variant="subtitle1" gutterBottom>
            Ödeme Yöntemi
          </Typography>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {PAYMENT_METHODS.map((method) => (
              <Chip
                key={method.value}
                label={method.label}
                onClick={() => setPaymentMethod(method.value as any)}
                color={paymentMethod === method.value ? "primary" : "default"}
                variant={paymentMethod === method.value ? "filled" : "outlined"}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePaymentByGroupDialog}>İptal</Button>
          <Button
            onClick={handleGroupPayment}
            variant="contained"
            color="primary"
          >
            Ödeme Al ve Tamamla
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TableDetailPage;
