import {
  CartesianGrid, ComposedChart, Line, ResponsiveContainer, Scatter,
  Tooltip as RTooltip, XAxis, YAxis, ZAxis,
} from "recharts";
import { TableWrap, Td, Th } from "../ui";
import ChartFrame, { Tooltip } from "./ChartFrame";

/**
 * Prediksi model vs hasil UKDdP sebenarnya.
 *
 * Ini grafik terpenting di seluruh aplikasi: ia satu-satunya yang menunjukkan
 * apakah estimasi boleh dipercaya. Garis 1:1 adalah pembandingnya — makin
 * rapat titik ke garis, makin baik modelnya.
 */
export default function Paritas({
  data,
  mae,
  r2,
}: {
  data: { aktual: number; prediksi: number; batch: string }[];
  mae: number;
  r2: number;
}) {
  const kosong =
    data.length === 0
      ? "Belum ada pasangan (prediksi, hasil UKDdP) untuk digambar."
      : undefined;
  const min = data.length === 0 ? 0 : Math.floor(
    Math.min(...data.flatMap((d) => [d.aktual, d.prediksi])) / 5,
  ) * 5;
  const max = data.length === 0 ? 100 : Math.ceil(
    Math.max(...data.flatMap((d) => [d.aktual, d.prediksi])) / 5,
  ) * 5;
  const garis = [
    { aktual: min, ideal: min },
    { aktual: max, ideal: max },
  ];

  return (
    <ChartFrame
      kosong={kosong}
      judul="Prediksi model vs hasil UKDdP"
      keterangan={`${data.length} lot sorgum. Garis putus-putus adalah 1:1 — kalau prediksi sempurna, semua titik jatuh persis di atasnya. MAE ${mae}, R² ${r2}.`}
      tabel={
        <TableWrap>
          <thead>
            <tr>
              <Th>Batch</Th>
              <Th align="right">UKDdP aktual</Th>
              <Th align="right">Prediksi</Th>
              <Th align="right">Selisih</Th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.batch}>
                <Td>{d.batch}</Td>
                <Td num>{d.aktual}</Td>
                <Td num>{d.prediksi}</Td>
                <Td num>{(d.prediksi - d.aktual).toFixed(1)}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      }
    >
      <div style={{ height: 288 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 8, right: 12, bottom: 22, left: 6 }}>
            <CartesianGrid stroke="var(--grid)" />
            <XAxis
              type="number"
              dataKey="aktual"
              domain={[min, max]}
              tickLine={false}
              axisLine={{ stroke: "var(--axis)" }}
              label={{
                value: "Daya berkecambah UKDdP (%)",
                position: "insideBottom",
                offset: -14,
                style: { fontSize: 11, fill: "var(--muted)" },
              }}
            />
            <YAxis
              type="number"
              dataKey="prediksi"
              domain={[min, max]}
              tickLine={false}
              axisLine={false}
              width={62}
              label={{
                value: "Prediksi (%)",
                angle: -90,
                position: "insideLeft",
                offset: -2,
                style: { fontSize: 11, fill: "var(--muted)", textAnchor: "middle" },
              }}
            />
            <ZAxis range={[46, 46]} />
            <RTooltip
              cursor={{ strokeDasharray: "3 3", stroke: "var(--axis)" }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload;
                return (
                  <Tooltip
                    aktif={active && !!p?.batch}
                    baris={
                      p?.batch
                        ? [
                            { label: "Batch", nilai: p.batch },
                            { label: "UKDdP", nilai: `${p.aktual}%` },
                            {
                              label: "Prediksi",
                              nilai: `${p.prediksi}%`,
                              warna: "var(--series-1)",
                            },
                            {
                              label: "Selisih",
                              nilai: `${(p.prediksi - p.aktual).toFixed(1)}`,
                            },
                          ]
                        : []
                    }
                  />
                );
              }}
            />
            <Line
              data={garis}
              dataKey="ideal"
              stroke="var(--axis)"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              legendType="none"
            />
            <Scatter
              data={data}
              fill="var(--series-1)"
              stroke="var(--surface)"
              strokeWidth={2}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
