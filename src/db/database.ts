import { openDB } from "idb";
import { v4 as uuidv4 } from "uuid";
import { Category, CategoryWithChildren } from "../models/types";
import kategoriler from "../data/kategoriler.json";
import urunler from "../data/urunler.json";
import masalar from "../data/masalar.json";
import logger from "../utils/logger";

// Veritabanı şeması
interface PosDB {
  categories: {
    key: string;
    value: {
      id: string;
      name: string;
      parentId: string | null; // Alt kategori ise üst kategorinin ID'si, ana kategori ise null
      createdAt: string;
      updatedAt: string;
    };
    indexes: { "by-name": string; "by-parent": string | null };
  };
  products: {
    key: string;
    value: {
      id: string;
      name: string;
      price: number;
      categoryId: string | null;
      isWeighted: boolean;
      createdAt: string;
      updatedAt: string;
    };
    indexes: { "by-category": string };
  };
  productVariants: {
    key: string;
    value: {
      id: string;
      productId: string;
      name: string;
      price: number;
      createdAt: string;
      updatedAt: string;
    };
    indexes: { "by-product": string };
  };
  tables: {
    key: string;
    value: {
      id: string;
      name: string;
      status: "available" | "occupied";
      createdAt: string;
      updatedAt: string;
    };
    indexes: { "by-status": string };
  };
  orders: {
    key: string;
    value: {
      id: string;
      tableId: string;
      status: "active" | "completed" | "cancelled";
      createdAt: string;
      updatedAt: string;
    };
    indexes: { "by-table": string; "by-status": string };
  };
  orderItems: {
    key: string;
    value: {
      id: string;
      orderId: string;
      productId: string;
      variantId: string | null;
      quantity: number;
      price: number;
      assignedTo: string | null;
      status: "active" | "cancelled" | "completed";
      method?: "cash" | "credit_card" | "debit_card" | "other";
      createdAt: string;
      updatedAt: string;
    };
    indexes: { "by-order": string };
  };
  payments: {
    key: string;
    value: {
      id: string;
      orderId: string;
      amount: number;
      method: "cash" | "credit_card" | "debit_card" | "other";
      createdAt: string;
      updatedAt: string;
    };
    indexes: { "by-order": string };
  };
  activityLogs: {
    key: string;
    value: {
      id: string;
      timestamp: string;
      operation: string;
      details: any;
      tableId?: string;
      orderId?: string;
      userId: string;
      userName: string;
    };
    indexes: {
      "by-date": string;
      "by-user": string;
      "by-table": string;
      "by-order": string;
    };
  };
  dailySalesReports: {
    key: string;
    value: {
      id: string;
      date: string;
      totalSales: number;
      totalOrders: number;
      salesByMethod: {
        cash: number;
        credit_card: number;
        debit_card: number;
        other: number;
      };
      createdAt: string;
      updatedAt: string;
    };
    indexes: { "by-date": string };
  };
  users: {
    key: string;
    value: {
      id: string;
      username: string;
      fullName: string;
      isAdmin: boolean;
      createdAt: string;
      updatedAt: string;
    };
    indexes: { "by-username": string };
  };
}

// Kategori veri cursor'ını işleyecek yardımcı fonksiyon
// ES5 hedefinde strict mode içindeki blok fonksiyonları desteklenmediği için dışarı alındı
async function processCategoryCursor(cursor: any): Promise<void> {
  if (!cursor) return;

  const category = cursor.value;
  if (!category.hasOwnProperty("parentId")) {
    category.parentId = null;
    await cursor.update(category);
  }

  const nextCursor = await cursor.continue();
  if (nextCursor) {
    await processCategoryCursor(nextCursor);
  }
}

