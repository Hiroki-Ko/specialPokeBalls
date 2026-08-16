import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// base: '/' — Cloudflare Pagesはリポジトリ名のサブパスではなくドメイン直下でサイトを配信するため
// (以前のGitHub Pages向け設定 '/specialPokeBalls/' のままだと静的アセットが404し、
//  SPAフォールバックでindex.htmlが誤って返ってしまう)
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
})
