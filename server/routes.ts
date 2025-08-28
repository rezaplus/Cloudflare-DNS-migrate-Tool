import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertApiConfigurationSchema, insertMigrationJobSchema, insertBackupSchema } from "@shared/schema";
import { z } from "zod";
import { promisify } from "util";
import * as dns from "dns";

const dnsLookup = promisify(dns.lookup);

// Cloudflare API client
class CloudflareAPI {
  private email: string;
  private apiKey: string;
  private baseUrl = "https://api.cloudflare.com/client/v4";

  constructor(email: string, apiKey: string) {
    this.email = email;
    this.apiKey = apiKey;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "X-Auth-Email": this.email,
        "X-Auth-Key": this.apiKey,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Cloudflare API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async testConnection() {
    // For Global API Key authentication, we use /user endpoint to verify
    return this.request("/user");
  }

  async getZones() {
    let allZones = [];
    let page = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      const response: any = await this.request(`/zones?page=${page}&per_page=50`);
      allZones.push(...response.result);
      
      hasMorePages = response.result_info?.total_pages > page;
      page++;
    }

    return { result: allZones };
  }

  async getDnsRecords(zoneId: string) {
    let allRecords = [];
    let page = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      const response: any = await this.request(`/zones/${zoneId}/dns_records?page=${page}&per_page=100`);
      allRecords.push(...response.result);
      
      hasMorePages = response.result_info?.total_pages > page;
      page++;
    }

