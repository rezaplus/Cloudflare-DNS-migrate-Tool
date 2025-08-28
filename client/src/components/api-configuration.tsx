import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertApiConfigurationSchema } from "@shared/schema";
import type { InsertApiConfiguration } from "@shared/schema";

interface ApiConfigurationProps {
  onConnectionChange: (connected: boolean) => void;
  initialConnectionStatus: boolean;
}

export default function ApiConfiguration({ 
  onConnectionChange, 
  initialConnectionStatus 
}: ApiConfigurationProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [isConnected, setIsConnected] = useState(initialConnectionStatus);
  const { toast } = useToast();

  const form = useForm<InsertApiConfiguration>({
    resolver: zodResolver(insertApiConfigurationSchema),
    defaultValues: {
      email: "",
      apiKey: "",
    },
  });

  // Query for existing configuration
  const { data: configData } = useQuery({
    queryKey: ["/api/config"],
    enabled: true,
  });

  // Save configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (data: InsertApiConfiguration) => {
      return await apiRequest("POST", "/api/config", data);
    },
    onSuccess: () => {
      toast({
        title: "Configuration Saved",
        description: "API credentials have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/config"] });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save configuration",
        variant: "destructive",
      });
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/config/test");
    },
    onSuccess: () => {
      setIsConnected(true);
      onConnectionChange(true);
      toast({
        title: "Connection Successful",
        description: "Successfully connected to Cloudflare API.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/config"] });
    },
    onError: (error: any) => {
      setIsConnected(false);
      onConnectionChange(false);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Cloudflare API",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: InsertApiConfiguration) => {
    await saveConfigMutation.mutateAsync(data);
  };

  const handleTestConnection = () => {
    testConnectionMutation.mutate();
  };

  return (
    <section>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">API Configuration</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Connect to your Cloudflare account to manage DNS records
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="email" className="flex items-center text-sm font-medium mb-2">
                  <i className="fas fa-envelope mr-2 text-muted-foreground"></i>
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  {...form.register("email")}
                  data-testid="input-email"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="apiKey" className="flex items-center text-sm font-medium mb-2">
                  <i className="fas fa-key mr-2 text-muted-foreground"></i>
                  Global API Key
                </Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showApiKey ? "text" : "password"}
                    placeholder="Enter your Global API Key"
                    {...form.register("apiKey")}
                    data-testid="input-api-key"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                    data-testid="button-toggle-api-key"
                  >
                    <i className={`fas ${showApiKey ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
                {form.formState.errors.apiKey && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.apiKey.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  type="submit"
                  disabled={saveConfigMutation.isPending}
                  data-testid="button-save-config"
                >
                  {saveConfigMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner animate-spin mr-2"></i>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save mr-2"></i>
                      Save Configuration
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleTestConnection}
                  disabled={testConnectionMutation.isPending || !(configData as any)?.hasApiKey}
                  data-testid="button-test-connection"
                >
                  {testConnectionMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner animate-spin mr-2"></i>
                      Testing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-vial mr-2"></i>
                      Test Connection
                    </>
                  )}
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                <i className="fas fa-info-circle mr-1"></i>
                Find your API key in Cloudflare Dashboard → My Profile → API Tokens
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
