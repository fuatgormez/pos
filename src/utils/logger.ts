import { v4 as uuidv4 } from "uuid";
import {
  ActivityLog,
  DailySalesReport,
  OPERATION_TYPES,
} from "../models/types";
import {
  ActivityLogOperations,
  DailySalesReportOperations,
} from "../db/database";

// Giriş yapmış kullanıcı bilgisi için yardımcı fonksiyon
const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem("currentUser");
    if (userStr) {
      return JSON.parse(userStr);
    }
    // Varsayılan kullanıcı bilgisi
    return {
      id: "anonymous",
      username: "anonymous",
      fullName: "Bilinmeyen Kullanıcı",
      isAdmin: false,
    };
  } catch (error) {
    console.error("Kullanıcı bilgisi alınamadı:", error);
    return {
      id: "anonymous",
      username: "anonymous",
      fullName: "Bilinmeyen Kullanıcı",
      isAdmin: false,
    };
  }
};

// İşlem günlüğü için gelişmiş logger
class OperationLogger {
  private logs: ActivityLog[] = [];
  private dailySalesReports: DailySalesReport[] = [];
  private maxLogs: number = 1000;
  private logsStorageKey: string = "pos_operation_logs";
  private salesReportsStorageKey: string = "pos_daily_sales";

  constructor() {
    // LocalStorage'dan mevcut logları ve raporları yükle
    this.loadLogs();
    this.loadSalesReports();
  }

  // Log ekle
  async log(
    operation: string,
    details: any,
    options?: {
      tableId?: string;
      orderId?: string;
    }
  ): Promise<void> {
    const currentUser = getCurrentUser();

    const logEntry: ActivityLog = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      operation,
      details,
      tableId: options?.tableId,
      orderId: options?.orderId,
      userId: currentUser.id,
      userName: currentUser.fullName,
    };

    // Local cache'e ekle
    this.logs.push(logEntry);

    // Veritabanına ekle
    try {
      await ActivityLogOperations.add({
        operation,
        details,
        tableId: options?.tableId,
        orderId: options?.orderId,
        userId: currentUser.id,
        userName: currentUser.fullName,
      });
    } catch (error) {
      console.error("Log veritabanına eklenirken hata:", error);
    }

    console.log(`[LOG] ${operation} by ${currentUser.fullName}:`, details);

    // Maksimum log sayısını kontrol et
    if (this.logs.length > this.maxLogs) {
      // En eski logu sil
      this.logs.shift();
    }