    return { result: allRecords };
  }

  async updateDnsRecord(zoneId: string, recordId: string, data: any) {
    return this.request(`/zones/${zoneId}/dns_records/${recordId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // API Configuration endpoints
  app.post("/api/config", async (req, res) => {
    try {
      const config = insertApiConfigurationSchema.parse(req.body);
      const savedConfig = await storage.saveApiConfiguration(config);
      res.json(savedConfig);
    } catch (error: any) {
      res.status(400).json({ message: "Invalid configuration data", error: error?.message || 'Unknown error' });
    }
  });

  app.get("/api/config", async (req, res) => {
    try {
      const config = await storage.getApiConfiguration();
      if (!config) {
        return res.status(404).json({ message: "Configuration not found" });
      }
      // Don't return the actual API key for security
      const { apiKey, ...safeConfig } = config;
      res.json({ ...safeConfig, hasApiKey: Boolean(apiKey) });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get configuration", error: error?.message || 'Unknown error' });
    }
  });

  app.post("/api/config/test", async (req, res) => {
    try {
      const config = await storage.getApiConfiguration();
      if (!config) {
        return res.status(400).json({ message: "No configuration found" });
      }

      console.log('Testing connection with email:', config.email);
      const cfApi = new CloudflareAPI(config.email, config.apiKey);
      const result = await cfApi.testConnection();
      
      await storage.updateConnectionStatus(true);
      res.json({ success: true, result });
    } catch (error: any) {
      console.error('Connection test failed:', error?.message || error);
      await storage.updateConnectionStatus(false);
      res.status(400).json({ message: "Connection failed", error: error?.message || 'Unknown error' });
    }
  });

  // DNS scanning endpoints
  app.post("/api/dns/scan", async (req, res) => {
    try {
      const config = await storage.getApiConfiguration();
      if (!config) {
        return res.status(400).json({ message: "No configuration found" });
      }

      const cfApi = new CloudflareAPI(config.email, config.apiKey);
      
      // Get all zones
      const zonesResponse: any = await cfApi.getZones();
      const zones = zonesResponse.result.map((zone: any) => ({
        id: zone.id,
        name: zone.name,
        status: zone.status,
        accountId: zone.account?.id,
      }));

      await storage.saveZones(zones);

      // Get DNS records for all zones
      const allDnsRecords = [];
      for (const zone of zones) {
        try {
          const recordsResponse: any = await cfApi.getDnsRecords(zone.id);
          const records = recordsResponse.result.map((record: any) => ({
            id: record.id,
            zoneId: zone.id, // Use the zone.id from our loop to ensure it's set
            zoneName: zone.name, // Use the zone.name from our loop to ensure it's set
            name: record.name,
            type: record.type,
            content: record.content,
            ttl: record.ttl,
            proxied: record.proxied || false,
            locked: record.locked || false,
          }));
          allDnsRecords.push(...records);
        } catch (error: any) {
          console.error(`Failed to get DNS records for zone ${zone.name}:`, error);
        }
      }

      await storage.saveDnsRecords(allDnsRecords);
      await storage.addActivityLogEntry({
        timestamp: new Date(),
        type: 'success',
        message: `Scanned ${allDnsRecords.length} DNS records from ${zones.length} zones`,
      });

      res.json({ 
        success: true, 
        zones: zones.length, 
        records: allDnsRecords.length 
      });
    } catch (error: any) {
      await storage.addActivityLogEntry({
        timestamp: new Date(),
        type: 'error',
        message: `DNS scan failed: ${error?.message || 'Unknown error'}`,
      });
      res.status(500).json({ message: "DNS scan failed", error: error?.message || 'Unknown error' });
    }
  });

  app.get("/api/dns/records", async (req, res) => {
    try {
      const { ip } = req.query;
      let records;
      
      if (ip && typeof ip === 'string') {
        records = await storage.getDnsRecordsByIp(ip);
      } else {
        records = await storage.getDnsRecords();
      }
      
      res.json(records);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get DNS records", error: error?.message || 'Unknown error' });
    }
  });

  // Migration endpoints
  app.post("/api/migration/start", async (req, res) => {
    try {
      const { oldIp, newIp, recordIds } = req.body;
      
      if (!oldIp || !newIp || !Array.isArray(recordIds) || recordIds.length === 0) {
        return res.status(400).json({ message: "Missing required parameters" });
      }

      const job = await storage.createMigrationJob({
        oldIp,
        newIp,
        totalRecords: recordIds.length,
      });

      // Initialize record statuses
      const recordStatuses = recordIds.map((recordId: string) => ({
        id: `${job.id}-${recordId}`,
        jobId: job.id,
        recordId,
        status: 'pending',
        errorMessage: null,
        updatedAt: new Date(),
      }));
      
      await storage.saveMigrationRecordStatus(recordStatuses);

      await storage.addActivityLogEntry({
        timestamp: new Date(),
        type: 'info',
        message: `Starting migration for ${recordIds.length} DNS records`,
        details: `${oldIp} → ${newIp}`,
      });

      // Start migration process asynchronously
      processMigration(job.id, recordIds, oldIp, newIp);

      res.json({ jobId: job.id });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to start migration", error: error?.message || 'Unknown error' });
    }
  });

  app.get("/api/migration/:jobId/progress", async (req, res) => {
    try {
      const { jobId } = req.params;
      const job = await storage.getMigrationJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Migration job not found" });
      }

      const processingRecords = job.totalRecords - (job.completedRecords || 0) - (job.failedRecords || 0);
      const progressPercentage = Math.round(
        (((job.completedRecords || 0) + (job.failedRecords || 0)) / job.totalRecords) * 100
      );

      const progress = {
        jobId: job.id,
        totalRecords: job.totalRecords,
        completedRecords: job.completedRecords || 0,
        failedRecords: job.failedRecords || 0,
        processingRecords,
        status: job.status,
        progressPercentage,
      };

      res.json(progress);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get migration progress", error: error?.message || 'Unknown error' });
    }
  });

  // Test all domains - manual domain health check
  app.post("/api/domains/test", async (req, res) => {
    try {
      const records = await storage.getDnsRecords();
      
      // Get unique domain names from DNS records (A and AAAA records only)
      const uniqueDomains = Array.from(new Set(
        records
          .filter(record => record.type === 'A' || record.type === 'AAAA')
          .map(record => record.name)
          .filter(name => name) // Remove null/empty names
      ));

      if (uniqueDomains.length === 0) {
        return res.status(400).json({ 
          message: "No domains found to test", 
          error: "Please scan DNS records first" 
        });
      }

      console.log(`Testing ${uniqueDomains.length} domains...`);

      // Test domains in parallel (but limit concurrency to avoid overwhelming)
      const batchSize = 10;
      const results = [];
      
      for (let i = 0; i < uniqueDomains.length; i += batchSize) {
        const batch = uniqueDomains.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(domain => testDomain(domain))
        );
        results.push(...batchResults);
      }

      // Log activity
      await storage.addActivityLogEntry({
        timestamp: new Date(),
        type: 'info',
        message: `Tested ${results.length} domains`,
        details: `${results.filter(r => r.status === 200).length} returned 200 status`
      });

      res.json({
        success: true,
        totalDomains: results.length,
        results: results.sort((a, b) => a.domain.localeCompare(b.domain))
      });

    } catch (error: any) {
      console.error("Domain test failed:", error);
      
      await storage.addActivityLogEntry({
        timestamp: new Date(),
        type: 'error',
        message: `Domain test failed: ${error.message}`
      });

      res.status(500).json({ 
        message: "Domain test failed", 
        error: error.message 
      });
    }
  });

  // Activity log endpoint
  app.get("/api/activity", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const log = await storage.getActivityLog(limit);
      res.json(log);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get activity log", error: error?.message || 'Unknown error' });
    }
  });

  app.delete("/api/activity", async (req, res) => {
    try {
      await storage.clearActivityLog();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to clear activity log", error: error?.message || 'Unknown error' });
    }
  });

  // Backup endpoints
  app.post("/api/backup", async (req, res) => {
    try {
      const { name, recordIds } = req.body;
      
      let records;
      if (recordIds && Array.isArray(recordIds)) {
        const allRecords = await storage.getDnsRecords();
        records = allRecords.filter(record => recordIds.includes(record.id));
      } else {
        records = await storage.getDnsRecords();
      }

      const backup = await storage.createBackup({
        name: name || `dns-backup-${new Date().toISOString().split('T')[0]}`,
        recordCount: records.length,
        data: JSON.stringify(records),
      });

      await storage.addActivityLogEntry({
        timestamp: new Date(),
        type: 'success',
        message: `Created backup with ${records.length} DNS records`,
        details: backup.name,
      });

      res.json(backup);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to create backup", error: error?.message || 'Unknown error' });
    }
  });

  app.get("/api/backups", async (req, res) => {
    try {
      const backups = await storage.getBackups();
      res.json(backups);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get backups", error: error?.message || 'Unknown error' });
    }
  });

  app.get("/api/backup/:backupId", async (req, res) => {
    try {
      const { backupId } = req.params;
      const backup = await storage.getBackup(backupId);
      
      if (!backup) {
        return res.status(404).json({ message: "Backup not found" });
      }

      res.json(backup);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get backup", error: error?.message || 'Unknown error' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Async function to process migration
async function processMigration(jobId: string, recordIds: string[], oldIp: string, newIp: string) {
  try {
    const config = await storage.getApiConfiguration();
    if (!config) {
      throw new Error("No API configuration found");
    }

    const cfApi = new CloudflareAPI(config.email, config.apiKey);
    await storage.updateMigrationJobStatus(jobId, "running");

    let completed = 0;
    let failed = 0;

    for (const recordId of recordIds) {
      try {
        // Update status to processing
        await storage.updateMigrationRecordStatus(`${jobId}-${recordId}`, "processing");

        // Get the record details
        const allRecords = await storage.getDnsRecords();
        const record = allRecords.find(r => r.id === recordId);

        if (!record) {
          throw new Error("Record not found");
        }

        // Update the DNS record
        await cfApi.updateDnsRecord(record.zoneId, record.id, {
          type: record.type,
          name: record.name,
          content: newIp,
          ttl: record.ttl,
          proxied: record.proxied,
        });

        // Update local storage
        record.content = newIp;
        await storage.saveDnsRecords(allRecords);

        // Update status to completed
        await storage.updateMigrationRecordStatus(`${jobId}-${recordId}`, "completed");
        completed++;

        await storage.addActivityLogEntry({
          timestamp: new Date(),
          type: 'success',
          message: `Updated DNS record for ${record.name}`,
          details: `${oldIp} → ${newIp}`,
        });

      } catch (error: any) {
        await storage.updateMigrationRecordStatus(`${jobId}-${recordId}`, "failed", error?.message || 'Unknown error');
        failed++;

        await storage.addActivityLogEntry({
          timestamp: new Date(),
          type: 'error',
          message: `Failed to update DNS record: ${error?.message || 'Unknown error'}`,
        });
      }

      // Update job progress
      await storage.updateMigrationJobProgress(jobId, completed, failed);
    }

    // Mark job as completed
    await storage.updateMigrationJobStatus(jobId, "completed");

    await storage.addActivityLogEntry({
      timestamp: new Date(),
      type: 'success',
      message: `Migration completed: ${completed} success, ${failed} failed`,
    });

  } catch (error: any) {
    await storage.updateMigrationJobStatus(jobId, "failed");
    
    await storage.addActivityLogEntry({
      timestamp: new Date(),
      type: 'error',
      message: `Migration failed: ${error?.message || 'Unknown error'}`,
    });
  }
}

async function testDomain(domain: string): Promise<{domain: string, status: number | null, currentIp: string | null, error?: string}> {
  const result = {
    domain,
    status: null as number | null,
    currentIp: null as string | null,
    error: undefined as string | undefined
  };

  try {
    // Get current IP via DNS lookup
    try {
      const dnsResult = await dnsLookup(domain);
      result.currentIp = dnsResult.address;
    } catch (dnsError: any) {
      // DNS lookup failed - domain might not exist or have A record
    }

    // Test HTTP status (try both HTTP and HTTPS)
    let testUrl = `http://${domain}`;
    try {
      const httpResponse = await fetch(testUrl, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      result.status = httpResponse.status;
    } catch (httpError) {
      // Try HTTPS if HTTP fails
      try {
        testUrl = `https://${domain}`;
        const httpsResponse = await fetch(testUrl, { 
          method: 'HEAD',
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        result.status = httpsResponse.status;
      } catch (httpsError: any) {
        result.error = `HTTP/HTTPS test failed: ${httpsError.message}`;
      }
    }

  } catch (error: any) {
    result.error = error.message;
  }

  return result;
}
