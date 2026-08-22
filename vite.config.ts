import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// O backend só libera http://localhost:5173 no CORS. Se a 5173 estiver ocupada,
// o Vite sobe na 5174 e TODA request falha no preflight. Duas defesas aqui:
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
          // O backend seta o cookie de sessão sem atributo Domain (o padrão
          // é o host da própria origem da resposta). Como o proxy responde
          // como se fosse http://localhost:5173, o cookie já nasce válido
          // para essa origem — não precisa reescrever nada aqui. Mantido
          // documentado porque é o primeiro lugar a olhar se o login parar
          // de "colar": cookieDomainRewrite: { '*': '' } força o cookie a
          // valer para a origem do proxy, caso o backend um dia comece a
          // setar um Domain explícito.
          cookieDomainRewrite: { '*': '' },
        },
      },
    },
  }
})
