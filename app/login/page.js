'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      const r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha }),
      });
      const body = await r.json();
      if (!body.ok) {
        setErro(body.erro || 'Não consegui entrar.');
        setCarregando(false);
        return;
      }
      window.location.href = '/';
    } catch {
      setErro('Erro de conexão. Tenta de novo.');
      setCarregando(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-box" onSubmit={entrar}>
        <h1>Painel SDR — Legare</h1>
        <p>Acesso restrito.</p>
        {erro ? <div className="login-erro">{erro}</div> : null}
        <input
          className="login-input"
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoFocus
        />
        <button className="btn btn-primary" type="submit" disabled={carregando} style={{ width: '100%' }}>
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
