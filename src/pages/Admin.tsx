import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CodeExportDialog } from '@/components/admin/CodeExportDialog';
import { AdminMarketplaceManager } from '@/components/marketplace/AdminMarketplaceManager';
import { 
  Shield, 
  Users, 
  Ticket, 
  Ban, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  MessageSquare,
  Mail,
  Phone,
  Calendar,
  FileCode
} from 'lucide-react';

interface UserSession {
  id: string;
  user_id: string;
  email: string;
  logged_in_at: string;
  last_active_at: string;
  ip_address: string;
  user_agent: string;
}

interface UserWithSubscription {
  user_id: string;
  email: string;
  plan: string;
  status: string;
  expires_at: string | null;
  is_blocked: boolean;
  blocked_until: string | null;
}

interface SupportTicket {
  id: string;
  user_id: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  admin_response: string | null;
  responded_at: string | null;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [users, setUsers] = useState<UserWithSubscription[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [responseText, setResponseText] = useState('');
  const [respondingTicket, setRespondingTicket] = useState(false);
  
  const [blockDialog, setBlockDialog] = useState<{ open: boolean; userId: string; email: string } | null>(null);
  const [blockDuration, setBlockDuration] = useState<string>('permanent');
  const [blockReason, setBlockReason] = useState('');
  const [showCodeExport, setShowCodeExport] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/dashboard');
      return;
    }
    
