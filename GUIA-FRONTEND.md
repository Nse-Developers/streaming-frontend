# Guia do Frontend — onde mexer em cada coisa

Guia prático para quem vem do backend. A pergunta que ele responde é sempre a
mesma: **"quero mudar X, qual arquivo eu abro?"**

Não é preciso saber React para trocar textos, cores ou limites de validação —
quase tudo isso está concentrado em poucos arquivos.

---

## 1. Como rodar (2 comandos)

```bash
npm install          # só na primeira vez
npm run dev          # sobe em http://localhost:5173
```

O backend precisa estar no ar em `localhost:8080` (com MySQL, Redis e MinIO).

Enquanto `npm run dev` estiver rodando, **qualquer arquivo que você salvar
aparece no navegador na hora** — não precisa reiniciar nada. É o equivalente ao
hot reload do Spring DevTools, só que confiável.

Antes de commitar, vale rodar:

```bash
npm run typecheck    # equivalente a "compila?" — acusa erro de tipo
npm run lint         # padrões de código
npm run build        # build de produção (roda typecheck junto)
```

---

## 2. Mapa mental: o que é cada pasta

Tudo que importa vive em [src/](src/). Traduzindo para termos de backend:

| Pasta | O que é | Análogo no backend |
|---|---|---|
| [src/pages/](src/pages/) | **Uma tela = um arquivo.** É aqui que 90% dos textos estão | Controller + view |
| [src/components/](src/components/) | Pedaços reaproveitados de tela (botão, card, modal) | Classes utilitárias / componentes compartilhados |
| [src/api/](src/api/) | Chamadas HTTP para a sua API | Client / Feign |
| [src/hooks/](src/hooks/) | Busca e cacheia dados da API para as telas | Service |
| [src/lib/](src/lib/) | Regras e utilitários (validação, formatação) | Utils / Validator |
| [src/context/](src/context/) | Estado global (usuário logado, tema, avisos) | Escopo de sessão / singleton |

> **Extensões:** `.tsx` = arquivo com tela (tem HTML dentro). `.ts` = só lógica,
> sem tela. `@/` no começo de um import significa `src/` — `@/lib/format` é
> `src/lib/format.ts`.

---

## 3. Quero mudar um TEXTO — onde está?

Os textos estão **escritos direto no arquivo da tela**, entre as tags. Não
existe arquivo de tradução centralizado (`messages.properties`). Para achar um
texto, o caminho mais rápido é buscar o texto em si no VS Code com
`Ctrl+Shift+F`.

### Uma tela = um arquivo

| Tela no navegador | Arquivo |
|---|---|
| Login | [src/pages/LoginPage.tsx](src/pages/LoginPage.tsx) |
| Cadastro | [src/pages/RegisterPage.tsx](src/pages/RegisterPage.tsx) |
| Home (feed de vídeos) | [src/pages/HomePage.tsx](src/pages/HomePage.tsx) |
| Página de um vídeo | [src/pages/VideoPage.tsx](src/pages/VideoPage.tsx) |
| Enviar vídeo | [src/pages/UploadPage.tsx](src/pages/UploadPage.tsx) |
| Perfil | [src/pages/ProfilePage.tsx](src/pages/ProfilePage.tsx) |
| Administração | [src/pages/AdminPage.tsx](src/pages/AdminPage.tsx) |
| "Você não tem acesso" (403) | [src/pages/ForbiddenPage.tsx](src/pages/ForbiddenPage.tsx) |
| "Página não encontrada" (404) | [src/pages/NotFoundPage.tsx](src/pages/NotFoundPage.tsx) |

### Como o texto aparece no código

Três formatos, todos editáveis do mesmo jeito — troque o que está entre aspas
ou entre as tags:

```tsx
// 1. Texto solto entre tags — é o mais comum
<h1 className="...">Enviar um vídeo</h1>
                    ^^^^^^^^^^^^^^^ edite aqui

// 2. Texto como propriedade (title, label, placeholder, description)
<Input label="Título" placeholder="Um título claro e direto" />
              ^^^^^^             ^^^^^^^^^^^^^^^^^^^^^^^^^^

// 3. Texto com valor dinâmico dentro — as chaves { } são código, não mexa
<p>{filtered.length} resultados para “{rawSearch}”</p>
                     ^^^^^^^^^^^^^^^^ só o texto fora das chaves
```

**Regra de ouro:** `className="..."` é estilo visual (Tailwind), **nunca** é
texto exibido. Pode ignorar completamente.

### Exemplos concretos (linha exata)

