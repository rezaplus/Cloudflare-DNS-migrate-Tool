// Cloudflare API types and utilities
export interface CloudflareConfig {
  email: string;
  apiKey: string;
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

export interface CloudflareResponse<T> {
  success: boolean;
  errors: Array<{
    code: number;
    message: string;
  }>;
  messages: string[];
  result: T;
}

export class CloudflareApiError extends Error {
  constructor(message: string, public errors?: any[]) {
    super(message);
    this.name = 'CloudflareApiError';
  }
}

// Validation utilities
export const validateIpAddress = (ip: string): boolean => {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// DNS record type validation
export const DNS_RECORD_TYPES = [
  'A', 'AAAA', 'CNAME', 'MX', 'NS', 'PTR', 'SOA', 'SRV', 'TXT', 'CAA'
] as const;

export type DnsRecordType = typeof DNS_RECORD_TYPES[number];

export const isDnsRecordType = (type: string): type is DnsRecordType => {
  return DNS_RECORD_TYPES.includes(type as DnsRecordType);
};

// Utility functions for DNS management
export const formatDnsRecordForDisplay = (record: CloudflareDnsRecord) => {
  return {
    id: record.id,
    zone: record.zone_name,
    name: record.name,
    type: record.type,
    content: record.content,
    ttl: record.ttl === 1 ? 'Auto' : record.ttl.toString(),
    proxied: record.proxied,
    status: record.locked ? 'Locked' : 'Active'
  };
};

export const groupRecordsByZone = (records: CloudflareDnsRecord[]) => {
  const grouped: { [zoneId: string]: CloudflareDnsRecord[] } = {};
  
  records.forEach(record => {
    if (!grouped[record.zone_id]) {
      grouped[record.zone_id] = [];
    }
    grouped[record.zone_id].push(record);
  });
  
  return grouped;
};

// Export functions for downloading data
export const exportRecordsAsJson = (records: CloudflareDnsRecord[], filename?: string) => {
  const data = JSON.stringify(records, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `dns-records-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

export const exportRecordsAsCsv = (records: CloudflareDnsRecord[], filename?: string) => {
  const headers = ['Zone Name', 'Record Name', 'Type', 'Content', 'TTL', 'Proxied'];
  const csvContent = [
    headers.join(','),
    ...records.map(record => [
      record.zone_name,
      record.name,
      record.type,
      record.content,
      record.ttl.toString(),
      record.proxied.toString()
    ].join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `dns-records-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};
