import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RTooltip,
  XAxis, YAxis,
} from "recharts";
import type { BarisRiwayat } from "../../lib/types";
import { WARNA_KOMODITAS, tanggal } from "../../lib/format";
import { TableWrap, Td, Th } from "../ui";
import ChartFrame, { Legenda, Tooltip } from "./ChartFrame";

/** Indeks Mutu Fisik dari waktu ke waktu, satu garis per komoditas. */
export default function TrenIMF({ riwayat }: { riwayat: BarisRiwayat[] }) {
  const komoditas = [...new Set(riwayat.map((r) => r.komoditas_slug))].sort();

  const perTanggal = new Map<string, Record<string, number | string>>();
  for (const r of [...riwayat].sort(
    (a, b) => +new Date(a.dibuat_pada) - +new Date(b.dibuat_pada),
  )) {
    const kunci = r.dibuat_pada.slice(0, 10);
    const baris = perTanggal.get(kunci) ?? { tanggal: kunci };
    baris[r.komoditas_slug] = r.indeks_mutu_fisik;
    perTanggal.set(kunci, baris);
  }
  const data = [...perTanggal.values()];

  return (
    <ChartFrame
      kosong={
        data.length < 2
          ? "Butuh minimal dua analisis untuk menggambar tren."
          : undefined
      }
      judul="Tren mutu fisik"
      keterangan="Perubahan indeks mutu fisik (IMF) berdasarkan tanggal analisis. Nilai dihitung dari foto tanpa menggunakan estimasi perkecambahan."
      legenda={
        <Legenda
          butir={komoditas.map((k) => ({
            label: k[0].toUpperCase() + k.slice(1),
            warna: WARNA_KOMODITAS[k] ?? "var(--muted)",
          }))}
        />
      }
      tabel={
        <TableWrap>
          <thead>
            <tr>
              <Th>Tanggal</Th>
              {komoditas.map((k) => (
                <Th key={k} align="right">
                  {k}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={String(d.tanggal)}>
                <Td>{tanggal(String(d.tanggal))}</Td>
                {komoditas.map((k) => (
                  <Td key={k} num>
                    {d[k] !== undefined ? String(d[k]) : "-"}
                  </Td>
                ))}
              </tr>
            ))}
          </tbody>
        </TableWrap>
      }
    >
      <div style={{ height: 232 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 10, bottom: 4, left: -18 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis
              dataKey="tanggal"
              tickLine={false}
              axisLine={{ stroke: "var(--axis)" }}
              tickFormatter={(v: string) =>
                new Date(v).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                })
              }
              minTickGap={26}
            />
            <YAxis
              domain={[40, 100]}
              tickLine={false}
              axisLine={false}
              width={44}
              ticks={[40, 60, 80, 100]}
            />
            <RTooltip
              cursor={{ stroke: "var(--axis)", strokeWidth: 1 }}
              content={({ active, payload, label }) => (
                <Tooltip
                  aktif={active && !!payload?.length}
                  baris={[
                    { label: tanggal(String(label)), nilai: "" },
                    ...(payload ?? []).map((p) => ({
                      label: String(p.dataKey),
                      nilai: String(p.value),
                      warna: p.color,
                    })),
                  ]}
                />
              )}
            />
            {komoditas.map((k) => (
              <Line
                key={k}
                type="monotone"
                dataKey={k}
                stroke={WARNA_KOMODITAS[k] ?? "var(--muted)"}
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 0, fill: WARNA_KOMODITAS[k] }}
                activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
