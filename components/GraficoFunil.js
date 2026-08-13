'use client';

// Gráfico de barras horizontais (Chart.js) do funil de conversão, com degradê da cor de marca -
// mais escura na primeira etapa (mais leads), mais clara na última. Portado de
// desenharGraficoFunil() do artefato original.
import { useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import { ETAPAS_METRICAS } from '../lib/tiers';

const CORES = ['#4338ca', '#4f39c7', '#6952d1', '#7661d5', '#8470da', '#9e8de3', '#b8aaec', '#d3c7f5'];

export default function GraficoFunil({ m }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const labels = ETAPAS_METRICAS.map((e) => e.label);
    const valores = ETAPAS_METRICAS.map((e) => (m && m[e.key]) || 0);

    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(canvasRef.current.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{ data: valores, backgroundColor: CORES, borderRadius: 6, barThickness: 22 }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { precision: 0 } },
          y: { grid: { display: false } },
        },
      },
    });

    return () => {
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    };
  }, [m]);

  return (
    <div className="funil-grafico-wrap">
      <canvas ref={canvasRef} />
    </div>
  );
}