// Veritabanını aç
const dbPromise = openDB<PosDB>("pos-database", 3, {
  upgrade(db, oldVersion, newVersion) {
    // Veritabanı ilk kez oluşturuluyorsa
    if (oldVersion < 1) {
      // Kategoriler store
      const categoryStore = db.createObjectStore("categories", {
        keyPath: "id",
      });
      categoryStore.createIndex("by-name", "name");

      // Ürünler store
      const productStore = db.createObjectStore("products", { keyPath: "id" });
      productStore.createIndex("by-category", "categoryId");

      // Ürün varyantları store
      const variantStore = db.createObjectStore("productVariants", {
        keyPath: "id",
      });
      variantStore.createIndex("by-product", "productId");

      // Masalar store
      const tableStore = db.createObjectStore("tables", { keyPath: "id" });
      tableStore.createIndex("by-status", "status");

      // Siparişler store
      const orderStore = db.createObjectStore("orders", { keyPath: "id" });
      orderStore.createIndex("by-table", "tableId");
      orderStore.createIndex("by-status", "status");

      // Sipariş öğeleri store
      const orderItemStore = db.createObjectStore("orderItems", {
        keyPath: "id",
      });
      orderItemStore.createIndex("by-order", "orderId");

      // Ödemeler store
      const paymentStore = db.createObjectStore("payments", { keyPath: "id" });
      paymentStore.createIndex("by-order", "orderId");
    }

    // Version 2: Kategori yapısına parentId ekleniyor
    if (oldVersion < 2) {
      // categories store mevcut mu kontrol et
      if (!db.objectStoreNames.contains("categories")) return;

      // by-parent indeksi doğrudan oluşturuluyor
      // transaction içinde indexNames.contains kontrolü güvenilir olmadığı için
      // try-catch bloğu içinde ekliyoruz
      try {
        // TypeScript hata vermemesi için basit bir çözüm
        const store = db
          .transaction("categories", "readwrite")
          .objectStore("categories");
        // @ts-ignore: TypeScript'in IDBObjectStore.createIndex ile ilgili sorunu
        store.createIndex("by-parent", "parentId");
      } catch (e) {
        // İndeks zaten varsa hata verecektir, bu normal bir durumdur
        console.log("by-parent indeksi zaten mevcut olabilir");
      }
    }

    // Version 3: İşlem logları, günlük ciro raporları ve kullanıcılar için tablolar ekleniyor
    if (oldVersion < 3) {
      // İşlem logları store
      if (!db.objectStoreNames.contains("activityLogs")) {
        const activityLogStore = db.createObjectStore("activityLogs", {
          keyPath: "id",
        });
        activityLogStore.createIndex("by-date", "timestamp");
        activityLogStore.createIndex("by-user", "userId");
        activityLogStore.createIndex("by-table", "tableId");
        activityLogStore.createIndex("by-order", "orderId");
      }

      // Günlük ciro raporları store
      if (!db.objectStoreNames.contains("dailySalesReports")) {
        const salesReportStore = db.createObjectStore("dailySalesReports", {
          keyPath: "id",
        });
        salesReportStore.createIndex("by-date", "date");
      }

      // Kullanıcılar store
      if (!db.objectStoreNames.contains("users")) {
        const userStore = db.createObjectStore("users", {
          keyPath: "id",
        });
        userStore.createIndex("by-username", "username");

        // Varsayılan admin kullanıcısı oluştur
        const adminUser = {
          id: "admin-1",
          username: "admin",
          fullName: "Sistem Yöneticisi",
          isAdmin: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        userStore.add(adminUser);
      }
    }
  },

  // Veritabanı yükseltildikten sonra açılırken çalışacak kod
  blocking() {
    // Başka sekmelerde eski veritabanı kullanılıyorsa zorla kapatılmasını sağlar
    console.warn(
      "Veritabanı daha yeni bir sürüme yükseltildi ve eski sekme kapatılıyor."
    );
  },
});

// Uygulama başlangıcında kategorilerdeki parentId alanını kontrol et
async function ensureCategoryParentId() {
  try {
    const db = await dbPromise;

    // Veritabanı açık değilse veya kategori store'u yoksa işlem yapma
    if (!db.objectStoreNames.contains("categories")) return;

    const tx = db.transaction("categories", "readwrite");
    const store = tx.objectStore("categories");

    // Tüm kategorileri dolaş ve parentId özelliği yoksa ekle
    const cursor = await store.openCursor();

    if (cursor) {
      await processCategoryCursor(cursor);
    }

    await tx.done;
  } catch (e) {
    console.error("Kategori şemasını güncellerken hata oluştu:", e);
  }
}

// Uygulama başlangıcında kategorilerdeki parentId alanını kontrol et
ensureCategoryParentId();

// Veritabanı başlatma işlemi
async function initializeDatabase() {
  try {
    // Veritabanı bağlantısını aç ve kategori parentId kontrolü yap
    await ensureCategoryParentId();

    const db = await dbPromise;

    // Kategorileri kontrol et
    const categories = await db.getAll("categories");
    if (categories.length === 0) {
      console.log("Varsayılan kategoriler JSON dosyasından yükleniyor...");

      // JSON dosyasından kategorileri al ve ekle
      for (const category of kategoriler) {
        // createdAt ve updatedAt ekle
        const now = new Date().toISOString();
        await db.add("categories", {
          ...category,
          createdAt: now,
          updatedAt: now,
        });
      }

      logger.log("DATABASE_INIT", "Kategoriler başarıyla yüklendi");
    }

    // Masaları kontrol et
    const tables = await db.getAll("tables");
    if (tables.length === 0) {
      console.log("Varsayılan masalar JSON dosyasından yükleniyor...");

      // JSON dosyasından masaları al ve ekle
      for (const table of masalar) {
        // createdAt ve updatedAt ekle
        const now = new Date().toISOString();
        await db.add("tables", {
          ...table,
          createdAt: now,
          updatedAt: now,
        });
      }

      logger.log("DATABASE_INIT", "Masalar başarıyla yüklendi");
    }

    // Ürünleri kontrol et
    const products = await db.getAll("products");
    if (products.length === 0) {
      console.log("Varsayılan ürünler JSON dosyasından yükleniyor...");

      // JSON dosyasından ürünleri al ve ekle
      for (const product of urunler) {
        // createdAt ve updatedAt ekle
        const now = new Date().toISOString();
        await db.add("products", {
          ...product,
          createdAt: now,
          updatedAt: now,
        });
      }

      logger.log("DATABASE_INIT", "Ürünler başarıyla yüklendi");
    }

    console.log("Veritabanı başarıyla başlatıldı");
  } catch (error) {
    console.error("Veritabanı başlatılırken hata oluştu:", error);
    logger.log("DATABASE_ERROR", error);
  }
}

// Veritabanı işlemleri için ana obje
const db = {
  // Kategori işlemleri
  categories: {
    async getAll() {
      const result = await (await dbPromise).getAll("categories");
      logger.log("CATEGORY_GET_ALL", { count: result.length });
      return result;
    },
    async get(id: string) {
      return (await dbPromise).get("categories", id);
    },
    async getByParent(parentId: string | null) {
      return (await dbPromise).getAllFromIndex(
        "categories",
        "by-parent",
        parentId
      );
    },
    async getHierarchy(): Promise<CategoryWithChildren[]> {
      // Önce tüm kategorileri al
      const allCategories = await this.getAll();

      // Ana kategorileri filtrele
      const mainCategories = allCategories.filter(
        (category) => category.parentId === null
      );

      // Her bir ana kategori için alt kategorileri hazırla
      const categoriesWithChildren: CategoryWithChildren[] = mainCategories.map(
        (category) => {
          const children = allCategories.filter(
            (c) => c.parentId === category.id
          );
          return {
            ...category,
            children,
          };
        }
      );

      return categoriesWithChildren;
    },
    async add(name: string, parentId: string | null = null) {
      const now = new Date().toISOString();
      const category = {
        id: uuidv4(),
        name,
        parentId,
        createdAt: now,
        updatedAt: now,
      };
      await (await dbPromise).add("categories", category);
      return category;
    },
    async update(id: string, name: string, parentId: string | null = null) {
      const db = await dbPromise;
      const category = await db.get("categories", id);
      if (!category) return null;

      const updatedCategory = {
        ...category,
        name,
        parentId,
        updatedAt: new Date().toISOString(),
      };
      await db.put("categories", updatedCategory);
      return updatedCategory;
    },
    async delete(id: string) {
      await (await dbPromise).delete("categories", id);
      return true;
    },
  },

  // Ürün işlemleri
  products: {
    async getAll() {
      return (await dbPromise).getAll("products");
    },
    async getByCategory(categoryId: string | null) {
      return (await dbPromise).getAllFromIndex(
        "products",
        "by-category",
        categoryId
      );
    },
    async get(id: string) {
      return (await dbPromise).get("products", id);
    },
    async add(
      product: Omit<
        PosDB["products"]["value"],
        "id" | "createdAt" | "updatedAt"
      >
    ) {
      const now = new Date().toISOString();
      const newProduct = {
        id: uuidv4(),
        ...product,
        createdAt: now,
        updatedAt: now,
      };
      await (await dbPromise).add("products", newProduct);
      return newProduct;
    },
    async update(
      id: string,
      data: Partial<
        Omit<PosDB["products"]["value"], "id" | "createdAt" | "updatedAt">
      >
    ) {
      const db = await dbPromise;
      const product = await db.get("products", id);
      if (!product) return null;

      const updatedProduct = {
        ...product,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      await db.put("products", updatedProduct);
      return updatedProduct;
    },
    async delete(id: string) {
      // Önce ürün varyantlarını sil
      const db = await dbPromise;
      const variants = await db.getAllFromIndex(
        "productVariants",
        "by-product",
        id
      );
      const tx = db.transaction(["productVariants", "products"], "readwrite");

      for (const variant of variants) {
        await tx.objectStore("productVariants").delete(variant.id);
      }

      await tx.objectStore("products").delete(id);
      await tx.done;
      return true;
    },
  },

  // Ürün varyantları işlemleri
  variants: {
    async getByProduct(productId: string) {
      return (await dbPromise).getAllFromIndex(
        "productVariants",
        "by-product",
        productId
      );
    },
    async get(id: string) {
      return (await dbPromise).get("productVariants", id);
    },
    async add(
      variant: Omit<
        PosDB["productVariants"]["value"],
        "id" | "createdAt" | "updatedAt"
      >
    ) {
      const now = new Date().toISOString();
      const newVariant = {
        id: uuidv4(),
        ...variant,
        createdAt: now,
        updatedAt: now,
      };
      await (await dbPromise).add("productVariants", newVariant);
      return newVariant;
    },
    async update(
      id: string,
      data: Partial<
        Omit<
          PosDB["productVariants"]["value"],
          "id" | "productId" | "createdAt" | "updatedAt"
        >
      >
    ) {
      const db = await dbPromise;
      const variant = await db.get("productVariants", id);
      if (!variant) return null;

      const updatedVariant = {
        ...variant,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      await db.put("productVariants", updatedVariant);
      return updatedVariant;
    },
    async delete(id: string) {
      await (await dbPromise).delete("productVariants", id);
      return true;
    },
  },

  // Masa işlemleri
  tables: {
    async getAll() {
      return (await dbPromise).getAll("tables");
    },
    async getByStatus(status: PosDB["tables"]["value"]["status"]) {
      return (await dbPromise).getAllFromIndex("tables", "by-status", status);
    },
    async get(id: string) {
      return (await dbPromise).get("tables", id);
    },
    async add(name: string) {
      const now = new Date().toISOString();
      const table = {
        id: uuidv4(),
        name,
        status: "available" as const,
        createdAt: now,
        updatedAt: now,
      };
      await (await dbPromise).add("tables", table);
      return table;
    },
    async update(
      id: string,
      data: Partial<
        Omit<PosDB["tables"]["value"], "id" | "createdAt" | "updatedAt">
      >
    ) {
      const db = await dbPromise;
      const table = await db.get("tables", id);
      if (!table) return null;

      const updatedTable = {
        ...table,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      await db.put("tables", updatedTable);
      return updatedTable;
    },
    async delete(id: string) {
      await (await dbPromise).delete("tables", id);
      return true;
    },
  },

  // Sipariş işlemleri
  orders: {
    async getByTable(tableId: string) {
      return (await dbPromise).getAllFromIndex("orders", "by-table", tableId);
    },
    async getActiveByTable(tableId: string) {
      const orders = await this.getByTable(tableId);
      return orders.filter((order) => order.status === "active");
    },
    async get(id: string) {
      return (await dbPromise).get("orders", id);
    },
    async create(tableId: string) {
      const now = new Date().toISOString();
      const order = {
        id: uuidv4(),
        tableId,
        status: "active" as const,
        createdAt: now,
        updatedAt: now,
      };

      const db = await dbPromise;
      const tx = db.transaction(["orders", "tables"], "readwrite");

      // Siparişi ekle
      await tx.objectStore("orders").add(order);

      // Masa durumunu güncelle
      const table = await db.get("tables", tableId);
      if (table) {
        await tx.objectStore("tables").put({
          ...table,
          status: "occupied" as const,
          updatedAt: now,
        });
      }

      await tx.done;
      return order;
    },
    async update(id: string, status: PosDB["orders"]["value"]["status"]) {
      const db = await dbPromise;
      const order = await db.get("orders", id);
      if (!order) return null;

      const updatedOrder = {
        ...order,
        status,
        updatedAt: new Date().toISOString(),
      };
      await db.put("orders", updatedOrder);
      return updatedOrder;
    },
    async complete(id: string) {
      try {
        const db = await dbPromise;

        // Önce siparişi kontrol et
        const order = await db.get("orders", id);
        if (!order) {
          console.error(`Sipariş bulunamadı: ${id}`);
          return null;
        }

        // Eğer sipariş zaten tamamlandıysa tekrar işlem yapma
        if (order.status === "completed") {
          console.log(`Sipariş zaten tamamlanmış: ${id}`);
          return order;
        }

        // Transaction'ı başlat
        const tx = db.transaction(["orders", "tables"], "readwrite");

        // Siparişi tamamla
        const updatedOrder = {
          ...order,
          status: "completed" as const,
          updatedAt: new Date().toISOString(),
        };

        await tx.objectStore("orders").put(updatedOrder);
        console.log(`Sipariş ${id} başarıyla tamamlandı`);

        try {
          // Aynı masada başka aktif sipariş var mı kontrol et
          const tableOrders = await db.getAllFromIndex(
            "orders",
            "by-table",
            order.tableId
          );

          // Bütün siparişleri tekrar kontrol et
          const hasActiveOrders = tableOrders.some(
            (o) => o.id !== id && o.status === "active"
          );

          // Eğer başka aktif sipariş yoksa masayı boşalt
          if (!hasActiveOrders) {
            console.log(
              `Masada başka aktif sipariş yok, masa boşaltılıyor: ${order.tableId}`
            );

            const table = await db.get("tables", order.tableId);
            if (table) {
              // Masa durumunu güncelle
              const updatedTable = {
                ...table,
                status: "available" as const,
                updatedAt: new Date().toISOString(),
              };

              await tx.objectStore("tables").put(updatedTable);
              console.log(
                `Masa ${order.tableId} durumu güncellendi: available`
              );

              // İşlemi tamamla ve transaction'ı kapat
              await tx.done;

              // Masayı doğrudan güncellemeyi de dene (yedek olarak)
              try {
                await db.put("tables", {
                  ...table,
                  status: "available" as const,
                  updatedAt: new Date().toISOString(),
                });
              } catch (e) {
                console.error("İkinci masa güncellemesi sırasında hata:", e);
              }

              return updatedOrder;
            }
          } else {
            console.log(
              `Masada hala aktif sipariş var, masa boşaltılmıyor: ${order.tableId}`
            );
          }
        } catch (tableError) {
          console.error(`Masa güncellenirken hata oluştu:`, tableError);
          // Hata olsa bile ana işlemi devam ettirmek için hatayı yutuyoruz
        }

        await tx.done;
        return updatedOrder;
      } catch (error) {
        console.error(`Sipariş tamamlanırken hata oluştu (${id}):`, error);
        throw error; // Hatayı yukarı aktar
      }
    },
  },

  // Sipariş öğeleri işlemleri
  orderItems: {
    async getByOrder(orderId: string) {
      return (await dbPromise).getAllFromIndex(
        "orderItems",
        "by-order",
        orderId
      );
    },
    async get(id: string) {
      return (await dbPromise).get("orderItems", id);
    },
    async add(
      orderItem: Omit<
        PosDB["orderItems"]["value"],
        "id" | "createdAt" | "updatedAt"
      >
    ) {
      const now = new Date().toISOString();
      const newItem = {
        id: uuidv4(),
        ...orderItem,
        createdAt: now,
        updatedAt: now,
      };
      await (await dbPromise).add("orderItems", newItem);
      return newItem;
    },
    async update(
      id: string,
      data: Partial<
        Omit<
          PosDB["orderItems"]["value"],
          "id" | "orderId" | "productId" | "createdAt" | "updatedAt"
        >
      >
    ) {
      try {
        const db = await dbPromise;
        const item = await db.get("orderItems", id);
        if (!item) {
          console.error(`Sipariş ürünü bulunamadı: ${id}`);
          return null;
        }

        const updatedItem = {
          ...item,
          ...data,
          updatedAt: new Date().toISOString(),
        };
        await db.put("orderItems", updatedItem);
        return updatedItem;
      } catch (error) {
        console.error(
          `Sipariş ürünü güncellenirken hata oluştu (${id}):`,
          error
        );
        throw error;
      }
    },
    async assignTo(id: string, assignedTo: string | null) {
      return this.update(id, { assignedTo });
    },
    async cancel(id: string) {
      return this.update(id, { status: "cancelled" });
    },
    async complete(id: string) {
      try {
        return await this.update(id, { status: "completed" });
      } catch (error) {
        console.error(`Ürün tamamlanırken hata oluştu (${id}):`, error);
        throw error;
      }
    },
    async updatePaymentMethod(id: string, method: any) {
      try {
        return await this.update(id, { method });
      } catch (error) {
        console.error(
          `Ödeme yöntemi güncellenirken hata oluştu (${id}):`,
          error
        );
        throw error;
      }
    },
    async delete(id: string) {
      return (await dbPromise).delete("orderItems", id);
    },
  },

  // Ödeme işlemleri
  payments: {
    async getByOrder(orderId: string) {
      return (await dbPromise).getAllFromIndex("payments", "by-order", orderId);
    },
    async add(
      payment: Omit<
        PosDB["payments"]["value"],
        "id" | "createdAt" | "updatedAt"
      >
    ) {
      const now = new Date().toISOString();
      const newPayment = {
        id: uuidv4(),
        ...payment,
        createdAt: now,
        updatedAt: now,
      };
      await (await dbPromise).add("payments", newPayment);
      return newPayment;
    },
  },

  // Kullanıcılar için işlemler
  users: {
    async getAll() {
      const db = await dbPromise;
      return db.getAll("users");
    },

    async getByUsername(username: string) {
      const db = await dbPromise;
      const idx = db.transaction("users").store.index("by-username");
      return idx.get(username);
    },

    async get(id: string) {
      const db = await dbPromise;
      return db.get("users", id);
    },

    async add(
      userData: Omit<PosDB["users"]["value"], "id" | "createdAt" | "updatedAt">
    ) {
      const db = await dbPromise;
      const id = `user-${Date.now()}`;
      const timestamp = new Date().toISOString();

      const user = {
        id,
        ...userData,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      await db.add("users", user);
      return user;
    },

    async update(
      id: string,
      userData: Partial<
        Omit<PosDB["users"]["value"], "id" | "createdAt" | "updatedAt">
      >
    ) {
      const db = await dbPromise;
      const user = await db.get("users", id);

      if (!user) {
        throw new Error(`Kullanıcı bulunamadı: ${id}`);
      }

      const updatedUser = {
        ...user,
        ...userData,
        updatedAt: new Date().toISOString(),
      };

      await db.put("users", updatedUser);
      return updatedUser;
    },

    async delete(id: string) {
      const db = await dbPromise;
      await db.delete("users", id);
    },
  },

  // İşlem logları için işlemler
  activityLogs: {
    async getAll() {
      const db = await dbPromise;
      return db.getAll("activityLogs");
    },

    async getByDate(date: string) {
      const db = await dbPromise;
      const idx = db.transaction("activityLogs").store.index("by-date");
      const range = IDBKeyRange.bound(
        `${date}T00:00:00.000Z`,
        `${date}T23:59:59.999Z`,
        false,
        false
      );

      return idx.getAll(range);
    },

    async add(
      logData: Omit<PosDB["activityLogs"]["value"], "id" | "timestamp">
    ) {
      const db = await dbPromise;
      const id = `log-${Date.now()}`;

      const log = {
        id,
        timestamp: new Date().toISOString(),
        ...logData,
      };

      await db.add("activityLogs", log);
      return log;
    },

    async clear() {
      const db = await dbPromise;
      const tx = db.transaction("activityLogs", "readwrite");
      await tx.objectStore("activityLogs").clear();
      await tx.done;
    },
  },

  // Günlük ciro raporları için işlemler
  dailySalesReports: {
    async getAll() {
      const db = await dbPromise;
      return db.getAll("dailySalesReports");
    },

    async getByDate(date: string) {
      const db = await dbPromise;
      const idx = db.transaction("dailySalesReports").store.index("by-date");
      return idx.get(date);
    },

    async addOrUpdate(
      reportData: Omit<
        PosDB["dailySalesReports"]["value"],
        "id" | "createdAt" | "updatedAt"
      >
    ) {
      const db = await dbPromise;
      const existingReport = await this.getByDate(reportData.date);
      const timestamp = new Date().toISOString();

      if (existingReport) {
        const updatedReport = {
          ...existingReport,
          ...reportData,
          updatedAt: timestamp,
        };

        await db.put("dailySalesReports", updatedReport);
        return updatedReport;
      } else {
        const id = `report-${Date.now()}`;
        const newReport = {
          id,
          ...reportData,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        await db.add("dailySalesReports", newReport);
        return newReport;
      }
    },

    async clear() {
      const db = await dbPromise;
      const tx = db.transaction("dailySalesReports", "readwrite");
      await tx.objectStore("dailySalesReports").clear();
      await tx.done;
    },
  },
};

// Kategori işlemleri için yardımcı objelerimiz
const CategoryOperations = db.categories;
const ProductOperations = db.products;
const ProductVariantOperations = db.variants;
const TableOperations = db.tables;
const OrderOperations = db.orders;
const OrderItemOperations = db.orderItems;
const PaymentOperations = db.payments;
const UserOperations = db.users;
const ActivityLogOperations = db.activityLogs;
const DailySalesReportOperations = db.dailySalesReports;

// Objeleri export et
export {
  CategoryOperations,
  ProductOperations,
  ProductVariantOperations,
  TableOperations,
  OrderOperations,
  OrderItemOperations,
  PaymentOperations,
  UserOperations,
  ActivityLogOperations,
  DailySalesReportOperations,
  initializeDatabase,
};

// Veritabanı objesini export et
export default db;
