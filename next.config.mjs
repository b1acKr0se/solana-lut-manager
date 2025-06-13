const nextConfig = {
  output: 'export', // Enable static exports for GitHub Pages
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true, // Required for static export
  },
  // Ensure the app works with GitHub Pages
  basePath: process.env.NODE_ENV === 'production' ? '/solana-lut-manager' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/solana-lut-manager/' : '',
};

export default nextConfig;
