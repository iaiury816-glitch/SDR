// Integração com o Google Calendar via n8n. O workflow "Criar Evento Calendario -
// Tarefas SDR" no n8n (webhook -> Google Calendar node) cria o evento de fato;
// aqui só disparamos a chamada. Best-effort: se o n8n estiver fora do ar ou o
// webhook falhar, isso NÃO deve derrubar a criação da tarefa/negócio no Supabase
// — por isso engolimos qualquer erro e só logamos no servidor.
export async function criarEventoCalendario({ empresa, decisor, telefone, texto, quando }) {
  const webhookUrl = process.env.N8N_WEBHOOK_CALENDARIO_URL;
  if (!webhookUrl || !quando) return;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empresa, decisor, telefone, texto, quando }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch (e) {
    console.error('Falha ao criar evento no Google Calendar (n8n):', (e && e.message) || e);
  }
}
