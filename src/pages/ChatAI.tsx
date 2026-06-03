import { useState, useRef, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Copy, 
  Check,
  Settings,
  Brain,
  Clock,
  Flame,
  Coffee,
  FileText,
  X,
  Paperclip
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ExabotProfile {
  personality_type: string;
  learning_style: string;
  burnout_score: number;
  streak_days: number;
  total_study_minutes: number;
}

interface UserDocument {
  id: string;
  title: string;
  content: string | null;
  summary: string | null;
}

const PERSONALITY_OPTIONS = [
  { value: 'encouraging', label: '🌟 Encourageant', description: 'Bienveillant et motivant' },
  { value: 'strict', label: '📏 Exigeant', description: 'Pousse à se dépasser' },
  { value: 'friendly', label: '😊 Amical', description: 'Décontracté et fun' },
  { value: 'analytical', label: '📊 Analytique', description: 'Basé sur les données' },
];

const LEARNING_STYLES = [
  { value: 'visual', label: '👁️ Visuel' },
  { value: 'auditory', label: '👂 Auditif' },
  { value: 'kinesthetic', label: '✋ Kinesthésique' },
  { value: 'reading', label: '📖 Lecture/Écriture' },
];

const ChatAI = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Salut ! 👋 Je suis EXABOT, ton coach d'apprentissage personnel. Je suis là pour t'aider à réviser, te motiver, et t'accompagner vers la réussite ! Comment puis-je t'aider aujourd'hui ?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ExabotProfile | null>(null);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<UserDocument | null>(null);
  const [docPopoverOpen, setDocPopoverOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchDocuments();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('exabot_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    if (data) {
      setProfile(data as ExabotProfile);
    }
  };

  const fetchDocuments = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('documents')
      .select('id, title, content, summary')
      .eq('user_id', user.id)
      .in('status', ['processed', 'completed'])
      .order('created_at', { ascending: false });
    if (data) {
      setDocuments(data);
    }
  };

  const updateProfile = async (field: string, value: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('exabot_profiles')
      .upsert({
        user_id: user.id,
        [field]: value,
        updated_at: new Date().toISOString(),
      });
    if (!error) {
      setProfile(prev => prev ? { ...prev, [field]: value } : null);
      toast.success('Préférences mises à jour');
    }
  };

  const handleCopy = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(messageId);
      toast.success("Réponse copiée !");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Erreur lors de la copie");
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !user) return;

    // Build user content with optional document context
    let userContent = input;
    if (selectedDoc) {
      const docContent = selectedDoc.content?.substring(0, 3000) || selectedDoc.summary || '';
      userContent = `[Document joint: "${selectedDoc.title}"]\n\nContenu du document:\n${docContent}\n\n---\n\nMa question: ${input}`;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: selectedDoc ? `📎 ${selectedDoc.title}\n\n${input}` : input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSelectedDoc(null);
    setIsLoading(true);

    try {
      // Get the user's actual session token
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      
      if (!accessToken) {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }

      const chatMessages = messages
        .filter(m => m.id !== '1')
        .map(m => ({ role: m.role, content: m.content }));
      chatMessages.push({ role: 'user', content: userContent });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/exabot-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            messages: chatMessages,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur de connexion');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantMessageId = (Date.now() + 1).toString();

      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }]);

      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => 
                prev.map(m => 
                  m.id === assistantMessageId 
                    ? { ...m, content: assistantContent }
                    : m
                )
              );
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
      toast.error(errorMessage);
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Désolé, j'ai rencontré une erreur. Réessaie dans un instant ! 🙏",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getBurnoutStatus = () => {
    if (!profile) return null;
    const score = profile.burnout_score;
    if (score >= 70) return { color: 'destructive', label: 'Repos nécessaire', icon: Coffee };
    if (score >= 40) return { color: 'warning', label: 'Attention fatigue', icon: Clock };
    return { color: 'default', label: 'En forme', icon: Flame };
  };

  const burnoutStatus = getBurnoutStatus();

  return (
    <MainLayout>
      <div className="h-[100dvh] md:h-[calc(100vh-2rem)] p-3 sm:p-4 md:p-6 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-3 md:mb-6 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex-shrink-0">
              <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-xl font-bold flex items-center gap-2 truncate">
                EXABOT
                <Badge variant="secondary" className="text-[10px] sm:text-xs hidden sm:inline-flex">Coach IA</Badge>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Ton coach d'apprentissage personnel</p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {profile && burnoutStatus && (
              <Badge variant={burnoutStatus.color as any} className="gap-1 hidden md:inline-flex">
                <burnoutStatus.icon className="w-3 h-3" />
                {burnoutStatus.label}
              </Badge>
            )}
            
            {profile?.streak_days ? (
              <Badge variant="outline" className="gap-1 text-xs">
                <Flame className="w-3 h-3 text-orange-500" />
                {profile.streak_days}j
              </Badge>
            ) : null}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <Settings className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Personnalité d'EXABOT</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {PERSONALITY_OPTIONS.map(opt => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => updateProfile('personality_type', opt.value)}
                    className={profile?.personality_type === opt.value ? 'bg-accent' : ''}
                  >
                    <div>
                      <div className="font-medium">{opt.label}</div>
                      <div className="text-xs text-muted-foreground">{opt.description}</div>
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Style d'apprentissage</DropdownMenuLabel>
                {LEARNING_STYLES.map(style => (
                  <DropdownMenuItem
                    key={style.value}
                    onClick={() => updateProfile('learning_style', style.value)}
                    className={profile?.learning_style === style.value ? 'bg-accent' : ''}
                  >
                    {style.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">
          <CardHeader className="py-2 sm:py-3 border-b">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              {profile?.personality_type === 'friendly' ? '💬 Discussion avec EXABOT' : 'Assistant EXABOT'}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 flex flex-col min-h-0 min-w-0">
            <ScrollArea className="flex-1 p-3 sm:p-4 min-w-0" ref={scrollRef}>
              <div className="space-y-4 min-w-0">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-2 sm:gap-3 min-w-0 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] sm:max-w-[80%] min-w-0 rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">{message.content}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs opacity-70">
                          {message.timestamp.toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        {message.role === 'assistant' && message.content && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-70 hover:opacity-100"
                            onClick={() => handleCopy(message.content, message.id)}
                          >
                            {copiedId === message.id ? (
                              <Check className="w-3 h-3 text-green-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-secondary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Selected Document Badge */}
            {selectedDoc && (
              <div className="px-4 pt-2">
                <Badge variant="secondary" className="gap-1">
                  <FileText className="w-3 h-3" />
                  {selectedDoc.title}
                  <button onClick={() => setSelectedDoc(null)} className="ml-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                {/* Document attach button */}
                <Popover open={docPopoverOpen} onOpenChange={setDocPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" disabled={isLoading || !user || documents.length === 0} title="Joindre un document">
                      <Paperclip className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-2" align="start">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">Vos documents</p>
                    <ScrollArea className="max-h-48">
                      {documents.map(doc => (
                        <button
                          key={doc.id}
                          onClick={() => {
                            setSelectedDoc(doc);
                            setDocPopoverOpen(false);
                          }}
                          className="w-full text-left px-2 py-2 text-sm hover:bg-muted rounded-md flex items-center gap-2 transition-colors"
                        >
                          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{doc.title}</span>
                        </button>
                      ))}
                    </ScrollArea>
                  </PopoverContent>
                </Popover>

                <Input
                  placeholder="Pose ta question à EXABOT..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading || !user}
                  className="flex-1"
                />
                <Button onClick={handleSend} disabled={!input.trim() || isLoading || !user}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              {!user && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Connectez-vous pour discuter avec EXABOT
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ChatAI;
