import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { formatCurrency } from "@/lib/currency";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
} from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

const riskDefaults: Record<string, number> = {
  conservador: 0.08,
  moderado: 0.11,
  arrojado: 0.15,
};

function toFloat(v: string | number, fallback = 0) {
  if (typeof v === "number") return v;
  const n = parseFloat((v || "").toString().replace(/\./g, "").replace(",", "."));
  return isFinite(n) ? n : fallback;
}

function pow1p(x: number, n: number) {
  return Math.pow(1 + x, n);
}

function monthlyRate(annual: number) {
  return pow1p(annual, 1 / 12) - 1;
}

export default function GoalSimulator() {
  const [risk, setRisk] = useState<"conservador" | "moderado" | "arrojado">("moderado");
  const [taxaNominalAA, setTaxaNominalAA] = useState<number>(riskDefaults["moderado"] * 100);
  const [inflacaoAA, setInflacaoAA] = useState<number>(5);
  const [inflacaoText, setInflacaoText] = useState<string>("5");
  const [valorInicial, setValorInicial] = useState<number>(0);
  const [aporteMensal, setAporteMensal] = useState<number>(2000);
  const [anos, setAnos] = useState<number>(10);
  const [anosText, setAnosText] = useState<string>("10");
  const [idadeAtual, setIdadeAtual] = useState<number>(35);

  const taxaNominalAnual = (taxaNominalAA || 0) / 100;
  const inflacaoAnual = (inflacaoAA || 0) / 100;
  const rNomM = monthlyRate(taxaNominalAnual);
  const rInfM = monthlyRate(inflacaoAnual);
  const rRealAnual = (1 + taxaNominalAnual) / (1 + inflacaoAnual) - 1;
  const rRealM = monthlyRate(rRealAnual);
  const meses = Math.max(1, Math.round(anos * 12));

  const { labels, serieNominal, serieReal, totalInvestido, fvNominal, fvReal } = useMemo(() => {
    const lbls: string[] = [];
    const sNom: number[] = [];
    const sReal: number[] = [];

    let fvNom = valorInicial;
    let fvRealTmp = valorInicial;

    for (let m = 1; m <= meses; m++) {
      fvNom = fvNom * (1 + rNomM) + aporteMensal;
      fvRealTmp = fvRealTmp * (1 + rRealM) + aporteMensal; // aporte considerado em valores "reais"
      lbls.push(`${m}`);
      sNom.push(fvNom);
      sReal.push(fvRealTmp);
    }

    const invested = valorInicial + aporteMensal * meses;
    return {
      labels: lbls,
      serieNominal: sNom,
      serieReal: sReal,
      totalInvestido: invested,
      fvNominal: sNom[sNom.length - 1] || valorInicial,
      fvReal: sReal[sReal.length - 1] || valorInicial,
    };
  }, [valorInicial, aporteMensal, meses, rNomM, rRealM]);

  const retornoNominal = fvNominal - totalInvestido;
  const retornoReal = fvReal - totalInvestido;

  const chartData: ChartData<'line', number[], string> = {
    labels,
    datasets: [
      {
        label: "Nominal",
        data: serieNominal,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.15)",
        tension: 0.2,
        pointRadius: 0,
        fill: true,
      },
      {
        label: "Real",
        data: serieReal,
        borderColor: "#10b981",
        backgroundColor: "rgba(16,185,129,0.15)",
        tension: 0.2,
        pointRadius: 0,
        fill: true,
      },
    ],
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      tooltip: { mode: "index", intersect: false },
    },
    interaction: { mode: "index", intersect: false },
    scales: {
      y: {
        ticks: {
          callback: (val: any) => formatCurrency(Number(val)),
        },
      },
      x: {
        title: { display: true, text: "Meses" },
      },
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Simulador de Acúmulo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <Label>Perfil de Risco</Label>
            <Select
              value={risk}
              onValueChange={(v: any) => {
                setRisk(v);
                const t = riskDefaults[v] ?? riskDefaults.moderado;
                setTaxaNominalAA(Math.round(t * 10000) / 100);
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="conservador">Conservador</SelectItem>
                <SelectItem value="moderado">Moderado</SelectItem>
                <SelectItem value="arrojado">Arrojado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Taxa Nominal (a.a.)</Label>
            <Input
              type="number"
              step="0.01"
              value={taxaNominalAA}
              onChange={(e) => setTaxaNominalAA(toFloat(e.target.value))}
            />
          </div>
          <div>
            <Label>Inflação (a.a.)</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={inflacaoText}
              onChange={(e) => {
                const v = e.target.value;
                setInflacaoText(v);
                setInflacaoAA(toFloat(v));
              }}
            />
          </div>
          <div>
            <Label>Idade Atual (anos)</Label>
            <Input
              type="number"
              min={0}
              value={idadeAtual}
              onChange={(e) => setIdadeAtual(Math.max(0, Math.round(toFloat(e.target.value))))}
            />
          </div>
          <div>
            <Label>Valor Inicial</Label>
            <Input
              type="number"
              step="0.01"
              value={valorInicial}
              onChange={(e) => setValorInicial(toFloat(e.target.value))}
            />
          </div>
          <div>
            <Label>Aporte Mensal</Label>
            <Input
              type="number"
              step="0.01"
              value={aporteMensal}
              onChange={(e) => setAporteMensal(toFloat(e.target.value))}
            />
          </div>
          <div>
            <Label>Tempo de Contribuição (anos)</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={anosText}
              onChange={(e) => {
                const v = e.target.value;
                setAnosText(v);
                const parsed = toFloat(v);
                setAnos(parsed > 0 ? parsed : 0.1);
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Info label="Taxa Real (a.a.)" value={`${(rRealAnual * 100).toFixed(2)}%`} />
          <Info label="Valor Total Investido" value={formatCurrency(totalInvestido)} />
          <Info label="Tempo Total Investido" value={`${Math.floor(anos)} anos${Math.round((anos % 1) * 12) ? ` e ${Math.round((anos % 1) * 12)} meses` : ''}`} />
          <Info label="Idade Atual" value={`${idadeAtual} anos`} />
          <Info label="Idade ao Final" value={`${idadeAtual + anos} anos`} />
          <Info label="Valor Nominal Final" value={formatCurrency(fvNominal)} />
          <Info label="Retorno Total Nominal" value={formatCurrency(retornoNominal)} />
          <Info label="Valor Real Final" value={formatCurrency(fvReal)} />
          <Info label="Retorno Total Real" value={formatCurrency(retornoReal)} />
        </div>

        <div className="w-full h-64 md:h-72 lg:h-80">
          <Line data={chartData} options={chartOptions} />
        </div>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 border rounded-md bg-white dark:bg-neutral-900">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
