import { 
  type ApiConfiguration, 
  type InsertApiConfiguration,
  type Zone,
  type DnsRecord,
  type MigrationJob,
  type InsertMigrationJob,
  type MigrationRecordStatus,
  type Backup,
  type InsertBackup,
  type MigrationProgress,
  type ActivityLogEntry
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // API Configuration
  getApiConfiguration(): Promise<ApiConfiguration | undefined>;
  saveApiConfiguration(config: InsertApiConfiguration): Promise<ApiConfiguration>;
  updateConnectionStatus(isConnected: boolean): Promise<void>;

  // Zones
  saveZones(zones: Zone[]): Promise<void>;
  getZones(): Promise<Zone[]>;

  // DNS Records
  saveDnsRecords(records: DnsRecord[]): Promise<void>;
  getDnsRecords(): Promise<DnsRecord[]>;
  getDnsRecordsByIp(ip: string): Promise<DnsRecord[]>;
  clearDnsRecords(): Promise<void>;

  // Migration Jobs
  createMigrationJob(job: InsertMigrationJob): Promise<MigrationJob>;
  getMigrationJob(jobId: string): Promise<MigrationJob | undefined>;
  updateMigrationJobProgress(jobId: string, completed: number, failed: number): Promise<void>;
  updateMigrationJobStatus(jobId: string, status: string): Promise<void>;

  // Migration Record Status
  saveMigrationRecordStatus(statuses: MigrationRecordStatus[]): Promise<void>;
  getMigrationRecordStatuses(jobId: string): Promise<MigrationRecordStatus[]>;
  updateMigrationRecordStatus(recordId: string, status: string, errorMessage?: string): Promise<void>;

  // Backups
  createBackup(backup: InsertBackup): Promise<Backup>;
  getBackups(): Promise<Backup[]>;
  getBackup(backupId: string): Promise<Backup | undefined>;

  // Activity Log
  addActivityLogEntry(entry: Omit<ActivityLogEntry, 'id'>): Promise<ActivityLogEntry>;
  getActivityLog(limit?: number): Promise<ActivityLogEntry[]>;
  clearActivityLog(): Promise<void>;
}

export class MemStorage implements IStorage {
  private apiConfiguration: ApiConfiguration | undefined;
  private zones: Map<string, Zone> = new Map();
  private dnsRecords: Map<string, DnsRecord> = new Map();
  private migrationJobs: Map<string, MigrationJob> = new Map();
  private migrationRecordStatuses: Map<string, MigrationRecordStatus> = new Map();
  private backups: Map<string, Backup> = new Map();
  private activityLog: ActivityLogEntry[] = [];

  // API Configuration
  async getApiConfiguration(): Promise<ApiConfiguration | undefined> {
    return this.apiConfiguration;
  }

  async saveApiConfiguration(config: InsertApiConfiguration): Promise<ApiConfiguration> {
    const apiConfig: ApiConfiguration = {
      id: "default",
      ...config,
      isConnected: false,
      lastConnected: null,
    };
    this.apiConfiguration = apiConfig;
    return apiConfig;
  }

  async updateConnectionStatus(isConnected: boolean): Promise<void> {
    if (this.apiConfiguration) {
      this.apiConfiguration.isConnected = isConnected;
      this.apiConfiguration.lastConnected = isConnected ? new Date() : null;
    }
  }

  // Zones
  async saveZones(zones: Zone[]): Promise<void> {
    this.zones.clear();
    zones.forEach(zone => {
      this.zones.set(zone.id, zone);
    });
  }

  async getZones(): Promise<Zone[]> {
    return Array.from(this.zones.values());
  }

  // DNS Records
  async saveDnsRecords(records: DnsRecord[]): Promise<void> {
    this.dnsRecords.clear();
    records.forEach(record => {
      this.dnsRecords.set(record.id, record);
    });
  }

  async getDnsRecords(): Promise<DnsRecord[]> {
    return Array.from(this.dnsRecords.values());
  }

  async getDnsRecordsByIp(ip: string): Promise<DnsRecord[]> {
    return Array.from(this.dnsRecords.values()).filter(record => 
      record.content === ip
    );
  }

  async clearDnsRecords(): Promise<void> {
    this.dnsRecords.clear();
  }

  // Migration Jobs
  async createMigrationJob(job: InsertMigrationJob): Promise<MigrationJob> {
    const migrationJob: MigrationJob = {
      id: randomUUID(),
      ...job,
      completedRecords: 0,
      failedRecords: 0,
      status: "pending",
      createdAt: new Date(),
      completedAt: null,
    };
    this.migrationJobs.set(migrationJob.id, migrationJob);
    return migrationJob;
  }

  async getMigrationJob(jobId: string): Promise<MigrationJob | undefined> {
    return this.migrationJobs.get(jobId);
  }

  async updateMigrationJobProgress(jobId: string, completed: number, failed: number): Promise<void> {
    const job = this.migrationJobs.get(jobId);
    if (job) {
      job.completedRecords = completed;
      job.failedRecords = failed;
    }
  }

  async updateMigrationJobStatus(jobId: string, status: string): Promise<void> {
    const job = this.migrationJobs.get(jobId);
    if (job) {
      job.status = status;
      if (status === "completed" || status === "failed") {
        job.completedAt = new Date();
      }
    }
  }

  // Migration Record Status
  async saveMigrationRecordStatus(statuses: MigrationRecordStatus[]): Promise<void> {
    statuses.forEach(status => {
      this.migrationRecordStatuses.set(status.id, status);
    });
  }

  async getMigrationRecordStatuses(jobId: string): Promise<MigrationRecordStatus[]> {
    return Array.from(this.migrationRecordStatuses.values()).filter(status => status.jobId === jobId);
  }

  async updateMigrationRecordStatus(recordId: string, status: string, errorMessage?: string): Promise<void> {
    const recordStatus = this.migrationRecordStatuses.get(recordId);
    if (recordStatus) {
      recordStatus.status = status;
      recordStatus.errorMessage = errorMessage || null;
      recordStatus.updatedAt = new Date();
    }
  }

  // Backups
  async createBackup(backup: InsertBackup): Promise<Backup> {
    const newBackup: Backup = {
      id: randomUUID(),
      ...backup,
      createdAt: new Date(),
    };
    this.backups.set(newBackup.id, newBackup);
    return newBackup;
  }

  async getBackups(): Promise<Backup[]> {
    return Array.from(this.backups.values()).sort((a, b) => 
      b.createdAt!.getTime() - a.createdAt!.getTime()
    );
  }

  async getBackup(backupId: string): Promise<Backup | undefined> {
    return this.backups.get(backupId);
  }

  // Activity Log
  async addActivityLogEntry(entry: Omit<ActivityLogEntry, 'id'>): Promise<ActivityLogEntry> {
    const logEntry: ActivityLogEntry = {
      id: randomUUID(),
      ...entry,
    };
    this.activityLog.unshift(logEntry);
    // Keep only the last 100 entries
    if (this.activityLog.length > 100) {
      this.activityLog = this.activityLog.slice(0, 100);
    }
    return logEntry;
  }

  async getActivityLog(limit: number = 50): Promise<ActivityLogEntry[]> {
    return this.activityLog.slice(0, limit);
  }

  async clearActivityLog(): Promise<void> {
    this.activityLog = [];
  }
}

export const storage = new MemStorage();
