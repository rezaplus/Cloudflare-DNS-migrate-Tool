import { pgTable, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const apiConfigurations = pgTable("api_configurations", {
  id: varchar("id").primaryKey().default("default"),
  email: text("email").notNull(),
  apiKey: text("api_key").notNull(),
  isConnected: boolean("is_connected").default(false),
  lastConnected: timestamp("last_connected"),
});

export const zones = pgTable("zones", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull(),
  accountId: text("account_id"),
});

export const dnsRecords = pgTable("dns_records", {
  id: varchar("id").primaryKey(),
  zoneId: text("zone_id").notNull(),
  zoneName: text("zone_name").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  content: text("content").notNull(),
  ttl: integer("ttl").notNull(),
  proxied: boolean("proxied").default(false),
  locked: boolean("locked").default(false),
});

export const migrationJobs = pgTable("migration_jobs", {
  id: varchar("id").primaryKey(),
  oldIp: text("old_ip").notNull(),
  newIp: text("new_ip").notNull(),
  totalRecords: integer("total_records").notNull(),
  completedRecords: integer("completed_records").default(0),
  failedRecords: integer("failed_records").default(0),
  status: text("status").notNull(), // 'pending', 'running', 'completed', 'failed'
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const migrationRecordStatus = pgTable("migration_record_status", {
  id: varchar("id").primaryKey(),
  jobId: text("job_id").notNull(),
  recordId: text("record_id").notNull(),
  status: text("status").notNull(), // 'pending', 'processing', 'completed', 'failed'
  errorMessage: text("error_message"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const backups = pgTable("backups", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  recordCount: integer("record_count").notNull(),
  data: text("data").notNull(), // JSON string
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertApiConfigurationSchema = createInsertSchema(apiConfigurations).pick({
  email: true,
  apiKey: true,
});

export const insertMigrationJobSchema = createInsertSchema(migrationJobs).pick({
  oldIp: true,
  newIp: true,
  totalRecords: true,
});

export const insertBackupSchema = createInsertSchema(backups).pick({
  name: true,
  recordCount: true,
  data: true,
});

// Types
export type ApiConfiguration = typeof apiConfigurations.$inferSelect;
export type InsertApiConfiguration = z.infer<typeof insertApiConfigurationSchema>;

export type Zone = typeof zones.$inferSelect;
export type DnsRecord = typeof dnsRecords.$inferSelect;

export type MigrationJob = typeof migrationJobs.$inferSelect;
export type InsertMigrationJob = z.infer<typeof insertMigrationJobSchema>;

export type MigrationRecordStatus = typeof migrationRecordStatus.$inferSelect;

export type Backup = typeof backups.$inferSelect;
export type InsertBackup = z.infer<typeof insertBackupSchema>;

// Extended types for API responses
export interface CloudflareResponse<T> {
  success: boolean;
  errors: Array<{
    code: number;
    message: string;
  }>;
  messages: string[];
  result: T;
}

export interface CloudflareZone {
  id: string;
  name: string;
  status: string;
  account: {
    id: string;
    name: string;
  };
}

export interface CloudflareDnsRecord {
  id: string;
  zone_id: string;
  zone_name: string;
  name: string;
  type: string;
  content: string;
  ttl: number;
  proxied: boolean;
  locked: boolean;
}

export interface MigrationProgress {
  jobId: string;
  totalRecords: number;
  completedRecords: number;
  failedRecords: number;
  processingRecords: number;
  status: string;
  progressPercentage: number;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}
