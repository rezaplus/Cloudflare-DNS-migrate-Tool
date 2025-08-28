import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (jobId: string) => void;
  selectedRecords: string[];
  oldIp: string;
  newIp: string;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  selectedRecords,
  oldIp,
  newIp,
}: ConfirmationModalProps) {
  const { toast } = useToast();

  // Start migration mutation
  const startMigrationMutation = useMutation({
    mutationFn: async (data: { oldIp: string; newIp: string; recordIds: string[] }) => {
      return await apiRequest("POST", "/api/migration/start", data);
    },
    onSuccess: (response: any) => {
      const jobId = response?.jobId || response?.data?.jobId;
      toast({
        title: "Migration Started",
        description: `Migration job has been started for ${selectedRecords.length} records.`,
      });
      onConfirm(jobId);
    },
    onError: (error: any) => {
      toast({
        title: "Migration Failed",
        description: error.message || "Failed to start migration",
        variant: "destructive",
      });
    },
  });

  const handleConfirm = () => {
    startMigrationMutation.mutate({
      oldIp,
      newIp,
      recordIds: selectedRecords,
    });
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <i className="fas fa-exclamation-triangle text-yellow-500"></i>
            </div>
            <span>Confirm DNS Migration</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              You are about to update{" "}
              <span className="font-medium text-foreground">{selectedRecords.length} DNS records</span>{" "}
              with the following changes:
            </p>
            
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">From IP:</span>
                <span className="font-mono text-foreground">{oldIp}</span>
              </div>
              <div className="flex items-center justify-center py-1">
                <i className="fas fa-arrow-down text-muted-foreground"></i>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">To IP:</span>
                <span className="font-mono text-foreground">{newIp}</span>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-start space-x-2">
                <i className="fas fa-info-circle mt-0.5"></i>
                <span>
                  This action cannot be undone automatically. Make sure you have a backup before proceeding.
                </span>
              </p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={startMigrationMutation.isPending}
              data-testid="button-cancel-migration"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={startMigrationMutation.isPending}
              data-testid="button-confirm-migration"
            >
              {startMigrationMutation.isPending ? (
                <>
                  <i className="fas fa-spinner animate-spin mr-2"></i>
                  Starting...
                </>
              ) : (
                <>
                  <i className="fas fa-sync-alt mr-2"></i>
                  Start Migration
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
