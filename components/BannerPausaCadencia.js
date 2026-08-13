'use client';

// Banner fixo em toda tela enquanto public.app_config.pausar_avanco_cadencia estiver ligado
// (ex.: WhatsApp fora do ar) — marcar_enviado() continua registrando a tentativa mas não avança
// o Dia da cadência enquanto isso. Só tem botão pra DESLIGAR, de propósito (ver rota da API).
import { useEffect, useState, useCallback } from 'react';

export default function BannerPausaCadencia() {
  const [pausado, setPausado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch('/api/pausa-cadencia');
      const body = await r.json();
      if (body.ok) setPausado(!!body.pausado);
    } catch {
      // não esconde nem mostra, só não atualiza agora
    }
  }, []);

  useEffect(() => {
    carregar();
    const id = setInterval(carregar, 30000);
    return () => clearInterval(id);
  }, [carregar]);

  async function retomar() {
    setEnviando(true);
    try {
      await fetch('/api/pausa-cadencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pausar: false }),
      });
    } catch {
      window.alert('Não consegui atualizar a pausa da cadência agora.');
    }
    setEnviando(false);
    carregar();
  }

  if (!pausado) return null;

  return (
    <div className="banner-pausa-cadencia">
      <span>WhatsApp fora do ar — cadência pausada (Enviado não avança o Dia até você retomar).</span>
      <button className="btn btn-secondary" onClick={retomar} disabled={enviando}>{enviando ? 'Atualizando...' : 'Retomar cadência normal'}</button>
    </div>
  );
}