- Título da aba do navegador → [index.html:14](index.html#L14) — `<title>Byou — streaming</title>`
- Nome da marca "Byou." no topo → [src/components/layout/Logo.tsx:6](src/components/layout/Logo.tsx#L6)
- Título da página de upload → [src/pages/UploadPage.tsx:120-125](src/pages/UploadPage.tsx#L120-L125)
- "Ainda não há vídeos publicados" → [src/pages/HomePage.tsx:105](src/pages/HomePage.tsx#L105)
- "Nada encontrado para..." (busca vazia) → [src/pages/HomePage.tsx:79](src/pages/HomePage.tsx#L79)
- "Você não tem acesso a esta área" → [src/pages/ForbiddenPage.tsx:29](src/pages/ForbiddenPage.tsx#L29)
- Placeholder da busca ("Buscar vídeos e criadores") → [src/components/layout/Header.tsx](src/components/layout/Header.tsx) (aparece 2x: versão desktop e mobile — troque as duas)
- Títulos das telas de login/cadastro → [src/pages/LoginPage.tsx:45](src/pages/LoginPage.tsx#L45) e [src/pages/RegisterPage.tsx:97-98](src/pages/RegisterPage.tsx#L97-L98)

### Textos que NÃO estão nas páginas

Estes ficam centralizados — mude num lugar só e vale para o sistema inteiro:

| Texto | Arquivo |
|---|---|
| **Mensagens de erro de HTTP** (400, 401, 403, 404, 500, "sem conexão") | [src/api/client.ts:59-67](src/api/client.ts#L59-L67) — objeto `FALLBACK_BY_STATUS` |
| **Mensagens de erro de formulário** ("Informe seu e-mail", "Mínimo de 2 caracteres") | [src/lib/validation.ts](src/lib/validation.ts) — segundo argumento de cada regra |
| **Nomes dos itens do menu** (Início, Enviar vídeo, Perfil, Administração) | [src/lib/nav.ts:19-35](src/lib/nav.ts#L19-L35) |
| **Status do vídeo** (Publicado, Rascunho, Privado, Processando) | [src/lib/video.ts:70-76](src/lib/video.ts#L70-L76) — `STATUS_LABEL` |
| **Tipos de conta** (Criador, Espectador) | [src/components/layout/Header.tsx:9](src/components/layout/Header.tsx#L9) e [src/pages/ForbiddenPage.tsx:6](src/pages/ForbiddenPage.tsx#L6) — `ACCOUNT_LABEL` |
| **Formatação de números e datas** ("3 mil visualizações", "há 2 dias") | [src/lib/format.ts](src/lib/format.ts) |

> Sobre o erro de HTTP: se o backend mandar `message` no corpo da resposta, é
> **essa** mensagem que aparece na tela. O `FALLBACK_BY_STATUS` só entra quando
> o backend não manda nada. Ou seja: muita mensagem de erro se resolve no
> backend, não aqui.

---

## 4. Quero mudar CORES / visual

### Cores

Todas as cores estão em [src/index.css](src/index.css), no bloco `@theme` (topo
do arquivo). São variáveis CSS — mude o valor e a cor troca no sistema inteiro.

```css
--color-brand-500: #0d6fdd;   /* azul principal: botões, links */
--color-accent-ink: ...;      /* verde-menta: o ponto do logo, selos */
--color-success-500: #22b562; /* verde de sucesso */
--color-danger-500: #e23f3f;  /* vermelho de erro/excluir */
```

Há **dois temas** (claro e escuro) e o app troca sozinho. Os tons neutros
(fundos, textos) são declarados duas vezes:

- [src/index.css](src/index.css), bloco `:root` → **tema escuro**
- [src/index.css](src/index.css), bloco `:root[data-theme="light"]` → **tema claro**

Se mudar um fundo, **mude nos dois blocos**, senão um dos temas fica quebrado.

> Os comentários no arquivo dizem qual é o papel de cada tom e trazem os
> valores de contraste medidos (acessibilidade). Vale ler antes de escurecer um
> texto secundário.

### Fontes

[src/index.css](src/index.css) topo (`--font-display` para títulos,
`--font-body` para texto) — e o link de carregamento em
[index.html:9-13](index.html#L9-L13). Trocar a fonte exige mudar os dois.

### Tamanhos, espaçamentos, bordas

Ficam no `className="..."` de cada elemento — é Tailwind. Referência rápida:

| Classe | O que faz |
|---|---|
| `text-sm`, `text-2xl` | tamanho da fonte |
| `font-bold`, `font-medium` | peso da fonte |
| `p-4`, `px-6`, `py-3` | espaço interno (padding) — `x` horizontal, `y` vertical |
| `mt-3`, `mb-5`, `gap-2` | espaço externo (margin) e entre itens |
| `rounded-lg`, `rounded-full` | canto arredondado |
| `text-surface-600` | cor do texto |
| `bg-surface-100` | cor de fundo |
| `hidden`, `sm:block`, `lg:flex` | esconde/mostra por tamanho de tela (`sm:` ≥640px, `lg:` ≥1024px) |

Os números seguem escala fixa: `p-4` = 16px, `p-6` = 24px. Documentação:
<https://tailwindcss.com/docs>.

---

## 5. Quero mudar REGRAS DE VALIDAÇÃO

Tudo em [src/lib/validation.ts](src/lib/validation.ts). É a validação de
**primeira linha** (feedback rápido no navegador) — o backend revalida tudo, e
essa é a autoridade real. Mudar aqui não afeta a segurança do servidor.

O que dá para ajustar:

- **Política de senha** — [src/lib/validation.ts:41-49](src/lib/validation.ts#L41-L49): mínimo 8 caracteres, exige minúscula, maiúscula, número e símbolo. Cada `.regex(...)` é uma exigência; apagar a linha remove a exigência.
- **Tamanho máximo dos campos** — `.max(60, 'Máximo de 60 caracteres.')` — troque o número **e** o texto junto.
- **Limites de upload** — [src/lib/validation.ts:190-191](src/lib/validation.ts#L190-L191): `MAX_VIDEO_BYTES` (15 GB) e `MAX_THUMB_BYTES` (15 MB).
- **Formatos aceitos no upload** — `ACCEPTED_VIDEO_TYPES` e `ACCEPTED_IMAGE_TYPES`, logo abaixo.

> Ao mudar um limite, confira o valor equivalente no backend. Se o front
> permitir mais que o servidor, o usuário sobe um arquivo de 20 min e leva 413
> no fim.

---

## 6. Quero mudar ROTAS / permissões de tela

[src/App.tsx](src/App.tsx) é o mapa de URLs — o `SecurityConfig` do front.
Cada `<Route path="..." element={...} />` liga uma URL a uma tela.

As proteções espelham o backend:

- `<RequireAuth />` → precisa estar logado
- `<RequireCreator />` → precisa ser CREATORS ou ADMIN
- `<RequireAdmin />` → precisa ser ADMIN

Sem sessão → manda para `/login` guardando o destino. Logado mas sem o papel →
manda para `/403`. Vale inclusive para URL colada direto no navegador.

A lógica desses guards está em
[src/components/auth/RouteGuards.tsx](src/components/auth/RouteGuards.tsx).

> **Importante:** isto é só experiência de uso — evita abrir uma tela que
> resultaria em 403. **Não é segurança.** Quem autoriza de verdade é o backend,
> a cada request. Nunca troque uma checagem do servidor confiando nesta.

Ao adicionar uma rota, geralmente você também quer o item no menu:
[src/lib/nav.ts](src/lib/nav.ts) (o campo `show` controla quem enxerga).

---

## 7. Quero mudar a comunicação com a API

| Preciso... | Arquivo |
|---|---|
| Ver/alterar quais rotas o front chama | [src/api/services.ts](src/api/services.ts) |
| Ver os DTOs (formato do JSON) | [src/api/types.ts](src/api/types.ts) |
| Mexer em cookie, CSRF, timeout, tratamento de erro | [src/api/client.ts](src/api/client.ts) |
| Mudar a URL do backend | [.env](.env) (copie de [.env.example](.env.example)) — `VITE_API_URL` |
| Mexer no proxy de desenvolvimento | [vite.config.ts](vite.config.ts) |

[src/api/services.ts](src/api/services.ts) é o espelho dos seus controllers,
agrupado por recurso: `authApi`, `videoApi`, `categoryApi`, `commentApi`,
`commentLikeApi`, `followApi`. Se você renomear uma rota no backend, é o
**único** arquivo do front que precisa mudar.

Dois pontos que costumam gerar dúvida:

- **Sessão:** vive no cookie `HttpOnly` `byou_session`. O front nunca lê nem
  guarda o token — pergunta quem está logado em `GET /auth/me`. Por isso
  `withCredentials: true` em [src/api/client.ts](src/api/client.ts): sem ele o
  cookie não viaja.
- **Em desenvolvimento não existe CORS.** O front chama `/api/...` na própria
  origem e o Vite repassa para `localhost:8080` no servidor
  ([vite.config.ts](vite.config.ts)). Em produção a chamada é direta, e aí o
  CORS do backend precisa liberar o domínio.

> A porta 5173 é fixa de propósito (`strictPort`). Se estiver ocupada, o Vite
> falha na hora em vez de subir na 5174 — que é a porta que o CORS do backend
> não libera.

---

## 8. Se você mudar algo no backend, o que quebra aqui

| Mudança no backend | Onde ajustar no front |
|---|---|
| Renomeou/moveu um endpoint | [src/api/services.ts](src/api/services.ts) |
| Mudou um campo do JSON de resposta | [src/api/types.ts](src/api/types.ts) — e o `npm run typecheck` aponta as telas afetadas |
| Renomeou o id do vídeo (`videId` / `video_id`) | [src/lib/video.ts](src/lib/video.ts), função `readId` — **uma linha**, já preparado para isso |
| Novo valor de status de vídeo | [src/lib/video.ts](src/lib/video.ts) (`STATUS_LABEL`) + `VideoStatus` em [src/api/types.ts](src/api/types.ts) |
| Novo tipo de conta além de CREATORS/VIEWERS | `ACCOUNT_LABEL` em [Header.tsx](src/components/layout/Header.tsx) e [ForbiddenPage.tsx](src/pages/ForbiddenPage.tsx), + guards em [RouteGuards.tsx](src/components/auth/RouteGuards.tsx) |
| Mudou regra de permissão no `SecurityConfig` | [src/App.tsx](src/App.tsx) (qual guard envolve a rota) |
| Mudou limite de tamanho de upload | [src/lib/validation.ts](src/lib/validation.ts) (`MAX_VIDEO_BYTES` / `MAX_THUMB_BYTES`) |

**`npm run typecheck` é seu amigo.** Se você mexer em
[src/api/types.ts](src/api/types.ts), ele lista exatamente quais arquivos
pararam de compilar — igual a mudar uma assinatura de método em Java.

---

## 9. Coisas que quase sempre são o que você procura

**Vídeo em destaque na home:** é uma preferência **local** do navegador
(localStorage) — [src/lib/featured.ts](src/lib/featured.ts). Só ADMIN vê o
controle, e a escolha vale só naquele navegador, porque não existe rota na API
para destacar um vídeo. Quando existir (ex.: campo `featured` no vídeo), só
esse arquivo precisa mudar.

**Cabeçalho, menu lateral e menu de baixo (mobile):**

- [src/components/layout/Header.tsx](src/components/layout/Header.tsx) — barra do topo: logo, busca, botão de tema, menu da conta
- [src/components/layout/Sidebar.tsx](src/components/layout/Sidebar.tsx) — rail estreito da esquerda (só desktop)
- [src/components/layout/BottomNav.tsx](src/components/layout/BottomNav.tsx) — barra inferior (só mobile)
- [src/components/layout/AppLayout.tsx](src/components/layout/AppLayout.tsx) — junta os três em volta do conteúdo

Sidebar e BottomNav leem a mesma lista de [src/lib/nav.ts](src/lib/nav.ts) —
mudou lá, mudou nos dois.

**Componentes reutilizáveis** ([src/components/ui/](src/components/ui/)): se
você mudar `Button.tsx`, **todos** os botões do sistema mudam. Ótimo para
padronizar, perigoso para ajuste pontual — para mexer em um botão só, mude o
`className` no lugar onde ele é usado.

**Card de vídeo e player** ([src/components/video/](src/components/video/)):
`VideoCard.tsx` (card do feed), `HeroVideo.tsx` (destaque grande da home),
`VideoPlayer.tsx`, `CommentSection.tsx`.

---

## 10. Sequência segura para mexer sem quebrar

1. `npm run dev` rodando, navegador aberto na tela que você quer mudar
2. `Ctrl+Shift+F` no VS Code e busque o texto exato que aparece na tela
3. Edite e salve — o navegador atualiza sozinho
4. Não gostou? `git diff` mostra o que mudou, `git checkout -- <arquivo>` desfaz
5. Antes de commitar: `npm run typecheck && npm run build`

**Evite mexer sem entender:** qualquer coisa dentro de `{ }` no meio do HTML
(é código), linhas com `useState` / `useEffect` / `use...` (estado do React), e
`src/main.tsx` (a fundação do app).

**Pode mexer à vontade:** texto entre `>` e `<`, valores entre aspas em `title=`
/ `label=` / `placeholder=`, cores no `index.css`, e as tabelas de tradução da
seção 3.

---

## 11. Outros documentos

- [README.md](README.md) — visão geral, decisões de arquitetura e segurança no cliente
- `PENDENCIAS.md` — **não existe neste repositório.** O README o cita em três
  pontos (bucket do MinIO, CSRF, estado da integração), mas o arquivo nunca foi
  commitado. Se você o tiver localmente, vale versionar; senão, o resumo do que
  falta está na seção "Estado da integração" do próprio README.
