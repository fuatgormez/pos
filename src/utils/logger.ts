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
import { saveAs } from "file-saver";

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

// Dosya bazlı log yöneticisi
class FileLogManager {
  private logFolder: string = "logs";
  private logsByDate: { [date: string]: any } = {};
  private logsStorageFolderKey: string = "pos_logs_folder";

  constructor() {
    this.loadLogsFolder();
  }

  // Log kayıt yapısını oluştur
  private createLogFolderStructure(
    date: string,
    tableId?: string,
    orderId?: string
  ): any {
    if (!this.logsByDate[date]) {
      this.logsByDate[date] = { tables: {}, orders: {} };
    }

    if (tableId && !this.logsByDate[date].tables[tableId]) {
      this.logsByDate[date].tables[tableId] = [];
    }

    if (orderId && !this.logsByDate[date].orders[orderId]) {
      this.logsByDate[date].orders[orderId] = [];
    }

    return this.logsByDate[date];
  }

  // Log ekle
  addLog(logEntry: ActivityLog): void {
    const date = new Date(logEntry.timestamp).toISOString().split("T")[0];
    const folderStructure = this.createLogFolderStructure(
      date,
      logEntry.tableId,
      logEntry.orderId
    );

    // Tarih bazlı log ekleme
    if (!folderStructure.allLogs) {
      folderStructure.allLogs = [];
    }
    folderStructure.allLogs.push(logEntry);

    // Masa bazlı log ekleme
    if (logEntry.tableId) {
      folderStructure.tables[logEntry.tableId].push(logEntry);
    }

    // Sipariş bazlı log ekleme
    if (logEntry.orderId) {
      folderStructure.orders[logEntry.orderId].push(logEntry);
    }

    // Tüm log yapısını kaydet
    this.saveLogsFolder();
  }

  // Belirli bir tarihe ait logları getir
  getLogsByDate(date: string): ActivityLog[] {
    console.log(`getLogsByDate çağrıldı, tarih: ${date}`);
    console.log("Mevcut log yapısı:", this.logsByDate);

    if (!this.logsByDate[date] || !this.logsByDate[date].allLogs) {
      console.log(`${date} tarihinde log bulunamadı`);
      return [];
    }

    return this.logsByDate[date].allLogs || [];
  }

  // Belirli bir masaya ait logları getir
  getLogsByTable(date: string, tableId: string): ActivityLog[] {
    console.log(`getLogsByTable çağrıldı, tarih: ${date}, masa: ${tableId}`);

    if (
      !this.logsByDate[date] ||
      !this.logsByDate[date].tables ||
      !this.logsByDate[date].tables[tableId]
    ) {
      console.log(`${date} tarihinde ${tableId} masasına ait log bulunamadı`);
      return [];
    }

    return this.logsByDate[date].tables[tableId] || [];
  }

  // Belirli bir siparişe ait logları getir
  getLogsByOrder(date: string, orderId: string): ActivityLog[] {
    console.log(`getLogsByOrder çağrıldı, tarih: ${date}, sipariş: ${orderId}`);

    if (
      !this.logsByDate[date] ||
      !this.logsByDate[date].orders ||
      !this.logsByDate[date].orders[orderId]
    ) {
      console.log(`${date} tarihinde ${orderId} siparişine ait log bulunamadı`);
      return [];
    }

    return this.logsByDate[date].orders[orderId] || [];
  }

  // Log dosyalarını dışa aktar
  exportLogs(date?: string): void {
    let logsToExport;
    let fileName;

    if (date) {
      logsToExport = this.logsByDate[date] || {};
      fileName = `pos_logs_${date}.json`;
    } else {
      logsToExport = this.logsByDate;
      fileName = `pos_logs_all.json`;
    }

    const logJson = JSON.stringify(logsToExport, null, 2);
    const blob = new Blob([logJson], { type: "application/json" });
    saveAs(blob, fileName);
  }

  // Log yapısını localStorage'a kaydet
  private saveLogsFolder(): void {
    try {
      localStorage.setItem(
        this.logsStorageFolderKey,
        JSON.stringify(this.logsByDate)
      );
    } catch (error) {
      console.error("Log dosya yapısı kaydedilirken hata:", error);
    }
  }

  // Log yapısını localStorage'dan yükle
  private loadLogsFolder(): void {
    try {
      const savedLogs = localStorage.getItem(this.logsStorageFolderKey);
      if (savedLogs) {
        this.logsByDate = JSON.parse(savedLogs);
      }
    } catch (error) {
      console.error("Log dosya yapısı yüklenirken hata:", error);
      this.logsByDate = {};
    }
  }

