import { useState } from 'react'
import { ArrowRight, Check, ChevronDown, Moon, Play, Search, Sun } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/layout/Logo'
import { APP_HOME } from '@/lib/nav'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'

const content = [
  {
    category: 'Vlogs reais',
    title: 'Sessão de madrugada no 3º subsolo da garagem',
    creator: 'Téo Anderson',
    meta: '2.143 visualizações · há 2 dias',
    initials: 'TA',
    image: 'https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?auto=format&fit=crop&w=900&q=80',
  },
  {
    category: 'Oficina & criação',
    title: 'Trinta potes de argila até acertar uma peça boa',
    creator: 'Oficina Santa Cruz',
    meta: '39.810 visualizações · há 1 dia',
    initials: 'OS',
    image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=900&q=80',
  },
  {
    category: 'Bastidores',
    title: 'Me arrumando no camarim antes do primeiro show solo',
    creator: 'Vic Aurora',
    meta: '8.322 visualizações · há 6 dias',
    initials: 'VA',
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80',
  },
  {
    category: 'Música & áudio',
    title: 'Tocando na varanda com a brisa do entardecer',
    creator: 'Seu Waldemar',
    meta: '471 visualizações · há 5 dias',
    initials: 'SW',
    image: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=900&q=80',
  },
]

const steps = [
  ['01', 'Crie seu perfil em 30s', 'Escolha Criador ou Espectador. Você pode mudar a qualquer instante.'],
  ['02', 'Defina suas preferências', 'Siga processos e tópicos que despertam interesse genuíno.'],
  ['03', 'Publique sem converter ou cortar', 'Suba vídeo, áudio, live ou ensaio no formato que a ideia pedir.'],
  ['04', 'Encontre pessoas reais', 'Comentários com respeito recíproco e espaço para conversas de verdade.'],
]

const faqs = [
  ['Preciso ter um nicho ou formato definido?', 'Não. Você pode postar um ensaio na segunda, uma live técnica na quarta e um vídeo longo no domingo. Seu perfil pertence a você, não a uma gaveta do algoritmo.'],
  ['Qual a diferença entre conta de Espectador e Criador?', 'Espectadores assistem, salvam listas e comentam. Criadores também têm upload multiformato, analytics transparente e suporte a monetização direta.'],
  ['Como funciona a privacidade por publicação?', 'Cada vídeo pode ser Público, Apenas Seguidores ou Privado. Você pode alterar essa visibilidade a qualquer momento.'],
  ['É pago para assistir ou publicar?', 'Não. O Byou é gratuito para assistir e publicar, para que criadores e público se encontrem sem barreiras financeiras.'],
]

