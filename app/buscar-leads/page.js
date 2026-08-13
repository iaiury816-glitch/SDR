'use client';

// Aba "Buscar leads": dispara o workflow de sourcing (Google Maps via Apify) direto do painel,
// sem precisar abrir o n8n. Porta abrirSourcing/renderSourcing/dispararSourcing do artefato
// original.
import { useEffect, useState, useCallback } from 'react';
import Cabecalho from '../../components/Cabecalho';
import { formatarDataHora } from '../../lib/client';

export default function BuscarLeads() {
  const [ultimo, setUltimo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [disparando, setDisparando] = useState(false);
  const [erroGeral, setErroGeral] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroGeral('');
    try {
      const r = await fetch('/api/sourcing');
      const body = await r.json();
      if (!body.ok) throw new Error(body.erro);
      setUltimo(body.ultimo);
    } catch (e) {
      setErroGeral('Não consegui carregar o histórico de disparos. ' + ((e && e.message) || ''));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function disparar() {
    setDisparando(true);
    let erroMsg = null;
    try {
      const r = await fetch('/api/sourcing', { method: 'POST' });
      const body = await r.json();
      if (!body.ok) throw new Error(body.erro);
      const resultado = body.resultado || {};
      if (!resultado.sucesso) erroMsg = resultado.erro || 'Erro desconhecido';
    } catch (e) {
      erroMsg = 'Não consegui chamar a function agora. Tenta de novo em alguns segundos.';
    }
    if (erroMsg) window.alert('Não consegui disparar o sourcing:\n\n' + erroMsg);
    setDisparando(false);
    await carregar();
  }

  return (
    <div>
      <Cabecalho titulo="Painel SDR — Legare Gestão" sub="Buscar leads" />

      <div className="container">
        {erroGeral ? <div className="aviso" style={{ marginBottom: 14 }}>{erroGeral}</div> : null}

        <div className="sourcing-wrap">
          <div className="sourcing-card">
            <p>Dispara o workflow &quot;SDR - Sourcing completo&quot; direto daqui: busca no Google Maps, filtra rede/franquia, tenta achar o decisor e já deixa a mensagem pronta — tudo numa rodada só, sem precisar abrir o n8n.</p>
            <p>A cada disparo, ele avança sozinho pra próxima região da lista (round-robin entre bairros de Fortaleza e municípios da RMF), então não repete sempre a mesma área.</p>
            <p className="sourcing-aviso">Leva alguns minutos pra rodar até o fim — os leads novos aparecem em &quot;Tarefas do dia&quot; quando terminar. Cada disparo consome créditos do Apify, então evite clicar mais de uma vez seguida.</p>

            <button className="btn btn-agendor" onClick={disparar} disabled={disparando}>
              {disparando ? 'Disparando...' : 'Buscar novos leads agora'}
            </button>

            {carregando ? (
              <div className="sourcing-status"><div className="field-value vazio">Carregando...</div></div>
            ) : ultimo ? (
              <div className={`sourcing-status ${ultimo.erro ? 'erro' : 'ok'}`}>
                <div className="field-label">Último disparo</div>
                <div className="field-value">
                  {formatarDataHora(ultimo.disparado_em)}{ultimo.erro ? ' · falhou' : ' · disparado com sucesso'}
                </div>
                {ultimo.erro ? <div className="sourcing-erro-detalhe">{ultimo.erro}</div> : null}
              </div>
            ) : (
              <div className="sourcing-status"><div className="field-value vazio">Nenhum disparo registrado ainda.</div></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
