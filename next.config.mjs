/** @type {import('next').NextConfig} */
const nextConfig = {
<<<<<<< HEAD
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["100.91.219.27:9000", "localhost:3000"]
    }
  }
};

export default nextConfig;
=======
  experimental: {
    allowedDevOrigins: ["100.91.219.27"]
  },
};
>>>>>>> dc61f11 (.)
