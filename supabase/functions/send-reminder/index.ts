import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Buscar agendamentos que ocorrem amanhã
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().split('T')[0]

    const { data: appointments, error } = await supabaseClient
      .from('appointments')
      .select('*, patients(*)')
      .eq('date', dateStr)
      .eq('status', 'pending')

    if (error) throw error

    console.log(`Encontrados ${appointments.length} agendamentos para lembrete.`)

    for (const app of appointments) {
      const patientPhone = app.patients.phone.replace(/\D/g, '')
      const message = `Olá! Relembramos sua consulta com a Dra. Fátima Casal amanhã (${formatDate(app.date)}) às ${app.time.substring(0, 5)}. Confirma presença? Responda SIM ou NÃO.`
      
      // Aqui você integraria com a API de sua escolha (ex: Evolution API, Z-API, Whapi)
      // Exemplo genérico de chamada POST:
      /*
      await fetch('URL_DA_SUA_API', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': 'SUA_CHAVE' },
        body: JSON.stringify({ number: patientPhone, message })
      })
      */
      
      console.log(`Lembrete preparado para ${patientPhone}: ${message}`)
    }

    return new Response(JSON.stringify({ success: true, count: appointments.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}