  // Log yapısını temizle
  clearLogs(date?: string): void {
    try {
      if (date) {
        delete this.logsByDate[date];
      } else {
        this.logsByDate = {};
      }
      this.saveLogsFolder();
      console.log("Dosya log yapısı temizlendi");
    } catch (error) {
      console.error("Dosya log yapısı temizlenirken hata:", error);
    }
  }
}

// İşlem günlüğü için gelişmiş logger
class OperationLogger {
  private logs: ActivityLog[] = [];
  private dailySalesReports: DailySalesReport[] = [];
  private maxLogs: number = 1000;
  private logsStorageKey: string = "pos_operation_logs";
  private salesReportsStorageKey: string = "pos_daily_sales";
  private fileLogManager: FileLogManager = new FileLogManager();

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

    // Dosya log yapısına ekle
    try {
      this.fileLogManager.addLog(logEntry);
      console.log("Dosya log yapısına eklendi:", logEntry);
    } catch (error) {
      console.error("Dosya log yapısına eklenirken hata:", error);
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

  // Dosya loglarını tarih bazlı dışa aktar
  exportLogsByDate(date: string): void {
    try {
      this.fileLogManager.exportLogs(date);
      console.log(`${date} tarihine ait loglar dışa aktarıldı`);
    } catch (error) {
      console.error("Loglar dışa aktarılırken hata:", error);
    }
  }

  // Tüm dosya loglarını dışa aktar
  exportAllLogs(): void {
    try {
      this.fileLogManager.exportLogs();
      console.log("Tüm loglar dışa aktarıldı");
    } catch (error) {
      console.error("Tüm loglar dışa aktarılırken hata:", error);
    }
  }

  // Dosya loglarını tarih ve masa ID'sine göre getir
  getFileLogsByTable(date: string, tableId: string): ActivityLog[] {
    try {
      const logs = this.fileLogManager.getLogsByTable(date, tableId);
      console.log(
        `${date} tarihli ve ${tableId} masasına ait loglar yüklendi:`,
        logs.length
      );
      return logs;
    } catch (error) {
      console.error(
        `${date} tarihli ve ${tableId} masasına ait loglar yüklenirken hata:`,
        error
      );
      return [];
    }
  }

  // Dosya loglarını tarih ve sipariş ID'sine göre getir
  getFileLogsByOrder(date: string, orderId: string): ActivityLog[] {
    try {
      const logs = this.fileLogManager.getLogsByOrder(date, orderId);
      console.log(
        `${date} tarihli ve ${orderId} siparişine ait loglar yüklendi:`,
        logs.length
      );
      return logs;
    } catch (error) {
      console.error(
        `${date} tarihli ve ${orderId} siparişine ait loglar yüklenirken hata:`,
        error
      );
      return [];
    }
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
      // Veritabanından belirtilen tarihteki logları getir
      let filteredLogs: ActivityLog[] = [];

      try {
        // Önce veritabanından
        const dbLogs = await ActivityLogOperations.getByDate(date);
        filteredLogs = dbLogs;
      } catch (dbError) {
        console.error("Veritabanından loglar alınırken hata:", dbError);

        // Veritabanından alınamazsa, yerel cache'ten tarihe göre filtrele
        filteredLogs = this.logs.filter((log) => {
          const logDate = new Date(log.timestamp).toISOString().split("T")[0];
          return logDate === date;
        });
      }

      // Dosya log yapısından da yükle
      try {
        const fileLogs = this.fileLogManager.getLogsByDate(date);
        console.log(`${date} tarihindeki dosya logları:`, fileLogs.length);

        // Eğer dosya log yapısında log varsa, onları da ekle (duplicate'leri önlemek için ID kontrolü yap)
        if (fileLogs && fileLogs.length > 0) {
          const existingIds = new Set(filteredLogs.map((log) => log.id));

          for (const fileLog of fileLogs) {
            if (!existingIds.has(fileLog.id)) {
              filteredLogs.push(fileLog);
              existingIds.add(fileLog.id);
            }
          }
        }
      } catch (fileError) {
        console.error("Dosya logları alınırken hata:", fileError);
      }

      console.log(`${date} tarihindeki toplam loglar:`, filteredLogs.length);
      return filteredLogs;
    } catch (error) {
      console.error("Loglar tarih bazlı alınırken genel hata:", error);
      return [];
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

// Logger örneği oluştur
const logger = new OperationLogger();
console.log("Logger örneği başarıyla oluşturuldu");

// Dışa aktar
export default logger;
