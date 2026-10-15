import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // AVIF custa segundos de CPU por imagem no primeiro request e esta página
    // carrega ~20 fotografias. WebP entrega quase o mesmo peso sem o custo.
    formats: ["image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
};

export default nextConfig;
