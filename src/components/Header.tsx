import logoOficial from "@/assets/logo-oficial.png";
import { CLINIC_CONFIG } from "@/lib/config";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="container mx-auto flex items-center gap-3 px-4 py-3">
        <div className="relative h-12 w-12 shrink-0 flex items-center justify-center">
          <img 
            src={logoOficial} 
            alt="Logo Dra. Fátima Casal" 
            className="h-full w-full object-contain" 
          />
        </div>
        <div>
          <h1 className="text-lg font-bold leading-tight text-foreground">
            {CLINIC_CONFIG.name}
          </h1>
          <p className="text-xs text-muted-foreground">{CLINIC_CONFIG.specialty}</p>
        </div>
      </div>
    </header>
  );
};

export default Header;
