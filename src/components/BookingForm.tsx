import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { CLINIC_CONFIG, getAvailableTimeSlots, buildWhatsAppMessage } from "@/lib/config";
import { format, isBefore, startOfDay, isWeekend } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, ArrowRight, Check, Clock, User, Stethoscope, CalendarDays, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";

interface BookingFormProps {
  onClose: () => void;
}

const steps = ["Paciente", "Consulta", "Horário", "Confirmação"];

const BookingForm = ({ onClose }: BookingFormProps) => {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    patientName: "",
    age: "",
    guardianName: "",
    phone: "",
    consultationType: "particular" as "particular" | "convenio",
    insuranceName: "",
    insuranceNumber: "",
  });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  // Fetch booked slots for the selected date
  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (!selectedDate) return;
      
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const { data, error } = await supabase
        .from('appointments')
        .select('time')
        .eq('date', dateStr)
        .neq('status', 'canceled');

      if (error) {
        console.error("Error fetching slots:", error);
        return;
      }

      if (data) {
        // Formato retornado pelo Postgres costuma ser HH:MM:SS, converter para HH:MM
        const formattedSlots = data.map(slot => slot.time.substring(0, 5));
        setBookedSlots(formattedSlots);
      }
    };

    fetchBookedSlots();
  }, [selectedDate]);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isStep1Valid = formData.patientName && formData.age && formData.guardianName && formData.phone;
  const isStep2Valid = formData.consultationType === "particular" || (formData.insuranceName && formData.insuranceNumber);
  const isStep3Valid = selectedDate && selectedTime;

  const canNext = [isStep1Valid, isStep2Valid, isStep3Valid, true][step];

  const availableSlots = selectedDate ? getAvailableTimeSlots(selectedDate, bookedSlots) : [];

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) return;

    setIsSubmitting(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");

      // 1. Verificar se o paciente já existe pelo telefone
      const { data: existingPatient, error: searchError } = await supabase
        .from('patients')
        .select('id')
        .eq('phone', formData.phone)
        .maybeSingle();

      if (searchError) {
        console.error("Erro ao buscar paciente:", searchError);
      }

      let patientId;

      if (existingPatient) {
        patientId = existingPatient.id;
        // Opcional: Atualizar dados do paciente existente
        await supabase
          .from('patients')
          .update({
            full_name: formData.patientName,
            age: formData.age,
            guardian_name: formData.guardianName,
          })
          .eq('id', patientId);
      } else {
        // Criar novo paciente
        const { data: newPatient, error: createError } = await supabase
          .from('patients')
          .insert({
            full_name: formData.patientName,
            age: formData.age,
            guardian_name: formData.guardianName,
            phone: formData.phone
          })
          .select()
          .single();

        if (createError) throw createError;
        patientId = newPatient.id;
      }

      // 2. Inserir agendamento
      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          patient_id: patientId,
          date: dateStr,
          time: selectedTime,
          type: formData.consultationType,
          insurance_name: formData.consultationType === 'convenio' ? formData.insuranceName : null,
          insurance_number: formData.consultationType === 'convenio' ? formData.insuranceNumber : null,
          status: 'pending'
        });

      if (appointmentError) throw appointmentError;

      // 3. Preparar mensagem WhatsApp
      const message = buildWhatsAppMessage({
        ...formData,
        date: format(selectedDate, "dd/MM/yyyy"),
        time: selectedTime,
      });

      const url = `https://wa.me/${CLINIC_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
      
      toast.success("Agendamento registrado com sucesso!", {
        description: "Você será redirecionado ao WhatsApp para confirmação final.",
      });

      // Abrir WhatsApp após pequena demora
      setTimeout(() => {
        window.open(url, "_blank");
        onClose();
      }, 1500);

    } catch (error: any) {
      console.error("DEBUG - Erro detalhado ao agendar:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
        url: import.meta.env.VITE_SUPABASE_URL ? "Configurada" : "NÃO CONFIGURADA",
        key: import.meta.env.VITE_SUPABASE_ANON_KEY ? "Configurada" : "NÃO CONFIGURADA",
      });
      
      let errorMsg = "Erro ao realizar agendamento";
      if (error.message === "Failed to fetch") {
        errorMsg = "Erro de conexão: Verifique se as chaves do Supabase na Vercel estão corretas e sem aspas.";
      }

      toast.error(errorMsg, {
        description: error.message || "Tente novamente em instantes."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepIcons = [User, Stethoscope, CalendarDays, Check];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="py-6"
    >
      <Card className="mx-auto max-w-lg shadow-card border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold">Agendar Consulta</CardTitle>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm">
              ✕
            </button>
          </div>
          {/* Progress steps */}
          <div className="mt-4 flex items-center gap-1">
            {steps.map((s, i) => {
              const Icon = stepIcons[i];
              return (
                <div key={s} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                      i <= step
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] text-muted-foreground hidden sm:block">{s}</span>
                  {i < steps.length - 1 && (
                    <div className={cn("absolute h-0.5 w-full", i < step ? "bg-primary" : "bg-muted")} />
                  )}
                </div>
              );
            })}
          </div>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {step === 0 && (
                <>
                  <div>
                    <Label htmlFor="patientName">Nome completo do paciente *</Label>
                    <Input
                      id="patientName"
                      placeholder="Nome da criança"
                      value={formData.patientName}
                      onChange={(e) => updateField("patientName", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="age">Idade *</Label>
                    <Input
                      id="age"
                      placeholder="Ex: 3 anos"
                      value={formData.age}
                      onChange={(e) => updateField("age", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="guardianName">Nome do responsável *</Label>
                    <Input
                      id="guardianName"
                      placeholder="Nome completo"
                      value={formData.guardianName}
                      onChange={(e) => updateField("guardianName", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone (WhatsApp) *</Label>
                    <Input
                      id="phone"
                      placeholder="(24) 99999-9999"
                      value={formData.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                    />
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <Label>Tipo de consulta *</Label>
                  <RadioGroup
                    value={formData.consultationType}
                    onValueChange={(v) => updateField("consultationType", v)}
                    className="gap-3"
                  >
                    <label className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors",
                      formData.consultationType === "particular" ? "border-primary bg-primary/5" : "border-border"
                    )}>
                      <RadioGroupItem value="particular" />
                      <span className="font-medium">Particular</span>
                    </label>
                    <label className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors",
                      formData.consultationType === "convenio" ? "border-primary bg-primary/5" : "border-border"
                    )}>
                      <RadioGroupItem value="convenio" />
                      <span className="font-medium">Convênio</span>
                    </label>
                  </RadioGroup>

                  <AnimatePresence>
                    {formData.consultationType === "convenio" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 overflow-hidden"
                      >
                        <div>
                          <Label htmlFor="insuranceName">Nome do convênio *</Label>
                          <Input
                            id="insuranceName"
                            placeholder="Ex: Unimed"
                            value={formData.insuranceName}
                            onChange={(e) => updateField("insuranceName", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="insuranceNumber">Número da carteirinha *</Label>
                          <Input
                            id="insuranceNumber"
                            placeholder="Número da carteirinha"
                            value={formData.insuranceNumber}
                            onChange={(e) => updateField("insuranceNumber", e.target.value)}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}

              {step === 2 && (
                <>
                  <Label>Escolha a data *</Label>
                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(d) => {
                        setSelectedDate(d);
                        setSelectedTime("");
                      }}
                      disabled={(date) =>
                        isBefore(date, startOfDay(new Date())) || isWeekend(date)
                      }
                      locale={ptBR}
                      className="rounded-lg border pointer-events-auto"
                    />
                  </div>

                  {selectedDate && (
                    <div>
                      <Label className="mb-2 block">
                        <Clock className="mr-1 inline h-4 w-4" />
                        Horários disponíveis - {format(selectedDate, "dd/MM/yyyy")}
                      </Label>
                      {availableSlots.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sem horários disponíveis nesta data.</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {availableSlots.map((slot) => (
                            <button
                              key={slot}
                              onClick={() => setSelectedTime(slot)}
                              className={cn(
                                "rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                                selectedTime === slot
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-card text-foreground hover:border-primary/50"
                              )}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {step === 3 && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
                    <h3 className="font-bold text-foreground">Resumo do Agendamento</h3>
                    <p><strong>Paciente:</strong> {formData.patientName}</p>
                    <p><strong>Idade:</strong> {formData.age}</p>
                    <p><strong>Responsável:</strong> {formData.guardianName}</p>
                    <p><strong>Telefone:</strong> {formData.phone}</p>
                    <p><strong>Tipo:</strong> {formData.consultationType === "particular" ? "Particular" : "Convênio"}</p>
                    {formData.consultationType === "convenio" && (
                      <>
                        <p><strong>Convênio:</strong> {formData.insuranceName}</p>
                        <p><strong>Carteirinha:</strong> {formData.insuranceNumber}</p>
                      </>
                    )}
                    <hr className="border-border" />
                    <p className="text-base font-semibold text-primary">
                      📅 {selectedDate && format(selectedDate, "dd/MM/yyyy")} às {selectedTime}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Ao confirmar, você será redirecionado ao WhatsApp para enviar os dados ao consultório.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation buttons */}
          <div className="mt-6 flex gap-3">
            {step > 0 && (
              <Button
                variant="outline"
                onClick={() => setStep((s) => s - 1)}
                className="flex-1"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Voltar
              </Button>
            )}
            {step < 3 ? (
              <Button
                variant="hero"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext || isSubmitting}
                className="flex-1"
              >
                Próximo
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="hero"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    Agendando...
                  </>
                ) : (
                  <>
                    <Send className="mr-1 h-4 w-4" />
                    Confirmar Agendamento
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default BookingForm;
