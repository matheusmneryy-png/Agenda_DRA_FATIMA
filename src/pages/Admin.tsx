import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, User, Phone, CheckCircle, XCircle, Clock, RefreshCcw, Filter } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { CLINIC_CONFIG, buildWhatsAppConfirmationMessage, getAllTimeSlots } from "@/lib/config";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  date: string;
  time: string;
  type: 'particular' | 'convenio';
  insurance_name: string | null;
  insurance_number: string | null;
  status: 'pending' | 'confirmed' | 'canceled';
  patients: {
    full_name: string;
    guardian_name: string;
    age: string;
    phone: string;
  };
}

const Admin = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterDate, setFilterDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patients (*)
        `)
        .eq('date', filterDate)
        .order('time', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar agendamentos:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [filterDate]);

  const updateStatus = async (id: string, newStatus: 'confirmed' | 'canceled', appointment?: Appointment) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      setAppointments(prev => prev.map(app => 
        app.id === id ? { ...app, status: newStatus } : app
      ));
      
      toast.success(`Status atualizado para ${newStatus === 'confirmed' ? 'Confirmado' : 'Cancelado'}`);

      // Se for confirmação, abre o WhatsApp com a mensagem pronta
      if (newStatus === 'confirmed' && appointment) {
        const message = buildWhatsAppConfirmationMessage({
          patientName: appointment.patients.full_name,
          date: format(new Date(appointment.date), "dd/MM/yyyy"),
          time: appointment.time.substring(0, 5),
          consultationType: appointment.type,
          insuranceName: appointment.insurance_name
        });
        
        const phone = appointment.patients.phone.replace(/\D/g, '');
        const waUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
      }
    } catch (error: any) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      const allSlots = getAllTimeSlots();
      const dateFormatted = format(new Date(filterDate + "T12:00:00"), "dd/MM/yyyy");

      // Cabeçalho do PDF
      doc.setFontSize(18);
      doc.text(`Diário de Consultas - ${dateFormatted}`, 14, 20);
      doc.setFontSize(12);
      doc.text(`${CLINIC_CONFIG.name} - ${CLINIC_CONFIG.specialty}`, 14, 28);

      const tableData = allSlots.map(slot => {
        const app = appointments.find(a => a.time.substring(0, 5) === slot);
        if (app && app.status !== 'canceled') {
          return [
            slot,
            "OCUPADO",
            app.patients.full_name,
            app.patients.phone,
            app.type === 'particular' ? 'Particular' : `Convênio (${app.insurance_name || ''})`
          ];
        }
        return [slot, "LIVRE", "-", "-", "-"];
      });

      autoTable(doc, {
        startY: 35,
        head: [['Horário', 'Status', 'Paciente', 'Telefone', 'Tipo']],
        body: tableData,
        headStyles: { fillStyle: 'fill', fillColor: [0, 150, 200] },
      });

      doc.save(`agenda-${filterDate}.pdf`);
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed': return <Badge className="bg-green-500">Confirmado</Badge>;
      case 'canceled': return <Badge variant="destructive">Cancelado</Badge>;
      default: return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Painel de Agendamentos</h1>
            <p className="text-muted-foreground">Gerencie as consultas do consultório</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2 shadow-sm">
            <div className="flex items-center gap-2 px-2 border-r mr-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <input 
                type="date" 
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="bg-transparent text-sm focus:outline-none"
              />
            </div>
            
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Exportar Diário (PDF)
            </Button>

            <Button size="icon" variant="ghost" onClick={fetchAppointments} className="h-8 w-8 ml-auto">
              <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </header>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <RefreshCcw className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : appointments.length === 0 ? (
          <Card className="flex h-64 flex-col items-center justify-center border-dashed text-center">
            <CalendarDays className="mb-2 h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">Nenhum agendamento para esta data.</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {appointments.map((app) => (
              <Card key={app.id} className="overflow-hidden shadow-card border-l-4 border-l-primary">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    {/* Time Column */}
                    <div className="flex flex-row items-center justify-center gap-2 bg-muted/30 p-4 font-bold text-primary md:w-32 md:flex-col md:gap-0 lg:w-40">
                      <Clock className="h-4 w-4 md:mb-1 md:h-6 md:w-6" />
                      <span className="text-xl md:text-2xl">{app.time.substring(0, 5)}</span>
                    </div>

                    {/* Content Column */}
                    <div className="flex-1 p-5">
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="text-lg font-bold">{app.patients.full_name}</h3>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" /> {app.patients.age}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {app.patients.phone}
                            </span>
                            <span className="font-medium text-foreground/80">
                              Resp: {app.patients.guardian_name}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(app.status)}
                          <Badge variant="outline" className="capitalize">
                            {app.type} {app.insurance_name && `- ${app.insurance_name}`}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                        {app.status !== 'confirmed' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => updateStatus(app.id, 'confirmed', app)}
                          >
                            <CheckCircle className="mr-1 h-4 w-4" /> Confirmar
                          </Button>
                        )}
                        {app.status !== 'canceled' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-destructive hover:bg-destructive/5"
                            onClick={() => updateStatus(app.id, 'canceled')}
                          >
                            <XCircle className="mr-1 h-4 w-4" /> Cancelar
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => window.open(`https://wa.me/${app.patients.phone.replace(/\D/g, '')}`, '_blank')}
                        >
                          <Phone className="mr-1 h-4 w-4" /> WhatsApp
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
