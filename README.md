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
- **`safeExternalUrl` exige URL absoluta**: usada antes de qualquer valor da API
  ir para `src`/`href`. Não resolve mais contra `window.location.origin`, porque
  com base um caminho relativo (`/x`) virava URL da própria origem e uma URL
  protocol-relative (`//evil.com/x`) era promovida a `https://evil.com/x` sem
  aviso. Os quatro pontos de uso recebem sempre URL absoluta.
- **Visibilidade centralizada** em `isPubliclyVisible`/`publicVideos`
  (`lib/video.ts`): listagens públicas mostram só `PUBLISHED`. É allowlist — um
  status novo no backend fica invisível até alguém decidir o contrário, em vez
  de aparecer sozinho. Antes a regra estava repetida em cada tela, e uma tela
  nova podia esquecê-la. **O backend continua sendo a autoridade**: se ele
  enviar rascunho de terceiro no feed, o dado chega ao navegador (oculto na UI,
  mas presente no JSON) — o filtro definitivo é lá.
- **Upload**: tipo e tamanho conferidos antes de enviar (o backend revalida o
  conteúdo com Apache Tika).
- **Sem `dangerouslySetInnerHTML`** em nenhum ponto: todo texto vindo da API é
  renderizado como conteúdo, então o React escapa.
- **Mensagens de erro** não vazam informação: e-mail inexistente e senha errada
  produzem a mesma resposta na tela, evitando enumeração de usuários. Em **5xx**
  a mensagem do backend é descartada em favor de um texto fixo: um
  `ExceptionResponse` de erro não tratado carrega a exceção do Spring, que pode
  trazer nome de tabela, fragmento de SQL ou host do MinIO. Em 4xx a mensagem é
  exibida, porque ali ela é de negócio ("categoria já existe").
- **Cache limpo na troca de sessão**: `login()` e `logout()` chamam
  `queryClient.clear()`. Sem isso o cache do React Query sobrevivia ao logout
  (é navegação SPA, sem reload, e o `gcTime` padrão é 5 min) e as chaves sem
  identidade de usuário — `['videos']`, `['users']`, `['comments', id]` —
  serviriam ao próximo a entrar no mesmo navegador o que o anterior carregou,
  incluindo a lista de e-mails que um admin abriu em `/admin`.
- **`VITE_API_URL` obrigatória no build de produção**: `vite.config.ts` falha o
  build se ela faltar ou não for `https`. Antes havia um fallback para
  `http://localhost:8080` que era embutido no bundle; combinado com
  `withCredentials: true`, um deploy sem a variável fazia o navegador do
  visitante enviar e-mail e senha do login para qualquer processo escutando
  naquela porta na máquina **dele**.

## Deploy: headers de segurança

O `dist/` é estático, então estes headers dependem do servidor que o publica —
não há como defini-los no bundle. Exemplo para nginx (troque os placeholders
pelos hosts reais da API e do MinIO):

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://MINIO_HOST; media-src 'self' https://MINIO_HOST; connect-src 'self' https://API_HOST; frame-ancestors 'none'; base-uri 'none'; form-action 'none'; object-src 'none'; upgrade-insecure-requests" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

Compatibilidade verificada para este app: `style-src` **sem** `'unsafe-inline'`
funciona (o Tailwind sai como CSS externo, e os `style={{...}}` de
`ProgressBar`/`VideoPlayer` o React aplica via propriedade DOM, não como
atributo); `script-src 'self'` basta (o `dist/index.html` não tem script
inline); `frame-ancestors 'none'` dispensa `X-Frame-Options`; `form-action
'none'` é seguro porque todo envio passa por axios, não por `<form action>`. As
fontes vêm do Google Fonts via `<link>` no `index.html`, daí as duas exceções.

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