    // Local cache'i kaydet
    this.saveLogs();
  }

  // Ödeme kaydı ekle ve günlük ciroyu güncelle
  async logPayment(
    amount: number,
    method: string,
    orderId: string,
    tableId?: string
  ): Promise<void> {
    // Aktivite loguna ödeme kaydı ekle
    await this.log(
      OPERATION_TYPES.PAYMENT,
      { amount, method, orderId },
      { tableId, orderId }
    );

    // Günlük satış raporunu güncelle
    await this.updateDailySalesReport(amount, method);
  }

  // Günlük satış raporunu güncelle
  private async updateDailySalesReport(
    amount: number,
    method: string
  ): Promise<void> {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD formatında bugünün tarihi

    // Bugünün raporunu bul
    let todayReport = this.dailySalesReports.find(
      (report) => report.date === today
    );

    if (!todayReport) {
      // Bugün için rapor yoksa yeni rapor oluştur
      todayReport = {
        id: uuidv4(),
        date: today,
        totalSales: 0,
        totalOrders: 0,
        salesByMethod: {
          cash: 0,
          credit_card: 0,
          debit_card: 0,
          other: 0,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.dailySalesReports.push(todayReport);
    }

    // Raporu güncelle
    todayReport.totalSales += amount;
    todayReport.totalOrders += 1;

    // Ödeme yöntemine göre güncelle
    if (method === "cash") {
      todayReport.salesByMethod.cash += amount;
    } else if (method === "credit_card") {
      todayReport.salesByMethod.credit_card += amount;
    } else if (method === "debit_card") {
      todayReport.salesByMethod.debit_card += amount;
    } else {
      todayReport.salesByMethod.other += amount;
    }

    todayReport.updatedAt = new Date().toISOString();

    // Veritabanını güncelle
    try {
      await DailySalesReportOperations.addOrUpdate({
        date: today,
        totalSales: todayReport.totalSales,
        totalOrders: todayReport.totalOrders,
        salesByMethod: todayReport.salesByMethod,
      });
    } catch (error) {
      console.error("Satış raporu veritabanına eklenirken hata:", error);
    }

    // Local cache'i güncelle
    this.saveSalesReports();
  }

  // Tüm logları getir
  async getLogs(): Promise<ActivityLog[]> {
    try {
      // Veritabanından en güncel logları getir
      const dbLogs = await ActivityLogOperations.getAll();
      // Local cache'i güncelle
      this.logs = dbLogs;
      this.saveLogs();
      return [...dbLogs];
    } catch (error) {
      console.error("Loglar veritabanından alınırken hata:", error);
      return [...this.logs];
    }
  }

  // Belirli bir tarihe ait logları getir
  async getLogsByDate(date: string): Promise<ActivityLog[]> {
    try {
      // Veritabanından belirtilen tarihe ait logları getir
      const dateFilteredLogs = await ActivityLogOperations.getByDate(date);
      return dateFilteredLogs;
    } catch (error) {
      console.error(`${date} tarihine ait loglar alınırken hata:`, error);
      // Cache'den filtreleme yap
      return this.logs.filter((log) => log.timestamp.startsWith(date));
    }
  }

  // Satış raporlarını getir
  async getSalesReports(): Promise<DailySalesReport[]> {
    try {
      // Veritabanından en güncel raporları getir
      const dbReports = await DailySalesReportOperations.getAll();
      // Local cache'i güncelle
      this.dailySalesReports = dbReports;
      this.saveSalesReports();
      return [...dbReports];
    } catch (error) {
      console.error("Satış raporları veritabanından alınırken hata:", error);
      return [...this.dailySalesReports];
    }
  }

  // Belirli bir tarihe ait satış raporu getir
  async getSalesReportByDate(
    date: string
  ): Promise<DailySalesReport | undefined> {
    try {
      // Veritabanından belirtilen tarihe ait raporu getir
      const report = await DailySalesReportOperations.getByDate(date);
      return report;
    } catch (error) {
      console.error(`${date} tarihine ait satış raporu alınırken hata:`, error);
      // Cache'den raporu bul
      return this.dailySalesReports.find((report) => report.date === date);
    }
  }

  // Logları LocalStorage'a kaydet
  private saveLogs(): void {
    try {
      localStorage.setItem(this.logsStorageKey, JSON.stringify(this.logs));
    } catch (error) {
      console.error("Loglar kaydedilirken hata oluştu:", error);
    }
  }

  // Satış raporlarını LocalStorage'a kaydet
  private saveSalesReports(): void {
    try {
      localStorage.setItem(
        this.salesReportsStorageKey,
        JSON.stringify(this.dailySalesReports)
      );
    } catch (error) {
      console.error("Satış raporları kaydedilirken hata oluştu:", error);
    }
  }

  // Logları LocalStorage'dan yükle
  private loadLogs(): void {
    try {
      const savedLogs = localStorage.getItem(this.logsStorageKey);
      if (savedLogs) {
        this.logs = JSON.parse(savedLogs);
      }
    } catch (error) {
      console.error("Loglar yüklenirken hata oluştu:", error);
      this.logs = [];
    }
  }

  // Satış raporlarını LocalStorage'dan yükle
  private loadSalesReports(): void {
    try {
      const savedReports = localStorage.getItem(this.salesReportsStorageKey);
      if (savedReports) {
        this.dailySalesReports = JSON.parse(savedReports);
      }
    } catch (error) {
      console.error("Satış raporları yüklenirken hata oluştu:", error);
      this.dailySalesReports = [];
    }
  }

  // Tüm logları temizle
  async clearLogs(): Promise<void> {
    try {
      // Veritabanındaki logları temizle
      await ActivityLogOperations.clear();
      // Local cache'i temizle
      this.logs = [];
      this.saveLogs();
      console.log("Tüm loglar temizlendi");
    } catch (error) {
      console.error("Loglar temizlenirken hata:", error);
    }
  }

  // Tüm satış raporlarını temizle
  async clearSalesReports(): Promise<void> {
    try {
      // Veritabanındaki raporları temizle
      await DailySalesReportOperations.clear();
      // Local cache'i temizle
      this.dailySalesReports = [];
      this.saveSalesReports();
      console.log("Tüm satış raporları temizlendi");
    } catch (error) {
      console.error("Satış raporları temizlenirken hata:", error);
    }
  }
}

// Singleton logger örneği
const logger = new OperationLogger();
export default logger;
