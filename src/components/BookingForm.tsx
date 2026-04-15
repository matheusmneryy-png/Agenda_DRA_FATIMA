import { useState, useEffect } from "react";
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
  const [whatsappUrl, setWhatsappUrl] = useState<string>("");
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Busca os horários já agendados para a data selecionada
  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (!selectedDate) return;

      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("appointments")
        .select("time")
        .eq("date", dateStr)
        .neq("status", "canceled");

      if (error) {
        console.error("Error fetching slots:", error);
        return;
      }

      if (data) {
        // Postgres retorna HH:MM:SS, converter para HH:MM
        const formattedSlots = data.map((slot) => slot.time.substring(0, 5));
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
        .from("patients")
        .select("id")
        .eq("phone", formData.phone)
        .maybeSingle();

      if (searchError) {
        console.error("Erro ao buscar paciente:", searchError);
      }

      let patientId;

      if (existingPatient) {
        patientId = existingPatient.id;
        await supabase
          .from("patients")
          .update({
            full_name: formData.patientName,
            age: formData.age,
            guardian_name: formData.guardianName,
          })
          .eq("id", patientId);
      } else {
        const { data: newPatient, error: createError } = await supabase
          .from("patients")
          .insert({
            full_name: formData.patientName,
            age: formData.age,
            guardian_name: formData.guardianName,
            phone: formData.phone,
          })
          .select()
          .single();

        if (createError) throw createError;
        patientId = newPatient.id;
      }

      // 2. Inserir agendamento
      const { error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          patient_id: patientId,
          date: dateStr,
          time: selectedTime,
          type: formData.consultationType,
          insurance_name: formData.consultationType === "convenio" ? formData.insuranceName : null,
          insurance_number: formData.consultationType === "convenio" ? formData.insuranceNumber : null,
          status: "pending",
        });

      if (appointmentError) throw appointmentError;

      // ✅ Atualizar lista de slots ocupados imediatamente (horário some da tela)
      setBookedSlots((prev) => [...prev, selectedTime]);

      // ✅ Gerar URL do WhatsApp e salvar no estado
      const message = buildWhatsAppMessage({
        ...formData,
        date: format(selectedDate, "dd/MM/yyyy"),
        time: selectedTime,
      });
      const url = `https://wa.me/${CLINIC_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
      setWhatsappUrl(url);

      // ✅ Mostrar tela de sucesso com link <a> nativo (única forma confiável no iPhone/Safari)
      setBookingSuccess(true);

      toast.success("Agendamento registrado com sucesso!");
    } catch (error: any) {
      console.error("Erro detalhado ao agendar:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
        urlMissing: !import.meta.env.VITE_SUPABASE_URL,
        keyMissing: !import.meta.env.VITE_SUPABASE_ANON_KEY,
      });

      let errorMsg = "Erro ao realizar agendamento";
      const isNetworkError = error.message?.includes("Failed to fetch") || error.name === "TypeError";

      if (isNetworkError) {
        errorMsg = "Erro de conexão: Não foi possível alcançar o servidor do Supabase.";
      }

      toast.error(errorMsg, {
        description: isNetworkError
          ? "Verifique sua internet ou se o projeto Supabase está ativo. Se estiver no Vercel, confira as chaves API."
          : error.message || "Tente novamente em instantes.",
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
          {!bookingSuccess && (
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
          )}
        </CardHeader>

        <CardContent>
          {bookingSuccess ? (
            // ✅ TELA DE SUCESSO
            // Usa <a href> nativo — Safari/iOS NUNCA bloqueia toque em âncora real.
            // window.open() em funções async é bloqueado no Safari mesmo antes de await.
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-5 py-4 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Agendamento Confirmado! 🎉</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Toque no botão abaixo para enviar os dados pelo WhatsApp e finalizar sua reserva.
                </p>
              </div>

              {/* Link <a> nativo — funciona em iPhone, Android, desktop sem bloqueio */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 px-6 py-4 text-base font-bold text-white shadow-lg active:scale-95 transition-transform"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.557 4.126 1.532 5.86L.057 23.5l5.78-1.516A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.006-1.373l-.36-.214-3.43.9.916-3.338-.235-.374A9.818 9.818 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z" />
                </svg>
                Abrir WhatsApp
              </a>

              <button
                onClick={onClose}
                className="text-sm text-muted-foreground underline underline-offset-2"
              >
                Fechar
              </button>
            </motion.div>
          ) : (
            // FLUXO NORMAL DE AGENDAMENTO
            <>
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Step 0 — Dados do paciente */}
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

                  {/* Step 1 — Tipo de consulta */}
                  {step === 1 && (
                    <>
                      <Label>Tipo de consulta *</Label>
                      <RadioGroup
                        value={formData.consultationType}
                        onValueChange={(v) => updateField("consultationType", v)}
                        className="gap-3"
                      >
                        <label
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors",
                            formData.consultationType === "particular"
                              ? "border-primary bg-primary/5"
                              : "border-border"
                          )}
                        >
                          <RadioGroupItem value="particular" />
                          <span className="font-medium">Particular</span>
                        </label>
                        <label
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors",
                            formData.consultationType === "convenio"
                              ? "border-primary bg-primary/5"
                              : "border-border"
                          )}
                        >
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

                  {/* Step 2 — Data e horário */}
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
                            <p className="text-sm text-muted-foreground">
                              Sem horários disponíveis nesta data.
                            </p>
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

                  {/* Step 3 — Confirmação */}
                  {step === 3 && (
                    <div className="space-y-3">
                      <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
                        <h3 className="font-bold text-foreground">Resumo do Agendamento</h3>
                        <p>
                          <strong>Paciente:</strong> {formData.patientName}
                        </p>
                        <p>
                          <strong>Idade:</strong> {formData.age}
                        </p>
                        <p>
                          <strong>Responsável:</strong> {formData.guardianName}
                        </p>
                        <p>
                          <strong>Telefone:</strong> {formData.phone}
                        </p>
                        <p>
                          <strong>Tipo:</strong>{" "}
                          {formData.consultationType === "particular" ? "Particular" : "Convênio"}
                        </p>
                        {formData.consultationType === "convenio" && (
                          <>
                            <p>
                              <strong>Convênio:</strong> {formData.insuranceName}
                            </p>
                            <p>
                              <strong>Carteirinha:</strong> {formData.insuranceNumber}
                            </p>
                          </>
                        )}
                        <hr className="border-border" />
                        <p className="text-base font-semibold text-primary">
                          📅 {selectedDate && format(selectedDate, "dd/MM/yyyy")} às {selectedTime}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        Ao confirmar, você será redirecionado ao WhatsApp para enviar os dados ao
                        consultório.
                      </p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Botões de navegação */}
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
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default BookingForm;