    if (isAdmin) {
      fetchAllData();
    }
  }, [isAdmin, adminLoading, navigate]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchSessions(),
      fetchUsersWithSubscriptions(),
      fetchTickets()
    ]);
    setLoading(false);
  };

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .order('logged_in_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setSessions(data as UserSession[]);
    }
  };

  const fetchUsersWithSubscriptions = async () => {
    // Get subscriptions
    const { data: subsData } = await supabase
      .from('subscriptions')
      .select('user_id, plan, status, expires_at');

    // Get blocks
    const { data: blocksData } = await supabase
      .from('user_blocks')
      .select('user_id, blocked_until, is_permanent');

    // Get sessions for emails
    const { data: sessionsData } = await supabase
      .from('user_sessions')
      .select('user_id, email')
      .order('logged_in_at', { ascending: false });

    const uniqueEmails = new Map<string, string>();
    sessionsData?.forEach(s => {
      if (s.email && !uniqueEmails.has(s.user_id)) {
        uniqueEmails.set(s.user_id, s.email);
      }
    });

    const blocksMap = new Map<string, { blocked_until: string | null; is_permanent: boolean }>();
    blocksData?.forEach(b => blocksMap.set(b.user_id, b));

    const usersMap = new Map<string, UserWithSubscription>();
    
    subsData?.forEach(sub => {
      const block = blocksMap.get(sub.user_id);
      usersMap.set(sub.user_id, {
        user_id: sub.user_id,
        email: uniqueEmails.get(sub.user_id) || 'Email inconnu',
        plan: sub.plan,
        status: sub.status,
        expires_at: sub.expires_at,
        is_blocked: block ? (block.is_permanent || (block.blocked_until && new Date(block.blocked_until) > new Date())) : false,
        blocked_until: block?.blocked_until || null
      });
    });

    setUsers(Array.from(usersMap.values()));
  };

  const fetchTickets = async () => {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTickets(data as SupportTicket[]);
    }
  };

  const handleBlockUser = async () => {
    if (!blockDialog) return;

    try {
      const isPermanent = blockDuration === 'permanent';
      let blockedUntil = null;

      if (!isPermanent) {
        const days = parseInt(blockDuration);
        blockedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      }

      // Upsert block
      const { error } = await supabase
        .from('user_blocks')
        .upsert({
          user_id: blockDialog.userId,
          blocked_by: user?.id,
          reason: blockReason,
          is_permanent: isPermanent,
          blocked_until: blockedUntil
        }, { onConflict: 'user_id' });

      if (error) throw error;

      toast.success('Utilisateur bloqué avec succès');
      setBlockDialog(null);
      setBlockReason('');
      setBlockDuration('permanent');
      fetchUsersWithSubscriptions();
    } catch (error: any) {
      toast.error('Erreur lors du blocage: ' + error.message);
    }
  };

  const handleUnblockUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('Utilisateur débloqué');
      fetchUsersWithSubscriptions();
    } catch (error: any) {
      toast.error('Erreur: ' + error.message);
    }
  };

  const handleRespondToTicket = async () => {
    if (!selectedTicket || !responseText.trim()) return;

    setRespondingTicket(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          admin_response: responseText,
          responded_at: new Date().toISOString(),
          status: 'resolved'
        })
        .eq('id', selectedTicket.id);

      if (error) throw error;

      toast.success('Réponse envoyée');
      setSelectedTicket(null);
      setResponseText('');
      fetchTickets();
    } catch (error: any) {
      toast.error('Erreur: ' + error.message);
    } finally {
      setRespondingTicket(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status })
        .eq('id', ticketId);

      if (error) throw error;
      toast.success('Statut mis à jour');
      fetchTickets();
    } catch (error: any) {
      toast.error('Erreur: ' + error.message);
    }
  };

  if (adminLoading || loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const openTickets = tickets.filter(t => t.status === 'open').length;
  const totalUsers = users.length;
  const premiumUsers = users.filter(u => u.plan !== 'free').length;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Panneau d'Administration</h1>
              <p className="text-muted-foreground">Gérez les utilisateurs et les tickets de support</p>
            </div>
          </div>
          <Button onClick={() => setShowCodeExport(true)} variant="outline">
            <FileCode className="w-4 h-4 mr-2" />
            Export du Code
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{totalUsers}</p>
                  <p className="text-sm text-muted-foreground">Utilisateurs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{premiumUsers}</p>
                  <p className="text-sm text-muted-foreground">Premium</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Ticket className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{openTickets}</p>
                  <p className="text-sm text-muted-foreground">Tickets ouverts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{sessions.length}</p>
                  <p className="text-sm text-muted-foreground">Sessions récentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="tickets" className="relative">
              Tickets
              {openTickets > 0 && (
                <Badge className="ml-2 bg-destructive">{openTickets}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          </TabsList>

          <TabsContent value="marketplace">
            <AdminMarketplaceManager />
          </TabsContent>


          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des utilisateurs</CardTitle>
                <CardDescription>Liste des utilisateurs et leurs abonnements</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Expiration</TableHead>
                      <TableHead>État</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.user_id}>
                        <TableCell className="font-medium">{u.email}</TableCell>
                        <TableCell>
                          <Badge variant={u.plan === 'free' ? 'secondary' : 'default'}>
                            {u.plan}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.status === 'active' ? 'default' : 'secondary'}>
                            {u.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {u.expires_at 
                            ? format(new Date(u.expires_at), 'dd/MM/yyyy', { locale: fr })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {u.is_blocked ? (
                            <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                              <Ban className="w-3 h-3" />
                              Bloqué
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600">Actif</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {u.is_blocked ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnblockUser(u.user_id)}
                            >
                              Débloquer
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setBlockDialog({ open: true, userId: u.user_id, email: u.email })}
                            >
                              <Ban className="w-4 h-4 mr-1" />
                              Bloquer
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions">
            <Card>
              <CardHeader>
                <CardTitle>Sessions de connexion</CardTitle>
                <CardDescription>Historique des connexions récentes</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Date de connexion</TableHead>
                      <TableHead>Dernière activité</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-medium">{session.email || 'N/A'}</TableCell>
                        <TableCell>
                          {format(new Date(session.logged_in_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </TableCell>
                        <TableCell>
                          {format(new Date(session.last_active_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </TableCell>
                        <TableCell>{session.ip_address || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tickets">
            <Card>
              <CardHeader>
                <CardTitle>Tickets de support</CardTitle>
                <CardDescription>Réclamations des utilisateurs</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Sujet</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell>
                          {format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            {ticket.email}
                          </div>
                          {ticket.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              {ticket.phone}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{ticket.subject}</TableCell>
                        <TableCell>
                          <Select
                            value={ticket.status}
                            onValueChange={(value) => updateTicketStatus(ticket.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="w-3 h-3 text-orange-500" />
                                  Ouvert
                                </div>
                              </SelectItem>
                              <SelectItem value="in_progress">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-3 h-3 text-blue-500" />
                                  En cours
                                </div>
                              </SelectItem>
                              <SelectItem value="resolved">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                  Résolu
                                </div>
                              </SelectItem>
                              <SelectItem value="closed">
                                <div className="flex items-center gap-2">
                                  <XCircle className="w-3 h-3 text-gray-500" />
                                  Fermé
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedTicket(ticket)}
                          >
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Voir / Répondre
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Block Dialog */}
        <Dialog open={blockDialog?.open} onOpenChange={() => setBlockDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bloquer l'utilisateur</DialogTitle>
              <DialogDescription>
                Bloquer {blockDialog?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Durée du blocage</label>
                <Select value={blockDuration} onValueChange={setBlockDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 jour</SelectItem>
                    <SelectItem value="7">7 jours</SelectItem>
                    <SelectItem value="30">30 jours</SelectItem>
                    <SelectItem value="90">90 jours</SelectItem>
                    <SelectItem value="permanent">Permanent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Raison (optionnel)</label>
                <Textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Raison du blocage..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBlockDialog(null)}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleBlockUser}>
                Confirmer le blocage
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Ticket Detail Dialog */}
        <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedTicket?.subject}</DialogTitle>
              <DialogDescription>
                De: {selectedTicket?.email}
                {selectedTicket?.phone && ` | Tél: ${selectedTicket?.phone}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Message</label>
                <div className="mt-1 p-4 bg-muted rounded-lg whitespace-pre-wrap">
                  {selectedTicket?.message}
                </div>
              </div>
              
              {selectedTicket?.admin_response && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Réponse admin</label>
                  <div className="mt-1 p-4 bg-primary/10 rounded-lg whitespace-pre-wrap">
                    {selectedTicket.admin_response}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Répondu le {selectedTicket.responded_at && format(new Date(selectedTicket.responded_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Votre réponse</label>
                <Textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Rédigez votre réponse..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedTicket(null)}>
                Fermer
              </Button>
              <Button onClick={handleRespondToTicket} disabled={respondingTicket || !responseText.trim()}>
                {respondingTicket ? 'Envoi...' : 'Envoyer la réponse'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Code Export Dialog */}
        <CodeExportDialog 
          open={showCodeExport} 
          onOpenChange={setShowCodeExport} 
        />
      </div>
    </MainLayout>
  );
};

export default Admin;