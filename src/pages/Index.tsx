import { useState, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import BookingForm from "@/components/BookingForm";
import ParticleBackground from "@/components/ParticleBackground";
import { Heart, Phone, Clock } from "lucide-react";
import { CLINIC_CONFIG } from "@/lib/config";

const Index = () => {
  const [showBooking, setShowBooking] = useState(false);
  const bookingRef = useRef<HTMLDivElement>(null);

  const handleStartBooking = () => {
    setShowBooking(true);
    setTimeout(() => bookingRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Particle background always visible */}
      <ParticleBackground />

      {/* Main content above particles */}
      <div className="relative z-10">
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
              <div className="info-card">
                <div className="info-card-icon text-primary">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Horário</h3>
                  <p className="text-sm text-muted-foreground">Seg a Sex, 08:30 – 17:00</p>
                </div>
              </div>
              <div className="info-card">
                <div className="info-card-icon text-accent">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Contato</h3>
                  <p className="text-sm text-muted-foreground">(24) 99971-2123</p>
                </div>
              </div>
              <div className="info-card">
                <div className="info-card-icon text-primary">
                  <Heart className="h-5 w-5" />
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
        <footer className="border-t border-border/40 bg-card/60 backdrop-blur-sm py-6 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {CLINIC_CONFIG.name} – {CLINIC_CONFIG.specialty}</p>
          <p className="mt-1">Cuidando do coração do seu filho <Heart className="inline h-3 w-3 text-destructive" /></p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
