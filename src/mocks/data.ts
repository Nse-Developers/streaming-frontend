// Dados de protótipo. Substituir pela API real quando os endpoints do backend
// estiverem estáveis (ver PENDENCIAS.txt).

export interface MockCreator {
  id: number
  name: string
  handle: string
  followers: number
  bio: string
}

export interface MockVideo {
  id: number
  titulo: string
  sinopse: string
  thumbnail: string
  creatorId: number
  duration: string
  views: number
  publishedAt: string
  category: string
  status: 'PUBLISHED' | 'DRAFT' | 'PRIVATE'
}

export interface MockComment {
  id: number
  videoId: number
  authorId: number
  text: string
  createdAt: string
  likes: number
}

export const CREATORS: MockCreator[] = [
  { id: 1, name: 'Marina Duarte', handle: '@marinaduarte', followers: 128400, bio: 'Documentarista. Histórias de quem constrói cidades.' },
  { id: 2, name: 'Rafael Nunes', handle: '@rafanunes', followers: 45200, bio: 'Ensaios sobre cinema e trilha sonora.' },
  { id: 3, name: 'Estúdio Bravo', handle: '@estudiobravo', followers: 302100, bio: 'Produtora independente. Curtas e séries originais.' },
  { id: 4, name: 'Lia Prado', handle: '@liaprado', followers: 18900, bio: 'Cozinha de raiz, ingredientes de feira.' },
  { id: 5, name: 'Caio Bertone', handle: '@caiobertone', followers: 76300, bio: 'Viagens de bicicleta e estradas vazias.' },
]

const THUMB = (seed: string, w = 640, h = 360) => `https://picsum.photos/seed/${seed}/${w}/${h}`

export const CATEGORIES = [
  { name: 'Documentário', icon: 'Clapperboard', count: 24 },
  { name: 'Música', icon: 'Music', count: 18 },
  { name: 'Culinária', icon: 'UtensilsCrossed', count: 12 },
  { name: 'Viagem', icon: 'Map', count: 31 },
  { name: 'Tecnologia', icon: 'Cpu', count: 27 },
  { name: 'Entrevistas', icon: 'Mic', count: 9 },
]

