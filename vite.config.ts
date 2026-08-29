import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// O CORS do backend é restrito, então a porta do dev server importa. Se a 5173
// estiver ocupada, o Vite sobe na 5174 e TODA request falha no preflight.
// Duas defesas aqui:
//   1. strictPort: falha na hora com mensagem clara, em vez de trocar de porta
//      silenciosamente e quebrar só depois, no navegador.
//   2. proxy: em dev o front chama /api (mesma origem), e o Vite repassa para o
//      backend no servidor. Sem browser no meio, não existe CORS para falhar.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // 8080 é a porta do backend (server.port no application.properties).
  const target = env.VITE_API_URL || 'http://localhost:8080'

  // Em produção a URL da API é embutida no bundle (ver src/api/client.ts) e
  // NÃO tem default. Sem esta guarda, um build sem a variável gerava um
  // bundle apontando para http://localhost:8080 — a máquina do VISITANTE.
  // Com `withCredentials: true`, o POST /auth/login desse bundle entrega
  // e-mail e senha a qualquer processo escutando naquela porta no computador
  // dele. Falhar aqui é a diferença entre um deploy que não sai e um deploy
  // que vaza credenciais sem ninguém perceber.
  if (mode === 'production') {
    if (!env.VITE_API_URL) {
      throw new Error(
        'VITE_API_URL é obrigatória no build de produção (ver src/api/client.ts).',
      )
    }
    // http em produção significa credencial de sessão trafegando em claro, e
    // o navegador bloqueia a request como mixed content se o front for https.
    if (!/^https:\/\//i.test(env.VITE_API_URL)) {
      throw new Error(
        `VITE_API_URL deve usar https em produção (recebido: ${env.VITE_API_URL}).`,
      )
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          rewrite: (requestPath) => requestPath.replace(/^\/api/, ''),
          // O cookie é reescrito para valer na origem do proxy. Com o backend
          // local isto era só precaução (ele não manda Domain); apontando para
          // a API hospedada passa a ser necessário, porque o cookie nasce
          // válido para .squareweb.app.
          cookieDomainRewrite: { '*': '' },
          // A API hospedada responde em https e marca o cookie de sessão como
          // `Secure`, mas o proxy entrega em http://localhost:5173 — e um
          // cookie Secure não é guardado numa origem http. O navegador
          // DESCARTA em silêncio: o login devolve 200, o cookie some, e a
          // request seguinte volta 401 sem nenhum erro visível.
          // Tirar o atributo só no caminho dev/proxy resolve; nada disso
          // alcança o build de produção, que fala direto com a API em https.
          cookiePathRewrite: { '*': '/' },
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes) => {
              const cookies = proxyRes.headers['set-cookie']
              if (!cookies) return
              proxyRes.headers['set-cookie'] = cookies.map((cookie) =>
                cookie
                  .replace(/;\s*Secure/gi, '')
                  // SameSite=None sem Secure é rejeitado pelo navegador; como
                  // via proxy tudo é mesma origem, Lax é o equivalente válido.
                  .replace(/;\s*SameSite=None/gi, '; SameSite=Lax'),
              )
            })
          },
        },
      },
    },
  }
})
