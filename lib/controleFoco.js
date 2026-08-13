// Helpers server-side pro sistema de "controle de foco" (Tier do dia por ociosidade).
// Toda a lógica de estado/penalidade já mora no Supabase (public.painel_atividade + as RPCs
// abaixo, criadas junto com o artefato original) — aqui só chamamos elas. Fire-and-forget de
// propósito, mesmo padrão de lib/calendario.js: nunca deve atrasar nem travar a ação que
// disparou, e falha em silêncio (o pior caso é só um tick a mais de penalidade, não é grave).
import { supabaseAdmin } from './supabaseAdmin';

export async function registrarInteracaoPainel() {
  try {
    await supabaseAdmin().rpc('registrar_interacao_painel');
  } catch {
    // silencioso de propósito
  }
}

export async function iniciarLigacaoPainel() {
  try {
    await supabaseAdmin().rpc('iniciar_ligacao_painel');
  } catch {
    // silencioso de propósito
  }
}