export const VIDEOS: MockVideo[] = [
  {
    id: 1,
    titulo: 'A cidade que acorda às quatro',
    sinopse:
      'Antes do primeiro ônibus, uma outra cidade já está de pé. Padeiros, feirantes e varredores contam como é viver num turno que quase ninguém vê.',
    thumbnail: THUMB('cidade-quatro', 1280, 720),
    creatorId: 1,
    duration: '18:42',
    views: 284100,
    publishedAt: '2026-07-12T08:00:00',
    category: 'Documentário',
    status: 'PUBLISHED',
  },
  {
    id: 2,
    titulo: 'Por que trilhas sonoras envelhecem melhor que filmes',
    sinopse: 'Um ensaio sobre memória afetiva, motivos musicais e o jeito que a gente lembra de cenas que nem viu.',
    thumbnail: THUMB('trilhas-sonoras', 1280, 720),
    creatorId: 2,
    duration: '12:07',
    views: 96400,
    publishedAt: '2026-07-20T14:30:00',
    category: 'Música',
    status: 'PUBLISHED',
  },
  {
    id: 3,
    titulo: 'Ilha Grande em três dias e uma bicicleta',
    sinopse: 'Sem carro, sem pressa e com bagagem de mão. O que dá pra ver quando o deslocamento vira o roteiro.',
    thumbnail: THUMB('ilha-bike', 1280, 720),
    creatorId: 5,
    duration: '24:15',
    views: 412800,
    publishedAt: '2026-06-28T09:15:00',
    category: 'Viagem',
    status: 'PUBLISHED',
  },
  {
    id: 4,
    titulo: 'Farinha, água e tempo: pão de fermentação natural',
    sinopse: 'Três ingredientes e muita paciência. A receita completa, do levain ao forno de casa.',
    thumbnail: THUMB('pao-natural', 1280, 720),
    creatorId: 4,
    duration: '31:50',
    views: 158300,
    publishedAt: '2026-07-25T11:00:00',
    category: 'Culinária',
    status: 'PUBLISHED',
  },
  {
    id: 5,
    titulo: 'O que aconteceu com os cinemas de rua',
    sinopse: 'Salas que viraram igreja, estacionamento e loja de departamento. Um mapa afetivo do que sobrou.',
    thumbnail: THUMB('cinemas-rua', 1280, 720),
    creatorId: 3,
    duration: '41:22',
    views: 673900,
    publishedAt: '2026-05-30T19:45:00',
    category: 'Documentário',
    status: 'PUBLISHED',
  },
  {
    id: 6,
    titulo: 'Entrevista: 20 anos montando som ao vivo',
    sinopse: 'Do palco pequeno ao festival. Um técnico de som conta o que o público nunca escuta.',
    thumbnail: THUMB('som-ao-vivo', 1280, 720),
    creatorId: 2,
    duration: '52:03',
    views: 41200,
    publishedAt: '2026-07-29T16:20:00',
    category: 'Entrevistas',
    status: 'PUBLISHED',
  },
  {
    id: 7,
    titulo: 'Reformando um notebook de 2011',
    sinopse: 'SSD, mais RAM e uma distro leve. Vale a pena ou é hora de aposentar?',
    thumbnail: THUMB('notebook-2011', 1280, 720),
    creatorId: 3,
    duration: '15:38',
    views: 227500,
    publishedAt: '2026-07-18T10:10:00',
    category: 'Tecnologia',
    status: 'PUBLISHED',
  },
  {
    id: 8,
    titulo: 'A feira antes do sol',
    sinopse: 'Um dia inteiro com quem monta a banca às 3h da manhã.',
    thumbnail: THUMB('feira-sol', 1280, 720),
    creatorId: 1,
    duration: '09:54',
    views: 88700,
    publishedAt: '2026-07-30T07:30:00',
    category: 'Documentário',
    status: 'PUBLISHED',
  },
  {
    id: 9,
    titulo: 'Estrada de terra: 300km no Vale do Café',
    sinopse: 'Rota completa, onde dormir e o que quebrou no caminho.',
    thumbnail: THUMB('vale-cafe', 1280, 720),
    creatorId: 5,
    duration: '28:41',
    views: 134600,
    publishedAt: '2026-07-05T13:00:00',
    category: 'Viagem',
    status: 'PUBLISHED',
  },
  {
    id: 10,
    titulo: 'Molho de tomate que presta',
    sinopse: 'Sem açúcar, sem atalho. O básico bem feito em 40 minutos.',
    thumbnail: THUMB('molho-tomate', 1280, 720),
    creatorId: 4,
    duration: '11:26',
    views: 302400,
    publishedAt: '2026-06-14T18:00:00',
    category: 'Culinária',
    status: 'PUBLISHED',
  },
  {
    id: 11,
    titulo: 'Bastidores: montagem do episódio 3',
    sinopse: 'Timeline, cortes descartados e a trilha que quase entrou.',
    thumbnail: THUMB('bastidores-3', 1280, 720),
    creatorId: 3,
    duration: '22:19',
    views: 0,
    publishedAt: '2026-08-01T09:00:00',
    category: 'Documentário',
    status: 'DRAFT',
  },
  {
    id: 12,
    titulo: 'Teste de câmera — não publicar',
    sinopse: 'Material bruto de referência de cor.',
    thumbnail: THUMB('teste-camera', 1280, 720),
    creatorId: 3,
    duration: '04:02',
    views: 0,
    publishedAt: '2026-07-31T15:40:00',
    category: 'Tecnologia',
    status: 'PRIVATE',
  },
]

export const COMMENTS: MockComment[] = [
  { id: 1, videoId: 1, authorId: 2, text: 'A cena da padaria às 4h ficou absurda. Que fotografia.', createdAt: '2026-07-13T10:20:00', likes: 342 },
  { id: 2, videoId: 1, authorId: 4, text: 'Trabalho noturno há 9 anos e nunca vi retratarem tão certo.', createdAt: '2026-07-14T22:05:00', likes: 1204 },
  { id: 3, videoId: 1, authorId: 5, text: 'Qual lente você usou nas externas?', createdAt: '2026-07-15T08:40:00', likes: 87 },
  { id: 4, videoId: 2, authorId: 1, text: 'O trecho sobre motivo musical me fez repensar uns cortes meus.', createdAt: '2026-07-21T12:00:00', likes: 213 },
  { id: 5, videoId: 3, authorId: 3, text: 'Fiz essa rota mês passado, subestimei a subida do final kkkk', createdAt: '2026-06-29T17:30:00', likes: 456 },
]

export const CURRENT_USER = {
  id: 3,
  name: 'Estúdio Bravo',
  email: 'contato@estudiobravo.com',
  handle: '@estudiobravo',
}

export function creatorById(id: number): MockCreator {
  return CREATORS.find((c) => c.id === id) ?? CREATORS[0]
}

export function videoById(id: number): MockVideo | undefined {
  return VIDEOS.find((v) => v.id === id)
}

export function commentsByVideo(videoId: number): MockComment[] {
  return COMMENTS.filter((c) => c.videoId === videoId)
}
