'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Cabecalho from '../../components/Cabecalho';
import HistoricoModal from '../../components/HistoricoModal';
import CartaoNegocio from '../../components/CartaoNegocio';
import { chamarAcao, mensagemErro, ETAPAS_FUNIL } from '../../lib/client';

export default function Negocios() {
  const [negocios, setNegocios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroGeral, setErroGeral] = useState('');
  const [historicoLeadId, setHistoricoLeadId] = useState(null);
  const [colunaSobre, setColunaSobre] = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroGeral('');
    try {
      const r = await fetch('/api/negocios');
      const body = await r.json();
      if (!body.ok) throw new Error(body.erro);
      setNegocios(body.negocios || []);
    } catch (e) {
      setErroGeral('Não consegui carregar os negócios. ' + ((e && e.message) || ''));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const porEtapa = useMemo(() => {
    const mapa = {};
    ETAPAS_FUNIL.forEach((et) => { mapa[et] = []; });
    negocios.forEach((n) => { if (mapa[n.etapa]) mapa[n.etapa].push(n); });
    return mapa;
  }, [negocios]);

  async function aoSoltar(e, etapa) {
    e.preventDefault();
    setColunaSobre(null);
    const negocioId = e.dataTransfer.getData('text/plain');
    if (!negocioId) return;
    const negocio = negocios.find((n) => n.negocio_id === negocioId);
    if (!negocio || negocio.etapa === etapa) return;
    try {
      await chamarAcao('mover-etapa', { negocioId, etapa });
      carregar();
    } catch (err) {
      window.alert(mensagemErro(err, 'Não consegui mover o negócio agora. Tenta de novo em alguns segundos.'));
    }
  }

  return (
    <div>
      <Cabecalho
        titulo="Painel SDR — Legare Gestão"
        sub={`Negócios · ${negocios.length} no funil`}
        acoes={<button className="btn" onClick={carregar}>Atualizar</button>}
      />

      <div className="container container-larga">
        {erroGeral ? <div className="aviso" style={{ marginBottom: 14 }}>{erroGeral}</div> : null}

        {carregando ? (
          <div className="loading">Carregando...</div>
        ) : (
          <div className="kanban-board">
            {ETAPAS_FUNIL.map((etapa) => (
              <div
                key={etapa}
                className={`kanban-coluna${colunaSobre === etapa ? ' kanban-coluna-sobre' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setColunaSobre(etapa); }}
                onDragLeave={() => setColunaSobre((c) => (c === etapa ? null : c))}
                onDrop={(e) => aoSoltar(e, etapa)}
              >
                <div className="kanban-coluna-titulo">{etapa} ({porEtapa[etapa].length})</div>
                {porEtapa[etapa].length === 0 ? (
                  <div className="empty">Nenhum negócio aqui.</div>
                ) : (
                  porEtapa[etapa].map((negocio) => (
                    <CartaoNegocio
                      key={negocio.negocio_id}
                      negocio={negocio}
                      onMudou={carregar}
                      onAbrirHistorico={setHistoricoLeadId}
                      arrastavel
                    />
                  ))
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {historicoLeadId ? (
        <HistoricoModal
          leadId={historicoLeadId}
          onClose={() => setHistoricoLeadId(null)}
          onLeadMudou={carregar}
        />
      ) : null}
    </div>
  );
}
