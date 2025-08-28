import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Backup, DnsRecord } from "@shared/schema";

interface BackupRestoreProps {
  selectedRecords: string[];
  allRecords: DnsRecord[];
}

export default function BackupRestore({ selectedRecords, allRecords }: BackupRestoreProps) {
  const { toast } = useToast();

  // Query for recent backups
  const { data: backups = [] } = useQuery<Backup[]>({
    queryKey: ["/api/backups"],
  });

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: async (data: { name?: string; recordIds?: string[] }) => {
      return await apiRequest("POST", "/api/backup", data);
    },
    onSuccess: () => {
      toast({
        title: "Backup Created",
        description: "DNS records backup has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/backups"] });
    },
    onError: (error: any) => {
      toast({
        title: "Backup Failed",
        description: error.message || "Failed to create backup",
        variant: "destructive",
      });
    },
  });

  // Download backup mutation
  const downloadBackupMutation = useMutation({
    mutationFn: async (backupId: string) => {
      return await apiRequest("GET", `/api/backup/${backupId}`);
    },
    onSuccess: (response: any) => {
      const backup = response.json ? response.json() : response;
      const blob = new Blob([backup.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backup.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download Started",
        description: "Backup file download has started.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download backup",
        variant: "destructive",
      });
    },
  });

  const handleCreateFullBackup = () => {
    createBackupMutation.mutate({
      name: `dns-backup-${new Date().toISOString().split('T')[0]}.json`
    });
  };

  const handleCreateSelectiveBackup = () => {
    if (selectedRecords.length === 0) {
      toast({
        title: "No Records Selected",
        description: "Please select records first to create a selective backup.",
        variant: "destructive",
      });
      return;
    }
    
    createBackupMutation.mutate({
      name: `dns-selective-backup-${new Date().toISOString().split('T')[0]}.json`,
      recordIds: selectedRecords
    });
  };

  const handleDownloadBackup = (backupId: string) => {
    downloadBackupMutation.mutate(backupId);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <section>
      <Card>
        <CardContent className="pt-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">Backup & Recovery</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Create backups before migration and restore if needed
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Create Backup</h3>
              <div className="space-y-3">
                <Button
                  variant="secondary"
                  className="w-full justify-between text-left p-4 h-auto"
                  onClick={handleCreateFullBackup}
                  disabled={createBackupMutation.isPending}
                  data-testid="button-full-backup"
                >
                  <div className="flex items-center space-x-3">
                    <i className="fas fa-download text-primary"></i>
                    <div>
                      <div className="text-sm font-medium">Full DNS Backup</div>
                      <div className="text-xs text-muted-foreground">
                        Export all {allRecords.length} DNS records
                      </div>
                    </div>
                  </div>
                  <i className="fas fa-chevron-right text-muted-foreground"></i>
                </Button>

                <Button
                  variant="secondary"
                  className="w-full justify-between text-left p-4 h-auto"
                  onClick={handleCreateSelectiveBackup}
                  disabled={createBackupMutation.isPending || selectedRecords.length === 0}
                  data-testid="button-selective-backup"
                >
                  <div className="flex items-center space-x-3">
                    <i className="fas fa-filter text-primary"></i>
                    <div>
                      <div className="text-sm font-medium">Selective Backup</div>
                      <div className="text-xs text-muted-foreground">
                        Export {selectedRecords.length} selected records only
                      </div>
                    </div>
                  </div>
                  <i className="fas fa-chevron-right text-muted-foreground"></i>
                </Button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Recent Backups</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {backups.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <i className="fas fa-archive text-2xl mb-2"></i>
                    <p>No backups found</p>
                    <p className="text-xs">Create your first backup above</p>
                  </div>
                ) : (
                  backups.map((backup) => (
                    <div
                      key={backup.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-md"
                    >
                      <div className="flex items-center space-x-3">
                        <i className="fas fa-file-archive text-muted-foreground"></i>
                        <div>
                          <div className="text-sm font-medium text-foreground">{backup.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(backup.createdAt)} - {backup.recordCount} records
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          className="text-primary hover:text-primary/80 text-sm"
                          title="Download"
                          onClick={() => handleDownloadBackup(backup.id)}
                          disabled={downloadBackupMutation.isPending}
                          data-testid={`button-download-${backup.id}`}
                        >
                          {downloadBackupMutation.isPending ? (
                            <i className="fas fa-spinner animate-spin"></i>
                          ) : (
                            <i className="fas fa-download"></i>
                          )}
                        </button>
                        <button
                          className="text-green-500 hover:text-green-400 text-sm"
                          title="Restore"
                          data-testid={`button-restore-${backup.id}`}
                        >
                          <i className="fas fa-upload"></i>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
