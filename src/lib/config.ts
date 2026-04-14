// Configurações do consultório - facilmente editáveis
export const CLINIC_CONFIG = {
  name: "Dra. Fátima Casal",
  specialty: "Cardiopediatra",
  // Número do WhatsApp para receber agendamentos (formato internacional)
  whatsappNumber: "5524999712123",
  // Horários de funcionamento
  workingHours: {
    start: 8.5, // 08:30
    end: 17,    // 17:00
    lunchStart: 12, // 12:00
    lunchEnd: 13,   // 13:00
  },
  // Duração da consulta em minutos
  appointmentDuration: 30,
};

export function getAvailableTimeSlots(date: Date, bookedSlots: string[]): string[] {
  const { start, end, lunchStart, lunchEnd } = CLINIC_CONFIG.workingHours;
  const duration = CLINIC_CONFIG.appointmentDuration;
  const slots: string[] = [];

  let current = start;
  while (current < end) {
    if (current >= lunchStart && current < lunchEnd) {
      current = lunchEnd;
      continue;
    }
    const hours = Math.floor(current);
    const minutes = Math.round((current - hours) * 60);
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    
    if (!bookedSlots.includes(timeStr)) {
      slots.push(timeStr);
    }
    current += duration / 60;
  }

  return slots;
}

export function formatPhoneForWhatsApp(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function buildWhatsAppMessage(data: {
  patientName: string;
  age: string;
  guardianName: string;
  phone: string;
  consultationType: string;
  insuranceName?: string;
  insuranceNumber?: string;
  date: string;
  time: string;
}): string {
  let msg = `🏥 *Novo Agendamento - ${CLINIC_CONFIG.name}*\n\n`;
  msg += `👶 *Paciente:* ${data.patientName}\n`;
  msg += `📅 *Idade:* ${data.age}\n`;
  msg += `👤 *Responsável:* ${data.guardianName}\n`;
  msg += `📱 *Telefone:* ${data.phone}\n\n`;
  msg += `💼 *Tipo:* ${data.consultationType === 'particular' ? 'Particular' : 'Convênio'}\n`;
  
  if (data.consultationType === 'convenio' && data.insuranceName) {
    msg += `🏢 *Convênio:* ${data.insuranceName}\n`;
    msg += `💳 *Carteirinha:* ${data.insuranceNumber}\n`;
  }
  
  msg += `\n📅 *Data:* ${data.date}\n`;
  msg += `⏰ *Horário:* ${data.time}\n`;
  
  return msg;
}
