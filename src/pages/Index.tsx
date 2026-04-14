import { useState, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import BookingForm from "@/components/BookingForm";
import { Heart, Phone, MapPin, Clock } from "lucide-react";
import { CLINIC_CONFIG } from "@/lib/config";

const Index = () => {
  const [showBooking, setShowBooking] = useState(false);
  const bookingRef = useRef<HTMLDivElement>(null);

  const handleStartBooking = () => {
    setShowBooking(true);
    setTimeout(() => bookingRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {!showBooking && <HeroSection onStartBooking={handleStartBooking} />}

      <AnimatePresence>
        {showBooking && (
          <div ref={bookingRef} className="container mx-auto px-4">
            <BookingForm onClose={() => setShowBooking(false)} />
          </div>
        )}
      </AnimatePresence>

      {/* Info cards */}
      {!showBooking && (
        <section className="container mx-auto px-4 py-12">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-start gap-3 rounded-xl bg-card p-5 shadow-card">
              <div className="rounded-lg bg-primary/10 p-2">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Horário</h3>
                <p className="text-sm text-muted-foreground">Seg a Sex, 08:30 – 17:00</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-card p-5 shadow-card">
              <div className="rounded-lg bg-accent/10 p-2">
                <Phone className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Contato</h3>
                <p className="text-sm text-muted-foreground">(24) 99971-2123</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-card p-5 shadow-card">
              <div className="rounded-lg bg-primary/10 p-2">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Especialidade</h3>
                <p className="text-sm text-muted-foreground">{CLINIC_CONFIG.specialty}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border bg-card py-6 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} {CLINIC_CONFIG.name} – {CLINIC_CONFIG.specialty}</p>
        <p className="mt-1">Cuidando do coração do seu filho <Heart className="inline h-3 w-3 text-destructive" /></p>
      </footer>
    </div>
  );
};

export default Index;
