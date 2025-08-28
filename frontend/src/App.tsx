import React, { JSX, useState } from "react";
import "./index.css";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from "chart.js";

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
);

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const META_SEMANAL = 44;

type SemanaData = { semana: string; dias: number[] };

export default function App(): JSX.Element {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [meses, setMeses] = useState<
    Array<[string, { label: string; semanas: SemanaData[] }]>
  >([]);
  const [mesSelecionado, setMesSelecionado] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function formatarDataBrasil(dataStr: string) {
    const d = new Date(dataStr);
    const dia = String(d.getDate()).padStart(2, "0");
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const ano = d.getFullYear();
    return `${dia}-${mes}-${ano}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("http://localhost:3000/ponto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, senha }),
      });

      if (!res.ok) throw new Error(`Erro ${res.status}: ${await res.text()}`);

      const json = await res.json();
      const dados: SemanaData[] = json.dados || [];

      const map = new Map<string, { label: string; semanas: SemanaData[] }>();
      dados.forEach((semanaData) => {
        const d = new Date(semanaData.semana);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
          2,
          "0"
        )}`;
        const label = d.toLocaleString("pt-BR", {
          month: "long",
          year: "numeric",
        });
        if (!map.has(key)) map.set(key, { label, semanas: [] });
        map.get(key)!.semanas.push(semanaData);
      });

      map.forEach((obj) => {
        obj.semanas.sort(
          (a, b) => new Date(b.semana).getTime() - new Date(a.semana).getTime()
        );
      });

      const arr = Array.from(map.entries()).sort(([a], [b]) =>
        a.localeCompare(b)
      );
      setMeses(arr);
      const chaves = arr.map(([k]) => k);
      if (chaves.length) setMesSelecionado(chaves[chaves.length - 1]);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-root">
      <h1>Horas Trabalhadas por Semana</h1>

      <form id="form" onSubmit={handleSubmit}>
        <input
          id="usuario"
          type="text"
          placeholder="Usuário"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          required
        />
        <input
          id="senha"
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Carregando..." : "Ver Gráficos"}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      <div id="meses">
        {loading
          ? // Meses carregando
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="skeleton"
                style={{
                  width: "80px",
                  height: "15px",
                  display: "inline-block",
                  margin: "5px",
                  borderRadius: "8px",
                }}
              />
            ))
          : // Botões reais
            meses.map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => setMesSelecionado(key)}
                className={mesSelecionado === key ? "ativo" : ""}
              >
                {label}
              </button>
            ))}
      </div>

      <div id="graficos">
        {loading
          ? // Meses carregando
            Array.from({ length: 1 }).map((_, i) => (
              <div
                key={i}
                className="semana-container skeleton"
                style={{
                  minHeight: "320px",
                  width: "95%",
                  margin: "20px auto",
                }}
              />
            ))
          : // Gráficos reais
            meses.map(([key, { semanas }]) => {
              if (key !== mesSelecionado) return null;
              return semanas.map((semanaData, i) => {
                const horasDia = semanaData.dias;
                const totalSemana = horasDia.reduce((a, b) => a + b, 0);
                const metaRestante = Math.max(META_SEMANAL - totalSemana, 0);
                const dadosGrafico = [...horasDia, metaRestante];

                const cores = dadosGrafico.map((v, idx) => {
                  if (idx < 7)
                    return v >= META_SEMANAL / 7
                      ? "rgba(54, 162, 235, 0.7)"
                      : "rgba(255, 99, 132, 0.7)";
                  return metaRestante === 0
                    ? "rgba(0, 200, 120, 0.7)"
                    : "rgba(255, 165, 0, 0.7)";
                });

                return (
                  <div className="semana-container" key={`${key}-${i}`}>
                    <h3>
                      Semana começando em:{" "}
                      {formatarDataBrasil(semanaData.semana)}
                    </h3>
                    <Bar
                      data={{
                        labels: [...DIAS_SEMANA, "Meta restante"],
                        datasets: [
                          {
                            label: "Horas",
                            data: dadosGrafico,
                            backgroundColor: cores,
                            borderRadius: 8,
                          },
                        ],
                      }}
                      options={{
                        plugins: {
                          title: {
                            display: true,
                            text: `Total da semana: ${totalSemana.toFixed(
                              2
                            )}h / ${META_SEMANAL}h`,
                            color: "#333",
                            font: { size: 16 },
                          },
                          legend: { display: false },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            suggestedMax: META_SEMANAL / 6,
                          },
                        },
                        maintainAspectRatio: true,
                      }}
                    />
                  </div>
                );
              });
            })}
      </div>
    </div>
  );
}
