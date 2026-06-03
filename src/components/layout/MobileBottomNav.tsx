import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, FileText, MessageSquare, FolderKanban, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const ITEMS = [
  { icon: LayoutDashboard, label: "Accueil", path: "/dashboard" },
  { icon: FileText, label: "Docs", path: "/documents" },
  { icon: FolderKanban, label: "Projets", path: "/projects" },
  { icon: MessageSquare, label: "EXABOT", path: "/chat" },
  { icon: User, label: "Profil", path: "/profile" },
];

/** Bottom tab bar visible only on small screens for quick access. */
export const MobileBottomNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();

  const HIDDEN_ROUTES = ["/auth", "/onboarding", "/", "/install"];
  if (!user || HIDDEN_ROUTES.includes(pathname)) return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur border-t-2 border-foreground/10"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navigation rapide"
    >
      <ul className="flex items-center justify-around">
        {ITEMS.map(({ icon: Icon, label, path }) => {
          const active = pathname === path || (path !== "/dashboard" && pathname.startsWith(path));
          return (
            <li key={path} className="flex-1">
              <button
                onClick={() => navigate(path)}
                className={cn(
                  "w-full flex flex-col items-center gap-0.5 py-2 text-[10px] font-bold uppercase tracking-wider",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={cn(
                    "h-9 w-9 flex items-center justify-center rounded-lg transition-colors",
                    active ? "bg-primary/15" : "bg-transparent",
                  )}
                >
                  <Icon className="w-5 h-5" />
                </span>
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
