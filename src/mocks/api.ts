import {
  CATEGORIES,
  COMMENTS,
  CREATORS,
  VIDEOS,
  commentsByVideo,
  creatorById,
  videoById,
  type MockComment,
  type MockVideo,
} from './data'

const delay = (ms = 420) => new Promise((resolve) => setTimeout(resolve, ms))

// Estado em memória para o protótipo: mutações refletem na UI durante a sessão.
let videos = [...VIDEOS]
let comments = [...COMMENTS]
let categories = [...CATEGORIES]
const following = new Set<number>([2])
const likedVideos = new Set<number>()
const likedComments = new Set<number>()

export const mockApi = {
  async listVideos() {
    await delay()
    return videos.filter((v) => v.status === 'PUBLISHED')
  },

  async listAllVideos() {
    await delay()
    return videos
  },

  async getVideo(id: number) {
    await delay(320)
    const video = videos.find((v) => v.id === id)
    if (!video) throw new Error('Vídeo não encontrado')
    return video
  },

  async listCategories() {
    await delay(200)
    return categories
  },

  async createCategory(name: string, icon = 'Tag') {
    await delay(300)
    categories = [...categories, { name, icon, count: 0 }]
    return categories
  },

  async deleteCategory(name: string) {
    await delay(250)
    categories = categories.filter((c) => c.name !== name)
    return categories
  },

  async listComments(videoId: number) {
    await delay(300)
    return comments.filter((c) => c.videoId === videoId)
  },

  async addComment(videoId: number, text: string, authorId: number) {
    await delay(280)
    const comment: MockComment = {
      id: Math.max(0, ...comments.map((c) => c.id)) + 1,
      videoId,
      authorId,
      text,
      createdAt: new Date().toISOString(),
      likes: 0,
    }
    comments = [comment, ...comments]
    return comment
  },

  async deleteComment(id: number) {
    await delay(200)
    comments = comments.filter((c) => c.id !== id)
  },

  async toggleCommentLike(id: number) {
    await delay(120)
    const liked = likedComments.has(id)
    if (liked) likedComments.delete(id)
    else likedComments.add(id)
    comments = comments.map((c) => (c.id === id ? { ...c, likes: c.likes + (liked ? -1 : 1) } : c))
    return !liked
  },

  isCommentLiked: (id: number) => likedComments.has(id),

  async toggleVideoLike(id: number) {
    await delay(120)
    const liked = likedVideos.has(id)
    if (liked) likedVideos.delete(id)
    else likedVideos.add(id)
    return !liked
  },

  isVideoLiked: (id: number) => likedVideos.has(id),

  async toggleFollow(creatorId: number) {
    await delay(200)
    const isFollowing = following.has(creatorId)
    if (isFollowing) following.delete(creatorId)
    else following.add(creatorId)
    return !isFollowing
  },

  isFollowing: (creatorId: number) => following.has(creatorId),

  async setVideoStatus(id: number, status: MockVideo['status']) {
    await delay(260)
    videos = videos.map((v) => (v.id === id ? { ...v, status } : v))
    return videos.find((v) => v.id === id)!
  },

  async deleteVideo(id: number) {
    await delay(260)
    videos = videos.filter((v) => v.id !== id)
  },

  async uploadVideo(input: { titulo: string; sinopse: string; category: string; thumbnail?: string }) {
    await delay(600)
    const video: MockVideo = {
      id: Math.max(0, ...videos.map((v) => v.id)) + 1,
      titulo: input.titulo,
      sinopse: input.sinopse,
      thumbnail: input.thumbnail ?? `https://picsum.photos/seed/novo-${Date.now()}/1280/720`,
      creatorId: 3,
      duration: '00:00',
      views: 0,
      publishedAt: new Date().toISOString(),
      category: input.category,
      status: 'DRAFT',
    }
    videos = [video, ...videos]
    return video
  },

  async listUsers() {
    await delay(350)
    return CREATORS
  },
}

export { creatorById, videoById, commentsByVideo }
