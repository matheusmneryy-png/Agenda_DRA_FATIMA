import { motion } from "framer-motion";
import heroDoctor from "@/assets/hero-doctor.png";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";

interface HeroSectionProps {
  onStartBooking: () => void;
}

const HeroSection = ({ onStartBooking }: HeroSectionProps) => {
  return (
    <section className="relative overflow-hidden">
      <div className="container mx-auto px-4 py-10 md:py-20">
        <div className="flex flex-col items-center gap-8 md:flex-row md:gap-14">
          {/* Text */}
          <motion.div
            className="flex-1 text-center md:text-left"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <h2 className="text-3xl font-extrabold leading-tight text-foreground md:text-4xl lg:text-5xl">
              Cuidando do{" "}
              <span className="hero-gradient-text">coração</span>{" "}
              do seu filho
            </h2>
            <p className="mt-4 text-base text-muted-foreground md:text-lg max-w-md mx-auto md:mx-0">
              Agende sua consulta de forma rápida e simples. Atendimento com carinho e profissionalismo.
            </p>
            <Button
              variant="hero"
              size="lg"
              className="mt-8 hero-btn"
              onClick={onStartBooking}
            >
              <CalendarDays className="mr-2 h-5 w-5" />
              Agendar Consulta
            </Button>
          </motion.div>

          {/* Doctor image — softer, no heavy rings */}
          <motion.div
            className="flex-1 flex justify-center"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          >
            <div className="relative">
              {/* Soft ambient glow only — no visible circle */}
              <div className="absolute inset-0 rounded-[40%] bg-gradient-to-tr from-primary/30 to-accent/20 blur-3xl scale-110 opacity-60" />

              {/* Photo with soft rounded shape */}
              <div className="relative h-72 w-72 md:h-80 md:w-80 overflow-hidden rounded-[38%] shadow-soft ring-1 ring-white/20 bg-white/5 backdrop-blur-sm">
                <img
                  src={heroDoctor}
                  alt="Dra. Fátima Casal - Cardiopediatra"
                  className="h-full w-full object-cover scale-110 translate-y-1"
                />
                {/* Subtle bottom fade */}
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background/40 to-transparent" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
