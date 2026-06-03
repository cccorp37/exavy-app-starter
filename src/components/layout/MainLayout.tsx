import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BackButton } from "./BackButton";
import { FloatingExabotButton } from "./FloatingExabotButton";
import { MobileBottomNav } from "./MobileBottomNav";

interface MainLayoutProps {
  children: ReactNode;
  showBackButton?: boolean;
}

export const MainLayout = ({ children, showBackButton = true }: MainLayoutProps) => {
  const location = useLocation();

  // Don't show back button on dashboard (home page)
  const isHomePage = location.pathname === "/dashboard";
  const shouldShowBackButton = showBackButton && !isHomePage;

  return (
    <div className="min-h-screen bg-background grid-bauhaus">
      <Sidebar />
      <main className="md:ml-64 min-h-screen relative pb-16 md:pb-0">
        {shouldShowBackButton && (
          <div className="sticky top-0 z-30 p-4 flex justify-start">
            <BackButton className="bg-background border-2 border-foreground font-bold uppercase text-xs tracking-wider" />
          </div>
        )}
        {children}
      </main>
      <FloatingExabotButton />
      <MobileBottomNav />
    </div>
  );
};
