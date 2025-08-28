import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface MigrationConfigProps {
  isConnected: boolean;
  onConfigChange: (config: { oldIp: string; newIp: string }) => void;
  onRecordsRefresh: () => void;
}

export default function MigrationConfig({ 
  isConnected, 
  onConfigChange, 
  onRecordsRefresh 
}: MigrationConfigProps) {
  const [oldIp, setOldIp] = useState("");
  const [newIp, setNewIp] = useState("");
  const { toast } = useToast();

  // DNS scan mutation
  const scanMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/dns/scan");
    },
    onSuccess: (data: any) => {
      toast({
        title: "DNS Scan Completed",
        description: `Found ${data.records} DNS records in ${data.zones} zones`,
      });
      onRecordsRefresh();
    },
    onError: (error: any) => {
      toast({
        title: "Scan Failed",
        description: error.message || "Failed to scan DNS records",
        variant: "destructive",
      });
    },
  });

  const handleScanRecords = () => {
    if (!isConnected) {
      toast({
        title: "Not Connected",
        description: "Please connect to Cloudflare API first",
        variant: "destructive",
      });
      return;
    }
    scanMutation.mutate();
  };

  const handleOldIpChange = (value: string) => {
    setOldIp(value);
    onConfigChange({ oldIp: value, newIp });
  };

  const handleNewIpChange = (value: string) => {
    setNewIp(value);
    onConfigChange({ oldIp, newIp: value });
  };

  return (
    <section>
      <Card>
        <CardContent className="pt-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">Migration Configuration</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Specify the old IP address to find and the new IP address to replace it with
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="oldIp" className="flex items-center text-sm font-medium mb-2">
                <i className="fas fa-server mr-2 text-muted-foreground"></i>
                Current IP Address
              </Label>
              <Input
                id="oldIp"
                type="text"
                placeholder="192.168.1.100"
                value={oldIp}
                onChange={(e) => handleOldIpChange(e.target.value)}
                data-testid="input-old-ip"
              />
            </div>

            <div>
              <Label htmlFor="newIp" className="flex items-center text-sm font-medium mb-2">
                <i className="fas fa-network-wired mr-2 text-muted-foreground"></i>
                New IP Address
              </Label>
              <Input
                id="newIp"
                type="text"
                placeholder="192.168.1.200"
                value={newIp}
                onChange={(e) => handleNewIpChange(e.target.value)}
                data-testid="input-new-ip"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center space-x-4">
            <Button
              onClick={handleScanRecords}
              disabled={!isConnected || scanMutation.isPending}
              variant="secondary"
              data-testid="button-scan-dns"
            >
              {scanMutation.isPending ? (
                <>
                  <i className="fas fa-spinner animate-spin mr-2"></i>
                  Scanning...
                </>
              ) : (
                <>
                  <i className="fas fa-search mr-2"></i>
                  Scan DNS Records
                </>
              )}
            </Button>

            {scanMutation.isPending && (
              <div className="flex items-center space-x-2">
                <div className="animate-spin">
                  <i className="fas fa-spinner"></i>
                </div>
                <span className="text-sm text-muted-foreground">Scanning zones...</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
