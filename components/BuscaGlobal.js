'use client';

// Barra de busca fixa no header (visível em qualquer tela) — porta a "busca global" do
// artefato original: procura por nome/decisor/telefone em TODOS os leads (não só os do dia),
// mostra até 8 resultados num dropdown, e "Enter"/"ver todos" manda pra /todos com o filtro já
// aplicado. Clicar num resultado individual abre o histórico direto (via deep-link ?abrir=).
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatarTelefoneExibicao, filtrarLeadsPorTexto } from '../lib/client';

const CADENCIA_LABELS = { 1: 'Dia 1', 3: 'Dia 03', 5: 'Dia 05', 7: 'Dia 07', 10: 'Dia 10' };
const LIMITE = 8;

// Cache em memória do módulo — carrega os leads uma vez por sessão de página (reseta sozinho
// numa navegação completa), pra não bater no banco a cada tecla digitada.
let cacheLeads = null;
let cachePromise = null;

async function carregarCache() {
  if (cacheLeads) return cacheLeads;
  if (!cachePromise) {
    cachePromise = fetch('/api/todos')
      .then((r) => r.json())
      .then((body) => {
        cacheLeads = (body.ok && body.leads) || [];
        return cacheLeads;
      })
      .finally(() => { cachePromise = null; });
  }
  return cachePromise;
}

function statusLabel(l) {
  if (l.status === 'descartado') return 'Descartado';
  if (l.negocio_etapa) return l.negocio_etapa;
  if (CADENCIA_LABELS[l.etapa_dia]) return CADENCIA_LABELS[l.etapa_dia];
  return l.status || '';
}

export default function BuscaGlobal() {
  const [valor, setValor] = useState('');
  const [resultados, setResultados] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const boxRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    function aoClicarFora(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener('click', aoClicarFora);
    return () => document.removeEventListener('click', aoClicarFora);
  }, []);

  async function aoDigitar(v) {
    setValor(v);
    const alvo = v.trim();
    if (!alvo) { setAberto(false); setResultados([]); return; }

    setAberto(true);
    if (!cacheLeads) {
      setCarregando(true);
      await carregarCache();
      setCarregando(false);
    }
    setResultados(filtrarLeadsPorTexto(cacheLeads || [], alvo));
  }

  function verTodos() {
    const alvo = valor.trim();
    if (!alvo) return;
    setAberto(false);
    router.push(`/todos?busca=${encodeURIComponent(alvo)}`);
  }

  function selecionarResultado(id) {
    setAberto(false);
    router.push(`/todos?busca=${encodeURIComponent(valor.trim())}&abrir=${id}`);
  }

  function aoTeclar(e) {
    if (e.key === 'Enter') { e.preventDefault(); verTodos(); }
    else if (e.key === 'Escape') { setAberto(false); e.target.blur(); }
  }

  return (
    <div className="busca-global-box" ref={boxRef}>
      <input
        type="text"
        className="busca-global-input"
        placeholder="Buscar"
        autoComplete="off"
        value={valor}
        onChange={(e) => aoDigitar(e.target.value)}
        onKeyDown={aoTeclar}
        onFocus={() => { if (valor.trim()) setAberto(true); }}
      />
      {aberto ? (
        <div className="busca-global-resultados aberto">
          {carregando ? (
            <div className="busca-global-vazio">Buscando...</div>
          ) : resultados.length === 0 ? (
            <div className="busca-global-vazio">Nenhum lead encontrado.</div>
          ) : (
            <>
              {resultados.slice(0, LIMITE).map((l) => (
                <div key={l.id} className="busca-global-item" onClick={() => selecionarResultado(l.id)}>
                  <div className="busca-global-item-nome">
                    {l.empresa}{l.sem_whatsapp ? ' · Sem WhatsApp' : ''}
                  </div>
                  <div className="busca-global-item-sub">
                    {l.decisor || 'Sem decisor'} · {formatarTelefoneExibicao(l.telefone)} · {statusLabel(l)}
                  </div>
                </div>
              ))}
              <div className="busca-global-vertodos" onClick={verTodos}>
                {resultados.length > LIMITE ? `Ver todos os ${resultados.length} resultados` : 'Ver na aba "Todos os leads"'}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
