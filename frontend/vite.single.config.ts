/**
 * Build alternatif: seluruh aplikasi dijadikan SATU berkas HTML.
 *
 * Berguna untuk membagikan situs sebagai laporan — cukup kirim satu berkas,
 * bisa dibuka langsung dari disk tanpa server. Mode demo otomatis aktif
 * karena tidak ada backend yang bisa dihubungi.
 */
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: {
    outDir: "dist-tunggal",
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 100_000,
  },
});
