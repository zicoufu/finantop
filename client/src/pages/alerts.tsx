import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { formatDate } from "@/lib/date";
import { Bell, CheckCircle, AlertTriangle, Clock, Target, TrendingUp, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Alert {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  relatedId?: number;
  createdAt: string;
}

export default function Alerts() {
  const { toast } = useToast();

  const { data: allAlerts, isLoading: allAlertsLoading } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
  });

  const { data: unreadAlerts, isLoading: unreadAlertsLoading } = useQuery<Alert[]>({
    queryKey: ["/api/alerts?unread=true"],
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("PUT", `/api/alerts/${id}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts?unread=true"] });
      toast({
        title: "Alerta marcado como lido",
        description: "O alerta foi marcado como lido com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível marcar o alerta como lido.",
        variant: "destructive",
      });
    },
  });

  const deleteAlertMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/alerts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts?unread=true"] });
      toast({
        title: "Alerta excluído",
        description: "O alerta foi excluído com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o alerta.",
        variant: "destructive",
      });
    },
  });

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'due_date':
        return Clock;
      case 'overdue':
        return AlertTriangle;
      case 'goal_milestone':
        return Target;
      case 'investment_maturity':
        return TrendingUp;
      default:
        return Bell;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'due_date':
        return 'text-orange-500 bg-orange-50';
      case 'overdue':
        return 'text-red-500 bg-red-50';
      case 'goal_milestone':
        return 'text-green-500 bg-green-50';
      case 'investment_maturity':
        return 'text-blue-500 bg-blue-50';
      default:
        return 'text-gray-500 bg-gray-50';
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'due_date':
        return 'Vencimento';
      case 'overdue':
        return 'Vencido';
      case 'goal_milestone':
        return 'Meta';
      case 'investment_maturity':
        return 'Investimento';
      default:
        return 'Geral';
    }
  };

  const isLoading = allAlertsLoading || unreadAlertsLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Alertas</h2>
            <Skeleton className="h-6 w-16" />
          </div>
        </header>
        <div className="p-6 flex-1">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-48 mb-2" />
                      <Skeleton className="h-3 w-32 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-8 w-8" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleMarkAsRead = (id: number) => {
    markAsReadMutation.mutate(id);
  };

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja excluir este alerta?')) {
      deleteAlertMutation.mutate(id);
    }
  };

  const unreadCount = unreadAlerts?.length || 0;

  const AlertCard = ({ alert }: { alert: Alert }) => {
    const IconComponent = getAlertIcon(alert.type);
    const iconColorClass = getAlertColor(alert.type);
    
    return (
      <Card className={`${!alert.isRead ? 'ring-2 ring-primary/20 bg-primary/5' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start space-x-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconColorClass}`}>
              <IconComponent className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-medium text-gray-900 truncate">{alert.title}</h3>
                <Badge variant="outline" className="text-xs">
                  {getAlertTypeLabel(alert.type)}
                </Badge>
                {!alert.isRead && (
                  <Badge className="bg-primary text-white text-xs">
                    Novo
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-2">{alert.message}</p>
              <p className="text-xs text-gray-500">
                {formatDate(alert.createdAt)}
              </p>
            </div>
            <div className="flex space-x-1">
              {!alert.isRead && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMarkAsRead(alert.id)}
                  title="Marcar como lido"
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(alert.id)}
                className="text-red-600 hover:text-red-700"
                title="Excluir alerta"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Alertas</h2>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                Você tem {unreadCount} {unreadCount === 1 ? 'alerta não lido' : 'alertas não lidos'}
              </p>
            )}
          </div>
          <Badge variant="outline" className="flex items-center space-x-1">
            <Bell className="h-4 w-4" />
            <span>{unreadCount}</span>
          </Badge>
        </div>
      </header>

      {/* Content */}
      <div className="p-6 flex-1 overflow-y-auto">
        <Tabs defaultValue="unread" className="space-y-6">
          <TabsList>
            <TabsTrigger value="unread" className="flex items-center space-x-2">
              <span>Não Lidos</span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">Todos</TabsTrigger>
          </TabsList>

          <TabsContent value="unread" className="space-y-4">
            {!unreadAlerts || unreadAlerts.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Tudo em dia!
                  </h3>
                  <p className="text-gray-500">
                    Você não tem alertas não lidos no momento.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {unreadAlerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            {!allAlerts || allAlerts.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhum alerta
                  </h3>
                  <p className="text-gray-500">
                    Você ainda não recebeu nenhum alerta.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {allAlerts
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((alert) => (
                    <AlertCard key={alert.id} alert={alert} />
                  ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
