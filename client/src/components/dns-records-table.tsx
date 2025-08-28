import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { DnsRecord } from "@shared/schema";

interface DnsRecordsTableProps {
  records: DnsRecord[];
  onSelectionChange: (recordIds: string[]) => void;
  selectedRecords: string[];
  onStartMigration: () => void;
  migrationConfig: { oldIp: string; newIp: string };
}

export default function DnsRecordsTable({ 
  records, 
  onSelectionChange, 
  selectedRecords,
  onStartMigration,
  migrationConfig
}: DnsRecordsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [recordTypeFilter, setRecordTypeFilter] = useState("all");
  const [filteredRecords, setFilteredRecords] = useState<DnsRecord[]>(records);

  useEffect(() => {
    let filtered = records;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(record => 
        record.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.zoneName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply record type filter
    if (recordTypeFilter !== "all") {
      filtered = filtered.filter(record => record.type === recordTypeFilter);
    }

    setFilteredRecords(filtered);
  }, [records, searchTerm, recordTypeFilter]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(filteredRecords.map(record => record.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleRecordSelect = (recordId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedRecords, recordId]);
    } else {
      onSelectionChange(selectedRecords.filter(id => id !== recordId));
    }
  };

  const isAllSelected = filteredRecords.length > 0 && 
    filteredRecords.every(record => selectedRecords.includes(record.id));

  const getStatusBadge = (record: DnsRecord) => {
    if (record.content === migrationConfig.oldIp) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-green-500 text-white rounded-md">
          Ready
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium bg-gray-500 text-white rounded-md">
        N/A
      </span>
    );
  };

  const getRecordTypeBadge = (type: string) => {
    return (
      <span className="px-2 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-md">
        {type}
      </span>
    );
  };

  if (records.length === 0) {
    return (
      <section>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <i className="fas fa-search text-muted-foreground text-4xl mb-4"></i>
              <h3 className="text-lg font-semibold text-foreground mb-2">No DNS Records Found</h3>
              <p className="text-muted-foreground">
                Scan DNS records first to see available records for migration.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section>
      <Card>
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">DNS Records</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Found <span className="font-medium text-foreground">{filteredRecords.length}</span> DNS records
                {migrationConfig.oldIp && ` matching IP ${migrationConfig.oldIp}`}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search domains..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 w-64"
                  data-testid="input-search-records"
                />
                <i className="fas fa-search absolute left-3 top-2.5 text-muted-foreground"></i>
              </div>
              <Select value={recordTypeFilter} onValueChange={setRecordTypeFilter}>
                <SelectTrigger className="w-48" data-testid="select-record-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Record Types</SelectItem>
                  <SelectItem value="A">A Records</SelectItem>
                  <SelectItem value="AAAA">AAAA Records</SelectItem>
                  <SelectItem value="CNAME">CNAME Records</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="secondary" data-testid="button-export">
                <i className="fas fa-download mr-2"></i>Export
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    data-testid="checkbox-select-all"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Zone / Domain
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Record Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Current Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  TTL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4">
                    <Checkbox
                      checked={selectedRecords.includes(record.id)}
                      onCheckedChange={(checked) => handleRecordSelect(record.id, checked as boolean)}
                      data-testid={`checkbox-record-${record.id}`}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-globe text-primary text-sm"></i>
                      <div>
                        <div className="font-medium text-foreground">{record.zoneName}</div>
                        <div className="text-sm text-muted-foreground">Zone ID: {record.zoneId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-foreground">{record.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    {getRecordTypeBadge(record.type)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-foreground">{record.content}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">{record.ttl}</span>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(record)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button 
                        className="text-primary hover:text-primary/80 text-sm" 
                        title="Edit Record"
                        data-testid={`button-edit-${record.id}`}
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button 
                        className="text-muted-foreground hover:text-foreground text-sm" 
                        title="View Details"
                        data-testid={`button-view-${record.id}`}
                      >
                        <i className="fas fa-eye"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{selectedRecords.length}</span> of{" "}
                <span>{filteredRecords.length}</span> records selected
              </span>
              <div className="h-4 w-px bg-border"></div>
              <Button
                onClick={onStartMigration}
                disabled={selectedRecords.length === 0 || !migrationConfig.oldIp || !migrationConfig.newIp}
                data-testid="button-bulk-update"
              >
                <i className="fas fa-sync-alt mr-2"></i>
                Update Selected Records
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}