export function LandingPage() {
  const { theme, toggleTheme } = useTheme()
  const { isAuthenticated } = useAuth()
  const [activeStep, setActiveStep] = useState(0)
  const [filter, setFilter] = useState('Todos')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const filteredContent = filter === 'Todos' ? content : content.filter((item) => item.category === filter)
  const filters = ['Todos', ...content.map((item) => item.category)]

  return (
    <div className="min-h-dvh overflow-x-hidden bg-surface-0 text-surface-900">
      <header className="sticky top-0 z-40 border-b border-surface-200/70 bg-surface-0/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="Byou - página inicial" className="rounded-md focus-ring">
            <Logo className="text-xl" />
          </Link>
          <nav className="hidden items-center gap-7 text-sm md:flex">
            <Link to={APP_HOME} className="font-semibold text-surface-900 hover:text-brand-link">Explorar</Link>
            <a href="#como-funciona" className="font-medium text-surface-600 hover:text-surface-900">Como funciona</a>
            <a href="#criadores" className="font-medium text-surface-600 hover:text-surface-900">Criadores</a>
            <a href="#faq" className="font-medium text-surface-600 hover:text-surface-900">FAQ</a>
          </nav>
          <div className="flex items-center gap-1 sm:gap-3">
            <button type="button" onClick={toggleTheme} className="flex h-10 w-10 items-center justify-center rounded-full text-surface-700 hover:bg-surface-200 focus-ring" aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {/* Quem já tem sessão não recebe "Entrar/Criar conta" — para essa
                pessoa a landing é só uma página que ela abriu por link ou
                favorito, e o que falta é o caminho de volta ao app. */}
            {isAuthenticated ? (
              <Link to={APP_HOME} className="inline-flex items-center gap-1.5 rounded-md bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600 focus-ring">Ir para os vídeos <ArrowRight size={15} /></Link>
            ) : (
              <>
                <Link to="/login" className="hidden rounded-md px-3 py-2 text-sm font-semibold text-surface-800 hover:bg-surface-200 focus-ring sm:inline-flex">Entrar</Link>
                <Link to="/register" className="rounded-md bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600 focus-ring">Criar conta</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="relative border-b border-surface-200/70 py-16 sm:py-24">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgb(13_111_221_/_0.16),transparent_32%),linear-gradient(180deg,transparent,rgb(77_227_180_/_0.03))]" />
          <div className="relative mx-auto grid max-w-[1280px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:gap-10 lg:px-8">
            <div className="lg:col-span-6">
              <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-surface-300 bg-surface-100 px-3.5 py-1.5 text-xs font-medium text-surface-800"><span className="h-2 w-2 animate-pulse rounded-full bg-accent-ink" />Sem algoritmo de aparência</span>
              <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-surface-900 sm:text-5xl lg:text-[3.8rem]">Cansado de editar quem você é pra caber num feed?</h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-surface-600 sm:text-lg">O Byou é o streaming aberto onde o mesmo criador publica ensaio, vlog cru, live técnica ou texto longo. Sem performar para métricas vazias.</p>
              {/* Esta página é alcançável com sessão (rota /sobre), então nenhum
                  convite de cadastro pode sobrar aqui: "Criar conta grátis" viraria
                  um clique que o RedirectIfAuthenticated devolve para /home sem
                  explicar nada. Para quem já entrou fica só o catálogo — promovido
                  ao botão primário, porque manter os dois deixaria o hero com dois
                  botões apontando para o mesmo lugar. */}
              <div className="mt-8 flex flex-wrap gap-3">
                {isAuthenticated ? (
                  <Link to={APP_HOME} className="inline-flex h-12 items-center gap-2 rounded-md bg-brand-500 px-6 text-sm font-bold text-white shadow-[0_8px_28px_rgb(13_111_221_/_0.28)] transition-colors hover:bg-brand-600 focus-ring">Ir para os vídeos <ArrowRight size={17} /></Link>
                ) : (
                  <>
                    <Link to="/register" className="inline-flex h-12 items-center gap-2 rounded-md bg-brand-500 px-6 text-sm font-bold text-white shadow-[0_8px_28px_rgb(13_111_221_/_0.28)] transition-colors hover:bg-brand-600 focus-ring">Criar conta grátis <ArrowRight size={17} /></Link>
                    <Link to={APP_HOME} className="inline-flex h-12 items-center gap-2 rounded-md border border-surface-300 bg-surface-100 px-5 text-sm font-semibold text-surface-800 hover:bg-surface-200 focus-ring"><Play size={16} className="text-accent-ink" />Ver os vídeos</Link>
                  </>
                )}
              </div>
              {/* Fala em escolher entre Espectador e Criador: é a legenda do botão
                  de cadastro, e não sobrevive a ele. */}
              {!isAuthenticated && (
                <p className="mt-4 text-xs text-surface-600">Gratuito para assistir e publicar · Escolha entre <strong className="text-surface-800">Espectador</strong> ou <strong className="text-surface-800">Criador</strong></p>
              )}
            </div>
            <div className="lg:col-span-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="group relative col-span-2 overflow-hidden rounded-xl border border-surface-300 bg-surface-100 shadow-elevated">
                  <img src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1400&q=85" alt="Gravação em estúdio caseiro" className="aspect-[16/9] w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 text-white"><div><span className="mb-2 inline-block rounded bg-brand-500 px-2 py-1 text-[10px] font-bold uppercase tracking-wider">Vídeo 4K</span><h2 className="font-display text-base font-bold sm:text-lg">O estúdio que cabe num quarto</h2><p className="mt-1 text-xs text-white/70">Marina Sales · 48 min · sem cortes comerciais</p></div><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-surface-900"><Play size={16} fill="currentColor" /></span></div>
                </div>
                <MiniFeature image="https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=700&q=80" title="Trinta potes até acertar um" label="Processo bruto" />
                <MiniFeature image="https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?auto=format&fit=crop&w=700&q=80" title="Madrugada no 3º subsolo" label="Live técnica" />
              </div>
            </div>
          </div>
        </section>

        <div className="overflow-hidden border-b border-surface-200/70 bg-surface-50 py-4"><div className="landing-marquee flex min-w-max items-center gap-8 text-xs font-medium text-surface-600 sm:text-sm"><span className="font-semibold text-surface-900">+1.200 horas de conteúdo real</span><span>·</span><span>+350 criadores independentes</span><span>·</span><span>4 formatos suportados</span><span>·</span><span>+18 mil reproduções sem corte esta semana</span><span>·</span><span className="font-semibold text-surface-900">+1.200 horas de conteúdo real</span><span>·</span><span>+350 criadores independentes</span></div></div>

        <section className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <SectionHeading title="Feito para quem cria, não para agradar robôs" description="Cada detalhe do Byou foi desenhado para eliminar a pressão estética e a censura algorítmica." />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <ValueCard title="Sem moldes pré-fabricados" description="Não te forçamos a produzir apenas vídeos curtos. O mesmo perfil publica o que o momento pedir."><div className="grid grid-cols-3 gap-2 text-center text-[11px]"><Metric value="12s" label="Riff cru" /><Metric value="45m" label="Gravação" /><Metric value="Ensaio" label="Fotos" /></div></ValueCard>
            <ValueCard title="Sem curadoria de aparência" description="A entrega respeita afinidade real e interesse temático. Seu vídeo não precisa de dancinhas para ser descoberto."><div><div className="mb-2 flex justify-between text-xs"><span>Byou: afinidade real</span><strong className="text-accent-ink">89%</strong></div><div className="h-2 rounded-full bg-surface-200"><div className="h-full w-[89%] rounded-full bg-accent-ink" /></div><div className="mt-3 flex justify-between text-xs text-surface-600"><span>Outros: trend</span><span>22%</span></div><div className="mt-2 h-2 rounded-full bg-surface-200"><div className="h-full w-[22%] rounded-full bg-surface-500" /></div></div></ValueCard>
            <ValueCard title="Suas próprias regras" description="Controle a privacidade por publicação. Você escolhe quem tem acesso a cada fragmento do seu trabalho."><div className="space-y-2 text-xs"><p className="text-surface-600">Visibilidade da publicação:</p><div className="flex items-center justify-between rounded-md border border-brand-500/50 bg-surface-200 p-2.5"><span className="font-semibold">Público</span><span className="text-brand-link">Ativo</span></div><div className="flex items-center justify-between rounded-md bg-surface-50 p-2.5 text-surface-600"><span>Apenas seguidores</span><span>Restrito</span></div></div></ValueCard>
          </div>
        </section>

        <section id="como-funciona" className="border-y border-surface-200/70 bg-surface-50 py-16 sm:py-24"><div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8"><SectionHeading title="Como funciona: do primeiro acesso à publicação" description="Simples, sem labirintos de configurações ou termos obscuros. Escolha seu ritmo." align="left" /><div className="mt-12 grid gap-8 lg:grid-cols-2"><div className="space-y-3">{steps.map(([number, title, description], index) => <button type="button" key={number} onClick={() => setActiveStep(index)} className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors focus-ring ${activeStep === index ? 'border-brand-500 bg-surface-100' : 'border-surface-300 bg-surface-0 hover:bg-surface-100'}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold ${activeStep === index ? 'bg-brand-500 text-white' : 'bg-surface-200 text-surface-600'}`}>{number}</span><span><strong className="font-display text-sm text-surface-900 sm:text-base">{title}</strong><span className="mt-1 block text-xs leading-relaxed text-surface-600 sm:text-sm">{description}</span></span></button>)}</div><div className="flex min-h-[300px] flex-col justify-center rounded-xl border border-surface-300 bg-surface-100 p-6 sm:p-8"><div className="flex items-center justify-between border-b border-surface-300 pb-4 text-xs"><strong className="uppercase tracking-wider text-brand-link">Passo {steps[activeStep][0]} · {activeStep === 2 ? 'Upload multiformato' : activeStep === 3 ? 'Interação respeitosa' : 'Sem burocracia'}</strong><span className="text-surface-600">byou.website</span></div><div className="py-8"><div className="mb-5 flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-xl text-white">{activeStep === 0 ? '◌' : activeStep === 1 ? '✦' : activeStep === 2 ? '↑' : '♡'}</span><div><p className="font-display font-bold text-surface-900">{steps[activeStep][1]}</p><p className="mt-1 text-xs text-surface-600">Uma experiência feita para preservar seu processo.</p></div></div><div className="rounded-lg border border-dashed border-surface-300 bg-surface-50 p-5 text-center text-sm text-surface-600"><Check className="mx-auto mb-2 text-accent-ink" size={20} />Você decide o ritmo, o formato e quem participa.</div></div></div></div></div></section>

        <section id="vitrine" className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 md:py-24 lg:px-8"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><SectionHeading align="left" title="Veja como é o feed de verdade" description="Sem clickbaits chamativos ou títulos em caixa alta enganosos." /><span className="inline-flex h-fit items-center gap-2 rounded-md border border-surface-300 bg-surface-100 px-3 py-2 text-xs text-surface-600"><span className="h-2 w-2 rounded-full bg-success-500" />Atualizado em tempo real</span></div><div className="mt-8 flex gap-2 overflow-x-auto pb-2">{filters.map((item) => <button type="button" key={item} onClick={() => setFilter(item)} className={`whitespace-nowrap rounded-md px-4 py-2 text-xs font-semibold focus-ring ${filter === item ? 'bg-brand-500 text-white' : 'border border-surface-300 bg-surface-100 text-surface-600 hover:bg-surface-200'}`}>{item}</button>)}</div><div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{filteredContent.map((item) => <article key={item.title} className="group overflow-hidden rounded-xl border border-surface-300 bg-surface-100"><div className="relative aspect-video overflow-hidden bg-surface-200"><img src={item.image} alt={item.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" /><span className="absolute left-2 top-2 rounded bg-black/75 px-2 py-1 text-[10px] font-bold uppercase text-white">{item.category}</span></div><div className="p-4"><h3 className="line-clamp-2 font-display text-sm font-bold leading-snug text-surface-900">{item.title}</h3><div className="mt-4 flex items-center gap-2 border-t border-surface-200 pt-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">{item.initials}</span><div className="min-w-0"><p className="truncate text-xs font-semibold text-surface-900">{item.creator}</p><p className="truncate text-[11px] text-surface-600">{item.meta}</p></div></div></div></article>)}</div></section>

        <section id="criadores" className="border-y border-surface-200/70 bg-surface-50 py-16 sm:py-24"><div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8"><SectionHeading title="Histórias de quem parou de pedir licença" description="Criadores que encontraram no Byou a liberdade de publicar sua verdade." /><div className="mt-12 grid gap-5 md:grid-cols-3">{[['Marina Sales', 'Musicista independente', 'Num dia quero postar um riff incompleto, no outro um show de 2 horas. Aqui não precisei escolher nem me desculpar.'], ['Oficina Santa Cruz', 'Artesão e ceramista', 'Meu vídeo moldando um vaso em silêncio encontrou 40 mil visualizações qualificadas.'], ['Téo Anderson', 'Skatista & filmmaker', 'Ganhei um público que realmente se importa com o rolê, não com o material ser comercial o suficiente.']].map(([name, role, quote]) => <blockquote key={name} className="rounded-xl border border-surface-300 bg-surface-100 p-6"><span className="font-serif text-4xl leading-none text-brand-link">“</span><p className="mt-2 text-sm italic leading-relaxed text-surface-700">{quote}</p><footer className="mt-6 border-t border-surface-200 pt-4"><strong className="block font-display text-sm text-surface-900">{name}</strong><span className="text-xs text-accent-ink">{role}</span></footer></blockquote>)}</div></div></section>

        <section id="faq" className="mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-24"><SectionHeading title="Perguntas frequentes" description="Tudo o que você precisa saber sobre o Byou, privacidade e publicação." />{faqs.map(([question, answer], index) => <div key={question} className="border-b border-surface-300"><button type="button" onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index} className="flex w-full items-center justify-between gap-4 py-5 text-left font-display text-sm font-bold text-surface-900 focus-ring sm:text-base"><span>{question}</span><ChevronDown size={18} className={`shrink-0 text-surface-600 transition-transform ${openFaq === index ? 'rotate-180' : ''}`} /></button>{openFaq === index && <p className="pb-5 text-sm leading-relaxed text-surface-600">{answer}</p>}</div>)}</section>

        <section className="border-t border-surface-300 bg-surface-50 px-4 py-20 text-center sm:py-28"><span className="text-xs font-semibold uppercase tracking-wider text-accent-ink">O streaming dos criadores reais</span><h2 className="mx-auto mt-5 max-w-3xl font-display text-3xl font-black leading-tight text-surface-900 sm:text-5xl">Pare de editar quem você é. Comece a publicar.</h2><p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-surface-600 sm:text-base">Junte-se a criadores e espectadores que escolheram a autenticidade.</p>{isAuthenticated ? (<Link to={APP_HOME} className="mt-8 inline-flex h-12 items-center gap-2 rounded-md bg-brand-500 px-7 text-sm font-bold text-white shadow-[0_8px_28px_rgb(13_111_221_/_0.28)] hover:bg-brand-600 focus-ring">Ir para os vídeos <ArrowRight size={17} /></Link>) : (<Link to="/register" className="mt-8 inline-flex h-12 items-center gap-2 rounded-md bg-brand-500 px-7 text-sm font-bold text-white shadow-[0_8px_28px_rgb(13_111_221_/_0.28)] hover:bg-brand-600 focus-ring">Criar minha conta grátis <ArrowRight size={17} /></Link>)}<p className="mt-5 text-xs text-surface-600">Sem anúncios forçados · Sem venda de dados pessoais · Moderação humana</p></section>
      </main>

      <footer className="border-t border-surface-300 bg-surface-0 py-10"><div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 text-sm text-surface-600 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8"><div><Logo className="text-lg" /><p className="mt-3 max-w-sm text-xs leading-relaxed">Streaming aberto sem julgamento. Espaço para criadores reais e audiências genuínas.</p></div><div className="flex flex-wrap gap-x-5 gap-y-2 text-xs"><Link to={APP_HOME} className="hover:text-surface-900">Explorar</Link><a href="#faq" className="hover:text-surface-900">FAQ</a>{!isAuthenticated && <Link to="/login" className="hover:text-surface-900">Entrar</Link>}<a href="mailto:contato@byou.website" className="hover:text-surface-900">Contato</a></div></div></footer>
    </div>
  )
}

