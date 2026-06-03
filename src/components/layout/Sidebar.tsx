import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TicketNotification } from '@/components/admin/TicketNotification';
import exavyLogo from '@/assets/exavy-logo.jpg';
import { 
  LayoutDashboard, 
  FileText, 
  Brain, 
  BookOpen, 
  Sparkles, 
  MessageSquare, 
  FolderKanban,
  Map,
  User, 
  CreditCard, 
  HelpCircle, 
  Settings, 
  LogOut,
  Menu,
  X,
  Shield,
  Calendar,
  Target,
  Languages,
  GraduationCap,
  ClipboardList,
  Presentation,
  Phone,
  Bell,
  Sun,
  Moon
} from 'lucide-react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Tableau de bord', path: '/dashboard', color: 'text-primary' },
  { icon: FileText, label: 'Documents', path: '/documents', color: 'text-blue-500' },
  { icon: FolderKanban, label: 'Projets', path: '/projects', color: 'text-indigo-500' },
  { icon: Brain, label: 'Quiz', path: '/quiz', color: 'text-violet-500' },
  { icon: BookOpen, label: 'Flashcards', path: '/flashcards', color: 'text-pink-500' },
  { icon: Sparkles, label: 'Résumés', path: '/summaries', color: 'text-amber-500' },
  { icon: Map, label: 'Mind Maps', path: '/mindmap', color: 'text-emerald-500' },
  { icon: MessageSquare, label: 'EXABOT', path: '/chat', color: 'text-fuchsia-500' },
  { icon: Calendar, label: 'Planning', path: '/planning', color: 'text-cyan-500' },
  { icon: Target, label: 'Compétences', path: '/skills', color: 'text-orange-500' },
  { icon: Languages, label: 'Reformuler', path: '/rephrase', color: 'text-teal-500' },
  { icon: ClipboardList, label: 'Exercices', path: '/exercises', color: 'text-rose-500' },
  { icon: GraduationCap, label: 'Examens blancs', path: '/mock-exam', color: 'text-red-500' },
  { icon: Presentation, label: 'Présentations', path: '/presentations', color: 'text-sky-500' },
];

const bottomMenuItems = [
  { icon: User, label: 'Profil', path: '/profile', color: 'text-primary' },
  { icon: CreditCard, label: 'Abonnement', path: '/subscription', color: 'text-amber-500' },
  { icon: Bell, label: 'Notifications', path: '/notifications', color: 'text-orange-500' },
  { icon: HelpCircle, label: 'Aide', path: '/help', color: 'text-cyan-500' },
  { icon: Phone, label: 'Contact', path: '/contact', color: 'text-emerald-500' },
  { icon: Settings, label: 'Paramètres', path: '/settings', color: 'text-muted-foreground' },
];

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const NavItem = ({ icon: Icon, label, path, color }: { icon: any; label: string; path: string; color?: string }) => {
    const isActive = location.pathname === path;

    return (
      <button
        onClick={() => {
          navigate(path);
          setIsOpen(false);
        }}
        className={cn(
          "nav-item-bauhaus w-full text-left group",
          isActive && "active"
        )}
      >
        <div className={cn(
          "w-9 h-9 flex items-center justify-center rounded-md transition-all duration-200 flex-shrink-0",
          isActive
            ? "bg-accent text-accent-foreground shadow-sm"
            : cn("bg-muted/40 group-hover:bg-muted/70", color)
        )}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm font-medium truncate">{label}</span>
        {isActive && (
          <div className="absolute right-4 w-2 h-2 bg-accent rounded-full" />
        )}
      </button>
    );
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden border-2 border-foreground bg-background h-12 w-12"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-foreground/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed left-0 top-0 h-full bg-sidebar text-sidebar-foreground z-40 transition-transform duration-300 w-64 flex flex-col border-r-4 border-accent",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo Section */}
        <div className="p-6 pt-16 md:pt-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <img src={exavyLogo} alt="EXAVY" className="w-10 h-10 rounded-lg object-cover" />
            <div>
              <h2 className="text-lg font-black tracking-tight">EXAVY</h2>
              <p className="text-xs text-sidebar-foreground/60 uppercase tracking-wider">AI Learning Assistant</p>
            </div>
          </div>
          
          {/* Ticket Notification for admins */}
          <div className="mt-4">
            <TicketNotification />
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-3 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sidebar-foreground/40 px-4">
              Navigation
            </span>
          </div>
          {menuItems.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
          
          {/* Admin link */}
          {isAdmin && (
            <>
              <div className="px-3 my-4">
                <div className="h-0.5 bg-sidebar-border" />
              </div>
              <div className="px-3 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-secondary px-4">
                  Admin
                </span>
              </div>
              <NavItem icon={Shield} label="Administration" path="/admin" />
            </>
          )}
        </nav>

        {/* Bottom Navigation */}
        <div className="border-t border-sidebar-border py-4">
          <div className="px-3 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sidebar-foreground/40 px-4">
              Compte
            </span>
          </div>
          {bottomMenuItems.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
          
          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="nav-item-bauhaus w-full text-left text-secondary hover:bg-secondary/10"
          >
            <div className="w-8 h-8 flex items-center justify-center">
              <LogOut className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium">Déconnexion</span>
          </button>
        </div>

        {/* Geometric decoration */}
        <div className="absolute bottom-0 left-0 w-full h-2 flex">
          <div className="flex-1 bg-primary" />
          <div className="flex-1 bg-secondary" />
          <div className="flex-1 bg-accent" />
        </div>
      </aside>
    </>
  );
};
