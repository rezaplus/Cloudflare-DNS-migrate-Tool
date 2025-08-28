import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { MigrationProgress, ActivityLogEntry } from "@shared/schema";

interface MigrationStatusProps {
  jobId: string;
}

export default function MigrationStatus({ jobId }: MigrationStatusProps) {
  // Query for migration progress
  const { data: progress, refetch: refetchProgress } = useQuery<MigrationProgress>({
    queryKey: ["/api/migration", jobId, "progress"],
    refetchInterval: 2000, // Poll every 2 seconds
    enabled: Boolean(jobId),
  });

  // Query for activity log
  const { data: activityLog = [], refetch: refetchActivity } = useQuery<ActivityLogEntry[]>({
    queryKey: ["/api/activity"],
    refetchInterval: 3000, // Poll every 3 seconds
  });

  if (!progress) {
    return null;
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return "just now";
    if (minutes === 1) return "1 minute ago";
    return `${minutes} minutes ago`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <i className="fas fa-check-circle text-green-500"></i>;
      case 'error':
        return <i className="fas fa-exclamation-triangle text-red-500"></i>;
      case 'warning':
        return <i className="fas fa-exclamation-triangle text-yellow-500"></i>;
      case 'info':
      default:
        return <i className="fas fa-info-circle text-primary"></i>;
    }
  };

  return (
    <section>
      <Card>
        <CardContent className="pt-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">Migration Progress</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time status of DNS record updates
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-accent rounded-lg">
                  <i className="fas fa-list text-accent-foreground"></i>
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{progress.totalRecords}</div>
                  <div className="text-sm text-muted-foreground">Total Records</div>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <i className="fas fa-check text-white"></i>
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{progress.completedRecords}</div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <i className="fas fa-spinner text-white animate-spin"></i>
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{progress.processingRecords}</div>
                  <div className="text-sm text-muted-foreground">Processing</div>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-destructive rounded-lg">
                  <i className="fas fa-exclamation-triangle text-destructive-foreground"></i>
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{progress.failedRecords}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Overall Progress</span>
              <span className="text-sm text-muted-foreground">{progress.progressPercentage}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progress.progressPercentage}%` }}
              ></div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-foreground">Recent Activity</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => refetchActivity()}
                data-testid="button-refresh-activity"
              >
                <i className="fas fa-refresh mr-2"></i>
                Refresh
              </Button>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 h-48 overflow-y-auto space-y-2">
              {activityLog.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <i className="fas fa-history text-2xl mb-2"></i>
                  <p>No activity yet</p>
                </div>
              ) : (
                activityLog.map((entry) => (
                  <div key={entry.id} className="flex items-start space-x-3 text-sm">
                    {getActivityIcon(entry.type)}
                    <div className="flex-1">
                      <span className="text-foreground">{entry.message}</span>
                      {entry.details && (
                        <span className="text-muted-foreground ml-2">{entry.details}</span>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatTimeAgo(entry.timestamp)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
