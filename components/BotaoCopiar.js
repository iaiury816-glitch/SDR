'use client';

// Botão "Copiar" reutilizável (telefone, mensagem, etc.) — porta copyField() do artefato
// original: copia pro clipboard e mostra "Copiado!" por um instante.
import { useState, useRef } from 'react';
import { copiarTexto } from '../lib/client';

export default function BotaoCopiar({ valor, label = 'Copiar' }) {
  const [copiado, setCopiado] = useState(false);
  const timeoutRef = useRef(null);

  async function copiar() {
    if (!valor) return;
    await copiarTexto(valor);
    setCopiado(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopiado(false), 1500);
  }

  return (
    <button type="button" className={`copy-btn${copiado ? ' copied' : ''}`} onClick={copiar}>
      {copiado ? 'Copiado!' : label}
    </button>
  );
}
