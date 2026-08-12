# Byou — frontend de streaming

Interface web da Streaming API (Spring Boot). React 19 + Vite + TypeScript +
Tailwind 4, integrada à API real — não há dados falsos no projeto.

## Rodando

```bash
npm install
npm run dev          # http://localhost:5173
```

O backend precisa estar no ar (com MySQL, Redis e MinIO). Em desenvolvimento as
chamadas passam pelo **proxy do Vite**: o front pede `/api/...` na própria
origem e o Vite repassa para a API, então **não há CORS no caminho** — trocar a
porta do dev server não quebra nada.

O destino do proxy é `VITE_API_URL` (padrão `http://localhost:8080`, que é o
`server.port` do backend). Copie `.env.example` para `.env` para mudar — confira
o `Tomcat started on port ...` no log do Spring se estiver em dúvida.

> **Porta do front:** fixada em 5173 com `strictPort`. Se estiver ocupada, o
> Vite falha na hora dizendo isso, em vez de subir em 5174 — a porta 5173 é a
> única liberada no CORS do backend, e o build de produção depende disso.

> **Bucket do MinIO** (`byou-stream-bucket`) precisa existir, senão o upload
> falha com 500. Ver a seção de infraestrutura em `PENDENCIAS.md`.

```bash
npm run build        # tsc -b && vite build
npm run typecheck
npm run lint
```

## Estrutura

```
src/
  api/          client.ts (axios + cookie + erros), services.ts (rotas), types.ts (DTOs)
  components/
    auth/       RouteGuards, AuthShell
    layout/     AppLayout, Header, Sidebar (rail), BottomNav
    ui/         Button, Input, Modal, Alert, ... (primitivos sem regra de negócio)
    video/      VideoCard, HeroVideo, VideoPlayer, CommentSection
  context/      AuthContext (sessão via /auth/me), ThemeContext, ToastContext
  hooks/        um por recurso, em cima do TanStack Query
  lib/          validation.ts (zod), video.ts, featured.ts, format.ts, cn.ts
  pages/        uma por rota
```

## Segurança no cliente

O backend é a autoridade — ele valida a assinatura do JWT e aplica os papéis a
cada request. O frontend replica essas regras para não abrir telas que
resultariam em 403, e para falhar de forma explicada em vez de silenciosa.

- **Sessão em cookie `HttpOnly`**: o token vive no cookie `byou_session`, que o
  backend define no login e o navegador reenvia sozinho. O front **nunca lê nem
  guarda o token** — é o ponto do `HttpOnly`: nem um script malicioso injetado
  via XSS consegue ler. `withCredentials: true` é o que faz o cookie viajar.
- **Quem está logado vem do servidor**: como o token não é legível, o front
  pergunta em `GET /auth/me` (no boot, no login e no registro). Não existe mais
  decodificação de JWT no cliente — logo, não existe sessão forjável no
  navegador.
- **CSRF**: o axios já ecoa o cookie `XSRF-TOKEN` no header `X-XSRF-TOKEN`
  (`xsrfCookieName`/`xsrfHeaderName`). Necessário porque cookie automático é
  vulnerável a CSRF, diferente de Bearer em header. **Atenção:** hoje o backend
  não emite esse cookie, o que bloqueia todas as escritas — ver `PENDENCIAS.md`.
- **Guards de rota** (`components/auth/RouteGuards.tsx`) espelham o
  `SecurityConfig`: sem sessão vai para `/login` guardando o destino; com sessão
  mas sem o papel necessário vai para `/403` com a explicação do motivo. Vale
  igualmente para URL colada direto no navegador.
- **Validação de formulário** com zod (`lib/validation.ts`): além dos limites de
  tamanho, remove caracteres de controle, aceita apenas URLs `http(s)` (barrando
  `javascript:`/`data:`) e restringe o nome de categoria, que vai na URL.
- **Upload**: tipo e tamanho conferidos antes de enviar (o backend revalida o
  conteúdo com Apache Tika).
- **Sem `dangerouslySetInnerHTML`** em nenhum ponto: todo texto vindo da API é
  renderizado como conteúdo, então o React escapa.
- **Mensagens de erro** não vazam informação: e-mail inexistente e senha errada
  produzem a mesma resposta na tela, evitando enumeração de usuários.

## Estado da integração

Todas as rotas disponíveis estão ligadas, e **toda leitura funciona**: feed,
página de vídeo, comentários, categorias, perfil, listagem de usuários.

**Nenhuma escrita funciona hoje** — comentar, curtir, enviar vídeo, editar
perfil e até sair respondem 403. A causa é de backend: a proteção CSRF está
ativa, mas o servidor nunca emite o cookie `XSRF-TOKEN` que a destravaria.

Também fora do ar: reprodução de vídeo (falta `videoUrl` na resposta) e
publicar/tornar privado (`PATCH /video/update/status` responde 500 mesmo com id
válido).

**O diagnóstico completo de cada interação — o que funciona, o que não, por que,
e como corrigir — está em [PENDENCIAS.md](PENDENCIAS.md).**