function MiniFeature({ image, title, label }: { image: string; title: string; label: string }) {
  return <div className="group overflow-hidden rounded-lg border border-surface-300 bg-surface-100"><div className="relative aspect-video overflow-hidden"><img src={image} alt={title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /><span className="absolute left-2 top-2 rounded bg-black/75 px-1.5 py-1 text-[9px] font-bold uppercase text-white">{label}</span></div><p className="truncate p-3 font-display text-xs font-bold text-surface-900">{title}</p></div>
}

function SectionHeading({ title, description, align = 'center' }: { title: string; description: string; align?: 'left' | 'center' }) {
  return <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}><h2 className="font-display text-2xl font-extrabold tracking-tight text-surface-900 sm:text-3xl">{title}</h2><p className="mt-2 text-sm leading-relaxed text-surface-600 sm:text-base">{description}</p></div>
}

function ValueCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <article className="flex flex-col justify-between rounded-xl border border-surface-300 bg-surface-100 p-6"><div><div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/10 text-brand-link"><Search size={18} /></div><h3 className="font-display text-lg font-bold text-surface-900">{title}</h3><p className="mt-2 text-sm leading-relaxed text-surface-600">{description}</p></div><div className="mt-7 rounded-lg border border-surface-300 bg-surface-50 p-3">{children}</div></article>
}

function Metric({ value, label }: { value: string; label: string }) {
  return <div className="rounded-md border border-surface-300 bg-surface-200 p-2"><strong className="block font-mono text-brand-link">{value}</strong><span className="text-surface-600">{label}</span></div>
}