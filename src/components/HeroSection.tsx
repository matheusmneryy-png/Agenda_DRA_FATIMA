import { motion } from "framer-motion";
import heroDoctor from "@/assets/hero-doctor.jpg";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";

interface HeroSectionProps {
  onStartBooking: () => void;
}

const HeroSection = ({ onStartBooking }: HeroSectionProps) => {
  return (
    <section className="relative overflow-hidden gradient-hero">
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="flex flex-col items-center gap-6 md:flex-row md:gap-12">
          <motion.div
            className="flex-1 text-center md:text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-extrabold leading-tight text-foreground md:text-4xl lg:text-5xl">
              Cuidando do{" "}
              <span className="text-primary">coração</span>{" "}
              do seu filho
            </h2>
            <p className="mt-4 text-base text-muted-foreground md:text-lg">
              Agende sua consulta de forma rápida e simples. Atendimento com carinho e profissionalismo.
            </p>
            <Button
              variant="hero"
              size="lg"
              className="mt-6"
              onClick={onStartBooking}
            >
              <CalendarDays className="mr-2 h-5 w-5" />
              Agendar Consulta
            </Button>
          </motion.div>
          <motion.div
            className="flex-1 flex justify-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="relative group">
              {/* Background Glow */}
              <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-primary to-accent opacity-20 blur-2xl group-hover:opacity-30 transition-opacity" />
              
              {/* Circular Container for the Image */}
              <div className="relative h-72 w-72 md:h-80 md:w-80 overflow-hidden rounded-full border-4 border-white shadow-soft bg-white">
                <img
                  src={heroDoctor}
                  alt="Dra. Fátima Casal - Cardiopediatra"
                  className="h-full w-full object-cover scale-110 translate-y-1 relative z-10"
                />
              </div>

              {/* Decorative elements */}
              <div className="absolute -bottom-2 -right-2 h-12 w-12 rounded-full bg-accent/20 blur-xl" />
              <div className="absolute -top-4 -left-4 h-16 w-16 rounded-full bg-primary/10 blur-xl" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
