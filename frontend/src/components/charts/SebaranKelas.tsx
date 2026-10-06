import {
  Bar, BarChart, Cell, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from "recharts";
import { KELAS_STATUS } from "../../lib/format";
import { TableWrap, Td, Th } from "../ui";
import ChartFrame, { Tooltip } from "./ChartFrame";

const URUTAN = [
  "Sangat Baik", "Baik", "Sedang", "Rendah",
  "Tidak memenuhi ambang edar", "Belum dapat dinilai",
];

export default function SebaranKelas({
  sebaran,
}: {
  sebaran: Record<string, number>;
}) {
  const total = Object.values(sebaran).reduce((a, b) => a + b, 0) || 1;
  const data = URUTAN.filter((k) => sebaran[k]).map((k) => ({
    kelas: k,
    jumlah: sebaran[k],
    persen: +((sebaran[k] / total) * 100).toFixed(1),
    warna: KELAS_STATUS[k]?.warna ?? "var(--muted)",
  }));

  return (
    <ChartFrame
      kosong={
        data.length === 0
          ? "Belum ada analisis. Grafik ini terisi setelah lot pertama dianalisis."
          : undefined
      }
      judul="Sebaran kelas mutu"
      keterangan={`${total} analisis. Status "Belum dapat dinilai" berarti estimasi yang diperlukan untuk skor akhir belum layak digunakan.`}
      tabel={
        <TableWrap>
          <thead>
            <tr>
              <Th>Kelas</Th>
              <Th align="right">Jumlah</Th>
              <Th align="right">Persen</Th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.kelas}>
                <Td>{d.kelas}</Td>
                <Td num>{d.jumlah}</Td>
                <Td num>{d.persen}%</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      }
    >
      <div style={{ height: Math.max(140, data.length * 38) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 34, bottom: 4, left: 0 }}
            barCategoryGap="26%"
          >
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis
              type="category"
              dataKey="kelas"
              width={122}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11.5 }}
            />
            <RTooltip
              cursor={{ fill: "var(--surface-2)" }}
              content={({ active, payload }) => (
                <Tooltip
                  aktif={active && !!payload?.length}
                  baris={
                    payload?.length
                      ? [
                          {
                            label: String(payload[0].payload.kelas),
                            nilai: `${payload[0].payload.jumlah} (${payload[0].payload.persen}%)`,
                            warna: payload[0].payload.warna,
                          },
                        ]
                      : []
                  }
                />
              )}
            />
            <Bar
              dataKey="jumlah"
              radius={[0, 4, 4, 0]}
              isAnimationActive={false}
              label={{
                position: "right",
                fill: "var(--ink-2)",
                fontSize: 11.5,
                fontFamily: "var(--font-mono)",
              }}
            >
              {data.map((d) => (
                <Cell key={d.kelas} fill={d.warna} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
