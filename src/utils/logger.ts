// İşlem günlüğü için basit bir logger
class OperationLogger {
  private logs: Array<{
    timestamp: string;
    operation: string;
    details: any;
  }> = [];
  private maxLogs: number = 100;
  private storageKey: string = "pos_operation_logs";

  constructor() {
    // LocalStorage'dan mevcut logları yükle
    this.loadLogs();
  }

  // Log ekle
  log(operation: string, details: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      operation,
      details,
    };

    this.logs.push(logEntry);
    console.log(`[LOG] ${operation}:`, details);

    // Maksimum log sayısını kontrol et
    if (this.logs.length > this.maxLogs) {
      // En eski logu sil
      this.logs.shift();
    }

    // Logları kaydet
    this.saveLogs();
  }

  // Tüm logları getir
  getLogs(): Array<any> {
    return [...this.logs];
  }

  // Logları LocalStorage'a kaydet
  private saveLogs(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.logs));
    } catch (error) {
      console.error("Loglar kaydedilirken hata oluştu:", error);
    }
  }

  // Logları LocalStorage'dan yükle
  private loadLogs(): void {
    try {
      const savedLogs = localStorage.getItem(this.storageKey);
      if (savedLogs) {
        this.logs = JSON.parse(savedLogs);
      }
    } catch (error) {
      console.error("Loglar yüklenirken hata oluştu:", error);
      this.logs = [];
    }
  }

  // Tüm logları temizle
  clearLogs(): void {
    this.logs = [];
    this.saveLogs();
    console.log("Tüm loglar temizlendi");
  }
}

// Singleton logger örneği
const logger = new OperationLogger();
export default logger;
