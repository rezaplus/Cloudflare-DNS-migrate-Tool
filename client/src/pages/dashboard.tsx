import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import ApiConfiguration from "@/components/api-configuration";
import MigrationConfig from "@/components/migration-config";
import DnsRecordsTable from "@/components/dns-records-table";
import MigrationStatus from "@/components/migration-status";
import BackupRestore from "@/components/backup-restore";
import ConfirmationModal from "@/components/confirmation-modal";
import type { DnsRecord } from "@shared/schema";

export default function Dashboard() {
  const [isConnected, setIsConnected] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [currentMigrationJob, setCurrentMigrationJob] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [migrationConfig, setMigrationConfig] = useState({
    oldIp: "",
    newIp: ""
  });

  // Query for API configuration status
  const { data: configData } = useQuery({
    queryKey: ["/api/config"],
    enabled: true,
  });

  // Query for DNS records
  const { data: dnsRecords = [], refetch: refetchRecords } = useQuery<DnsRecord[]>({
    queryKey: ["/api/dns/records"],
    enabled: isConnected,
  });

  // Filter records by IP if specified
  const filteredRecords = migrationConfig.oldIp 
    ? dnsRecords.filter(record => record.content === migrationConfig.oldIp)
    : dnsRecords;

  useEffect(() => {
    if (configData?.isConnected) {
      setIsConnected(true);
    }
  }, [configData]);

  const handleConnectionStatusChange = (connected: boolean) => {
    setIsConnected(connected);
    if (connected) {
      refetchRecords();
    }
  };

  const handleRecordSelectionChange = (recordIds: string[]) => {
    setSelectedRecords(recordIds);
  };

  const handleStartMigration = () => {
    if (selectedRecords.length === 0) return;
    setShowConfirmModal(true);
  };

  const handleConfirmMigration = (jobId: string) => {
    setCurrentMigrationJob(jobId);
    setShowConfirmModal(false);
    setSelectedRecords([]);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* API Configuration Section */}
      <ApiConfiguration 
        onConnectionChange={handleConnectionStatusChange}
        initialConnectionStatus={isConnected}
      />

      {/* Migration Configuration Section */}
      <MigrationConfig 
        isConnected={isConnected}
        onConfigChange={setMigrationConfig}
        onRecordsRefresh={refetchRecords}
      />

      {/* DNS Records Section */}
      {isConnected && (
        <DnsRecordsTable 
          records={filteredRecords}
          onSelectionChange={handleRecordSelectionChange}
          selectedRecords={selectedRecords}
          onStartMigration={handleStartMigration}
          migrationConfig={migrationConfig}
        />
      )}

      {/* Migration Status Section */}
      {currentMigrationJob && (
        <MigrationStatus jobId={currentMigrationJob} />
      )}

      {/* Backup & Recovery Section */}
      {isConnected && (
        <BackupRestore 
          selectedRecords={selectedRecords}
          allRecords={dnsRecords}
        />
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal 
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmMigration}
        selectedRecords={selectedRecords}
        oldIp={migrationConfig.oldIp}
        newIp={migrationConfig.newIp}
      />
    </main>
  );
}
