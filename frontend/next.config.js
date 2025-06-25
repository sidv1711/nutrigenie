/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config) => {
    // Suppress dynamic `require` warnings from the Supabase realtime client
    config.ignoreWarnings = [
      /** Filter the exact warning text */
      (warning) =>
        typeof warning === 'string'
          ? warning.includes('Critical dependency: the request of a dependency is an expression') &&
            warning.includes('@supabase/realtime-js')
          : false,
    ]
    return config
  },
}
 
module.exports = nextConfig 