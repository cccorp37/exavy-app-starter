import { useLocation, useNavigate } from "react-router-dom";
import { Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

/**
 * Floating button to open EXABOT from any page.
 * - Hidden on /chat (already there), /auth, /onboarding, /, /install
 * - Hidden if user not signed in
 * - EXABOT is included in every plan (no premium gating)
 */
export const FloatingExabotButton = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();

  const HIDDEN_ROUTES = ["/chat", "/auth", "/onboarding", "/", "/install"];
  if (!user || HIDDEN_ROUTES.includes(pathname)) return null;

  return (
    <button
      onClick={() => navigate("/chat")}
      aria-label="Ouvrir EXABOT"
      className={cn(
        "fixed z-40 bottom-20 right-4 md:bottom-6 md:right-6",
        "h-14 w-14 rounded-full",
        "bg-gradient-to-br from-primary via-primary to-accent",
        "text-primary-foreground shadow-lg shadow-primary/40",
        "flex items-center justify-center",
        "border-2 border-background",
        "hover:scale-110 active:scale-95 transition-transform duration-200",
        "ring-2 ring-primary/30 hover:ring-primary/60",
      )}
    >
      <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping opacity-30" />
      <Brain className="w-6 h-6 relative z-10" />
      <span className="sr-only">EXABOT</span>
    </button>
  );
};
