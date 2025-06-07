import {
  Category,
  JsonCategory,
  JsonProduct,
  JsonTable,
} from "../models/types";

// JSON dosyalarını okuma ve yazma işlemlerini yapacak servis
const FileService = {
  // Kategorileri dosyadan okuma
  async readCategories(): Promise<JsonCategory[]> {
    try {
      const response = await fetch("/data/kategoriler.json");
      if (!response.ok) {
        throw new Error("Kategoriler okunamadı");
      }
      return await response.json();
    } catch (error) {
      console.error("Kategoriler okunurken hata oluştu:", error);
      return [];
    }
  },

  // Kategorileri dosyaya yazma
  async saveCategories(categories: JsonCategory[]): Promise<boolean> {
    try {
      const response = await fetch("/api/save-categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(categories),
      });

      if (!response.ok) {
        throw new Error("Kategoriler kaydedilemedi");
      }

      return true;
    } catch (error) {
      console.error("Kategoriler kaydedilirken hata oluştu:", error);
      return false;
    }
  },

  // Ürünleri dosyadan okuma
  async readProducts(): Promise<JsonProduct[]> {
    try {
      const response = await fetch("/data/urunler.json");
      if (!response.ok) {
        throw new Error("Ürünler okunamadı");
      }
      return await response.json();
    } catch (error) {
      console.error("Ürünler okunurken hata oluştu:", error);
      return [];
    }
  },

  // Ürünleri dosyaya yazma
  async saveProducts(products: JsonProduct[]): Promise<boolean> {
    try {
      const response = await fetch("/api/save-products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(products),
      });

      if (!response.ok) {
        throw new Error("Ürünler kaydedilemedi");
      }

      return true;
    } catch (error) {
      console.error("Ürünler kaydedilirken hata oluştu:", error);
      return false;
    }
  },

  // Masaları dosyadan okuma
  async readTables(): Promise<JsonTable[]> {
    try {
      const response = await fetch("/data/masalar.json");
      if (!response.ok) {
        throw new Error("Masalar okunamadı");
      }
      return await response.json();
    } catch (error) {
      console.error("Masalar okunurken hata oluştu:", error);
      return [];
    }
  },

  // Masaları dosyaya yazma
  async saveTables(tables: JsonTable[]): Promise<boolean> {
    try {
      const response = await fetch("/api/save-tables", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tables),
      });

      if (!response.ok) {
        throw new Error("Masalar kaydedilemedi");
      }

      return true;
    } catch (error) {
      console.error("Masalar kaydedilirken hata oluştu:", error);
      return false;
    }
  },
};

export default FileService;
