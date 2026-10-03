import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Camera,
  CalendarDays,
  Check,
  Clock3,
  Copy,
  Gift,
  Heart,
  MessageCircle,
  MapPin,
  Menu,
  PackageCheck,
  Phone,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { api, formatDate } from './api'

type Campaign = {
  campaignName: string
  year: number
  eventDate: string
  eventTime: string
  deliveryDeadline: string
  deliveryLocation: string
  deliveryContact: string
  donationInfo: string
  introduction: string
  reservationMinutes: number
}

type Child = {
  id: string
  publicCode: string
  name?: string
  genderLabel?: string
  ageLabel?: string
  status: 'AVAILABLE' | 'SPONSORED' | 'RECEIVED'
  clothingSize?: string
  pantsSize?: string
  shoeSize?: string
  toySuggestion?: string
}

type PublicData = {
  campaign: Campaign
  children: Child[]
  counts: Record<string, number>
}

type ContactForm = {
  name: string
  whatsapp: string
  email: string
  city: string
}

type Reservation = {
  id: string
  expiresAt: string
  children: Array<Pick<Child, 'id' | 'publicCode' | 'genderLabel' | 'clothingSize' | 'pantsSize' | 'shoeSize' | 'toySuggestion'>>
}

const emptyForm: ContactForm = { name: '', whatsapp: '', email: '', city: '' }

function whatsAppHref(phone: string, text: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
}

function CampaignShare() {
  const [copied, setCopied] = useState(false)
  const link = window.location.origin
  const text = `Faça parte do Natal Solidário 2026. Apadrinhe uma criança e ajude a preparar um presente especial: ${link}`

  async function copyForInstagram() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="share-strip">
      <span>Convide mais gente para participar</span>
      <div>
        <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a>
        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`} target="_blank" rel="noreferrer"><Share2 size={15} /> Facebook</a>
        <button type="button" onClick={() => void copyForInstagram()}><Camera size={15} /> {copied ? 'Texto copiado' : 'Copiar texto para Instagram'}</button>
        <button type="button" onClick={() => void navigator.clipboard.writeText(link)}><Copy size={15} /> Copiar link</button>
      </div>
    </div>
  )
}

function AppHeader({ contact }: { contact: string }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const shareText = 'Faça parte do Natal Solidário 2026. Escolha uma criança e ajude a preparar um presente especial.'
  const shareUrl = typeof window === 'undefined' ? '' : window.location.origin

  async function shareCampaign() {
    if (navigator.share) {
      await navigator.share({ title: 'Natal Solidário 2026', text: shareText, url: shareUrl })
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`)
      window.alert('Link da campanha copiado.')
    }
  }

  return (
    <>
      <div className="notice-bar">
        <span><Sparkles size={14} /> Natal Solidário 2026</span>
        <a href={whatsAppHref(contact, 'Olá! Gostaria de saber mais sobre a campanha Natal Solidário 2026.')} target="_blank" rel="noreferrer">
          <Phone size={13} /> Fale com a organização
        </a>
      </div>
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Natal Solidário, início">
          <span className="brand-mark"><Gift size={21} strokeWidth={1.8} /></span>
          <span>Natal <strong>Solidário</strong><small>ARTUR ALVIM · 2026</small></span>
        </a>
        <button className="mobile-menu icon-button" type="button" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav className={menuOpen ? 'main-nav is-open' : 'main-nav'} aria-label="Navegação principal">
          <a href="#como-funciona" onClick={() => setMenuOpen(false)}>Como funciona</a>
          <a href="#criancas" onClick={() => setMenuOpen(false)}>Crianças</a>
          <a href="#duvidas" onClick={() => setMenuOpen(false)}>Dúvidas</a>
          <button className="nav-share" type="button" onClick={shareCampaign}><Share2 size={16} /> Compartilhar</button>
          <a className="nav-admin" href="/admin" aria-label="Área da organização"><ShieldCheck size={16} /> Organização</a>
        </nav>
      </header>
    </>
  )
}

function ChildCard({
  child,
  selected,
  onToggle,
}: {
  child: Child
  selected: boolean
  onToggle: (id: string) => void
}) {
  const available = child.status === 'AVAILABLE'
  const sponsored = child.status === 'SPONSORED'
  const received = child.status === 'RECEIVED'

  const statusLabel =
    child.status === 'AVAILABLE'
      ? 'Disponível'
      : child.status === 'RECEIVED'
        ? 'Presente recebido'
        : 'Apadrinhada'

  return (
    <article
      className={`child-card${selected ? ' is-selected' : ''}${available ? '' : ' is-unavailable'}${sponsored ? ' is-sponsored' : ''}`}
    >
      <div className="child-card-top">
        <span className="child-code" aria-label={`Cartão ${child.publicCode}`}>
          🎄 {child.publicCode}
        </span>

        <span className={`status-pill status-${child.status.toLowerCase()}`}>
          <span />
          {statusLabel}
        </span>
      </div>

      <div className="child-details">
        <div className="child-name-row">
          <div>
            <span className="card-label">CRIANÇA</span>
            <h3>{child.name || 'Nome não informado'}</h3>
          </div>

          <span className="child-smile" aria-hidden="true">
            {received ? '📦' : sponsored ? '❤️' : '🎁'}
          </span>
        </div>

        <div className="child-meta">
          <span>
            <strong>Gênero</strong>
            {child.genderLabel || 'Não informado'}
          </span>

          <span>
            <strong>Idade</strong>
            {child.ageLabel || 'Não informada'}
          </span>
        </div>

        <div className="gift-specs">
          <span>
            <i>ROUPA</i>
            {child.clothingSize ? `Tamanho ${child.clothingSize}` : 'A confirmar'}
          </span>

          <span>
            <i>CALÇADO</i>
            {child.shoeSize ? `Nº ${child.shoeSize}` : 'A confirmar'}
          </span>
        </div>

        <div className="child-toy">
          <i>🎁 BRINQUEDO</i>
          <span>{child.toySuggestion || 'A escolher'}</span>
        </div>

        {available ? (
          <button
            className={selected ? 'select-child selected' : 'select-child'}
            type="button"
            onClick={() => onToggle(child.id)}
            aria-pressed={selected}
          >
            {selected ? (
              <>
                <Check size={16} />
                Cartão selecionado
              </>
            ) : (
              <>
                Quero este cartão
                <ArrowRight size={15} />
              </>
            )}
          </button>
        ) : (
          <p className="unavailable-note">
            {received
              ? 'Presente recebido. Obrigado por fazer parte desta corrente. ❤️'
              : 'Obrigado a quem já apadrinhou esta criança. ❤️'}
          </p>
        )}
      </div>
    </article>
  )
}

function ReservationDialog({
  step,
  form,
  reservation,
  campaign,
  busy,
  error,
  onFormChange,
  onReserve,
  onConfirm,
  onClose,
}: {
  step: 'contact' | 'confirm' | 'done'
  form: ContactForm
  reservation: Reservation | null
  campaign: Campaign
  busy: boolean
  error: string
  onFormChange: (form: ContactForm) => void
  onReserve: (event: React.FormEvent<HTMLFormElement>) => void
  onConfirm: () => void
  onClose: () => void
}) {
  const [accepted, setAccepted] = useState(false)
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    if (!reservation) return
    const update = () => {
      const seconds = Math.max(0, Math.floor((new Date(reservation.expiresAt).getTime() - Date.now()) / 1000))
      setRemaining(`${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`)
    }
    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [reservation])

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="reservation-dialog" role="dialog" aria-modal="true" aria-labelledby="reservation-title">
        <button className="dialog-close icon-button" type="button" aria-label="Fechar" onClick={onClose}><X size={20} /></button>
        {step === 'contact' && <>
          <span className="eyebrow">UM GESTO QUE FICA</span>
          <h2 id="reservation-title">Vamos preparar esse presente?</h2>
          <p className="dialog-intro">Deixe um contato para receber as orientações da campanha. Não é necessário criar uma conta.</p>
          <form className="contact-form" onSubmit={onReserve}>
            <label>Nome completo<input required maxLength={120} autoComplete="name" value={form.name} onChange={(event) => onFormChange({ ...form, name: event.target.value })} /></label>
            <div className="form-row">
              <label>WhatsApp<input required inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" value={form.whatsapp} onChange={(event) => onFormChange({ ...form, whatsapp: event.target.value })} /></label>
              <label>Cidade<input autoComplete="address-level2" value={form.city} onChange={(event) => onFormChange({ ...form, city: event.target.value })} /></label>
            </div>
            <label>E-mail <span className="optional-label">opcional</span><input type="email" autoComplete="email" value={form.email} onChange={(event) => onFormChange({ ...form, email: event.target.value })} /></label>
            <label className="consent-check"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} required />
              <span>Concordo com o uso dos meus dados para organizar este apadrinhamento e aceito os termos da campanha.</span>
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button-green button-wide" type="submit" disabled={busy || !accepted}>
              {busy ? 'Reservando...' : <>Continuar <ArrowRight size={17} /></>}
            </button>
            <p className="privacy-note"><ShieldCheck size={14} /> Seus dados de contato não serão exibidos publicamente.</p>
          </form>
        </>}
        {step === 'confirm' && reservation && <>
          <span className="eyebrow">RESERVA TEMPORÁRIA</span>
          <h2 id="reservation-title">Confira seu kit</h2>
          <p className="dialog-intro">Os itens abaixo estão separados para você. Confirme para concluir o apadrinhamento.</p>
          <div className="reservation-list">
            {reservation.children.map((child) => <div className="reservation-line" key={child.id}>
              <strong>{child.publicCode}</strong>
              <span>{child.genderLabel || 'Gênero não informado'}</span>
              <span>Roupa {child.clothingSize || 'a confirmar'} · Calça {child.pantsSize || 'a confirmar'} · Calçado {child.shoeSize || 'a confirmar'}</span>
              <span>Brinquedo: {child.toySuggestion || 'a combinar'}</span>
            </div>)}
          </div>
          <div className="reservation-timer"><Clock3 size={15} /> A reserva expira em <strong>{remaining}</strong></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-green button-wide" type="button" onClick={onConfirm} disabled={busy || remaining === '00:00'}>
            {busy ? 'Confirmando...' : <>Confirmar apadrinhamento <Heart size={17} /></>}
          </button>
            <p className="privacy-note"><ShieldCheck size={14} /> O catálogo mostra somente o primeiro nome autorizado e não exibe fotos sem consentimento.</p>
        </>}
        {step === 'done' && reservation && <>
          <span className="success-mark"><Heart size={24} fill="currentColor" /></span>
          <span className="eyebrow">APADRINHAMENTO CONFIRMADO</span>
          <h2 id="reservation-title">Obrigado, {form.name.split(' ')[0]}! ❤️</h2>
          <p className="dialog-intro">Hoje você escolheu transformar um simples presente em um momento de alegria, carinho e esperança. 🎄🎁</p>
          <p className="dialog-intro">{reservation.children.length === 1 ? 'Uma criança terá um Natal mais especial porque você decidiu participar.' : `${reservation.children.length} crianças terão um Natal mais especial porque você decidiu participar.`}</p>
          <p className="dialog-intro">Cada gesto conta. Cada presente carrega carinho. E quando muitas pessoas se unem, pequenos gestos se transformam em grandes histórias.</p>
          <p className="dialog-intro"><strong>Nossa gratidão por você fazer parte dessa corrente de solidariedade. ❤️</strong></p>
          <div className="reservation-list done-list">
            {reservation.children.map((child) => <div className="reservation-line" key={child.id}>
              <strong>{child.publicCode}</strong>
              <span>Roupa {child.clothingSize || 'a confirmar'} · Calça {child.pantsSize || 'a confirmar'} · Calçado {child.shoeSize || 'a confirmar'}</span>
              <span>Brinquedo: {child.toySuggestion || 'a combinar'}</span>
            </div>)}
          </div>
          <div className="delivery-summary">
            <span><CalendarDays size={16} /> <strong>Data limite para entrega: 30 de novembro de 2026</strong></span>
            <a className="button button-green button-wide" href="https://chat.whatsapp.com/L6O19cdymFEAvwfRD3bE8X" target="_blank" rel="noreferrer">
              <MessageCircle size={17} /> Entrar no grupo do WhatsApp
            </a>
            <span><MapPin size={16} /> {campaign.deliveryLocation}</span>
            <span><Gift size={16} /> 1 roupa, 1 par de calçados e 1 brinquedo</span>
          </div>
          <div className="group-welcome-message">
            <p><strong>💚 Mensagem de boas-vindas</strong></p>
            <p>🎄❤️ Seja muito bem-vindo(a) ao Natal Solidário 2026!</p>
            <p>Que alegria ter você conosco nessa corrente de amor e solidariedade. O seu gesto vai ajudar a tornar o Natal de uma criança muito mais especial. 🎁✨</p>
            <p><strong>📅 DATA LIMITE PARA ENTREGA DO PRESENTE: 30 DE NOVEMBRO DE 2026.</strong></p>
            <p>Pedimos que o presente seja entregue até essa data para que possamos organizar tudo com carinho e garantir que cada criança receba seu presente no grande dia. ❤️</p>
            <p>Este grupo será utilizado para receber orientações, avisos da campanha, tirar dúvidas e acompanhar essa corrente de solidariedade.</p>
            <p><strong>Muito obrigado por fazer parte disso. Juntos, podemos transformar um presente em uma lembrança para a vida toda. 🌟</strong></p>
          </div>
          <a className="button button-whatsapp button-wide" href={whatsAppHref(campaign.deliveryContact, `Olá! Acabei de apadrinhar ${reservation.children.map((child) => child.publicCode).join(', ')} no Natal Solidário 2026. 🎄❤️

Data limite para entrega do presente: 30 de novembro de 2026.

Gostaria de receber as orientações para a entrega. Muito obrigado!`)} target="_blank" rel="noreferrer">
            <Phone size={17} /> Enviar confirmação à organização
          </a>
          <p className="privacy-note">Ao entrar no grupo, a mensagem de boas-vindas acima ficará disponível para você copiar e enviar. O WhatsApp não permite que o site envie mensagens automaticamente.</p>
          <button className="text-button done-close" type="button" onClick={onClose}>Voltar à campanha</button>
        </>}
      </section>
    </div>
  )
}

export default function PublicSite() {
  const [data, setData] = useState<PublicData | null>(null)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'available' | 'sponsored'>('all')
  const [selected, setSelected] = useState<string[]>([])
  const [flow, setFlow] = useState<'contact' | 'confirm' | 'done' | null>(null)
  const [form, setForm] = useState<ContactForm>(emptyForm)
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function loadCampaign() {
    try {
      setData(await api<PublicData>('/api/public/campaign'))
      setLoadError('')
    } catch (requestError) {
      setLoadError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar a campanha.')
    }
  }

  useEffect(() => {
    let active = true
    api<PublicData>('/api/public/campaign')
      .then((result) => {
        if (!active) return
        setData(result)
        setLoadError('')
      })
      .catch((requestError) => {
        if (active) setLoadError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar a campanha.')
      })
    return () => { active = false }
  }, [])

  const campaign = data?.campaign
  const loading = data === null && !loadError
  const visibleChildren = useMemo(() => {
    if (!data) return []
    return data.children.filter((child) => {
      const matchesFilter = filter === 'all' || (filter === 'available'
        ? child.status === 'AVAILABLE'
        : ['SPONSORED', 'RECEIVED'].includes(child.status))
      const matchesSearch = child.publicCode.toLowerCase().includes(search.trim().toLowerCase())
      return matchesFilter && matchesSearch
    })
  }, [data, filter, search])

  function toggleChild(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id])
  }

  async function reserve(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await api<Reservation>('/api/reservations', {
        method: 'POST',
        body: JSON.stringify({ ...form, childIds: selected, termsAccepted: true }),
      })
      setReservation(response)
      setFlow('confirm')
      await loadCampaign()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível reservar agora.')
      await loadCampaign()
    } finally {
      setBusy(false)
    }
  }

  async function confirm() {
    if (!reservation) return
    setBusy(true)
    setError('')
    try {
      await api(`/api/reservations/${reservation.id}/confirm`, { method: 'POST' })
      setFlow('done')
      setSelected([])
      await loadCampaign()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível confirmar a reserva.')
      await loadCampaign()
    } finally {
      setBusy(false)
    }
  }

  async function closeFlow() {
    if (flow === 'confirm' && reservation) {
      try { await api(`/api/reservations/${reservation.id}/cancel`, { method: 'POST' }) } catch { /* expiração automática mantém a vaga segura */ }
    }
    setFlow(null)
    setReservation(null)
    setSelected([])
    setError('')
    await loadCampaign()
  }

  const availableCount = data?.counts.AVAILABLE || 0
  const sponsoredCount = (data?.counts.SPONSORED || 0) + (data?.counts.RECEIVED || 0) + (data?.counts.DELIVERED || 0)

  return (
    <div className="public-site">
      <AppHeader contact={campaign?.deliveryContact || '5511945963712'} />
      <main>
        <section className="campaign-hero" id="inicio">
          <div className="hero-copy">
            <p className="eyebrow"><Sparkles size={14} /> UMA CORRENTE DE CUIDADO</p>
            <h1>Natal Solidário <span>{campaign?.year || 2026}</span></h1>
            <p className="hero-lead">{campaign?.introduction || 'Escolha um cartão, prepare um presente e faça uma criança sorrir.'}</p>
            <p className="hero-support">Escolha uma criança, torne-se padrinho ou madrinha e prepare um kit especial: roupa, calçado e brinquedo.</p>
            <div className="hero-actions">
              <a className="button button-green" href="#criancas">Apadrinhar uma criança <ArrowRight size={17} /></a>
              <a className="button button-quiet" href={whatsAppHref(campaign?.deliveryContact || '5511945963712', 'Olá! Quero saber como apoiar o Natal Solidário 2026.')} target="_blank" rel="noreferrer"><Heart size={16} /> Quero ajudar</a>
            </div>
            <a className="donation-note" href={whatsAppHref(campaign?.deliveryContact || '5511945963712', 'Olá! Quero saber como fazer uma doação para o Natal Solidário.')} target="_blank" rel="noreferrer"><Heart size={15} />{campaign?.donationInfo || 'Faça uma doação. Informe-se pelo WhatsApp da campanha.'}<ArrowRight size={14} /></a>
            <div className="hero-facts">
              <span><CalendarDays size={16} /> {campaign ? formatDate(campaign.eventDate) : '19 de dezembro'} · {campaign?.eventTime || '12:00'}</span>
              <span><MapPin size={16} /> Artur Alvim, São Paulo</span>
            </div>
          </div>
          <div className="hero-visual">
            <img src={`${import.meta.env.BASE_URL}images/ChatGPT%20Image%2029%20de%20set.%20de%202026,%2021_23_42.png`} alt="Imagem da campanha Natal Solidário" />
            <div className="visual-caption"><span><Gift size={18} /></span><p>Um kit preparado com carinho<small>Roupa · calçado · brinquedo</small></p></div>
            <div className="visual-stamp">NATAL<br /><b>2026</b></div>
          </div>
          <div className="hero-bottom-note"><span>ENTREGA DOS KITS ATÉ</span><strong>{campaign ? formatDate(campaign.deliveryDeadline) : '30 de novembro de 2026'}</strong></div>
        </section>

        <section className="campaign-numbers" aria-label="Resumo da campanha">
          <div><strong>{loading ? '—' : availableCount}</strong><span>crianças esperando<br />por um padrinho</span></div>
          <div><strong>{loading ? '—' : sponsoredCount}</strong><span>já receberam<br />um padrinho</span></div>
          <p>Um presente pode virar uma lembrança para a vida toda.</p>
        </section>

        <section className="gift-stories" aria-labelledby="gift-stories-title">
          <div className="gift-stories-inner">
            <div className="gift-stories-heading">
              <div><p className="eyebrow">CARINHO QUE CHEGA EM FORMA DE PRESENTE</p><h2 id="gift-stories-title">Pequenos gestos, grandes sorrisos</h2></div>
              <p>Brinquedos para imaginar. Roupas para acolher. Um Natal preparado com cuidado.</p>
            </div>
            <div className="gift-stories-grid">
              <figure className="gift-story">
                <img src={`${import.meta.env.BASE_URL}images/ChatGPT%20Image%2029%20de%20set.%20de%202026,%2017_44_15.png`} alt="A alegria de ganhar um brinquedo" loading="lazy" />
                <figcaption><strong>A alegria de ganhar um brinquedo</strong><a href="https://www.pexels.com/photo/parents-handing-toys-to-smiling-little-boy-7985454/" target="_blank" rel="noreferrer">Foto: George Pak / Pexels</a></figcaption>
              </figure>
              <figure className="gift-story">
                <img src={`${import.meta.env.BASE_URL}images/ChatGPT%20Image%2029%20de%20set.%20de%202026,%2017_32_28.png`} alt="Roupas entregues com carinho em uma ação solidária" loading="lazy" />
                <figcaption><strong>Roupas entregues com carinho</strong><a href="https://www.pexels.com/photo/volunteers-handing-clothes-to-children-15311442/" target="_blank" rel="noreferrer">Foto: Akh Taufiq / Pexels</a></figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section className="how-section section-wrap" id="como-funciona">
          <div className="section-heading">
            <div><p className="eyebrow">SIMPLES DE FAZER, BONITO DE RECEBER</p><h2>Como funciona</h2></div>
            <p>Você escolhe. A gente organiza. Uma criança celebra.</p>
          </div>
          <div className="steps-list">
            <article><span>01</span><Gift size={21} /><h3>Escolha</h3><p>Veja os kits disponíveis e escolha uma ou mais crianças.</p></article>
            <article><span>02</span><Heart size={21} /><h3>Confirme</h3><p>Informe um contato e confirme seu compromisso, sem criar conta.</p></article>
            <article><span>03</span><PackageCheck size={21} /><h3>Prepare</h3><p>Monte um kit com roupa, calçado e um brinquedo.</p></article>
            <article><span>04</span><MapPin size={21} /><h3>Entregue</h3><p>Leve os presentes ao local da campanha até a data combinada.</p></article>
          </div>
        </section>

        <section className="children-section" id="criancas">
          <div className="section-wrap">
            <div className="section-heading children-heading">
              <div><p className="eyebrow">O PRÓXIMO PRESENTE PODE SER O SEU</p><h2>Escolha uma criança</h2></div>
              <div className="children-heading-side">
                <img src={`${import.meta.env.BASE_URL}images/ChatGPT%20Image%2029%20de%20set.%20de%202026,%2017_57_01.png`} alt="Crianças participando de uma ação solidária" />
                <p>Cada criança aparece com as informações necessárias para montar o kit. Crianças apadrinhadas continuam na lista.</p>
              </div>
            </div>
            <div className="catalog-toolbar">
              <div className="filter-tabs" role="group" aria-label="Filtrar crianças">
                <button className={filter === 'available' ? 'active' : ''} type="button" onClick={() => setFilter('available')}>Disponíveis <span>{availableCount}</span></button>
                <button className={filter === 'all' ? 'active' : ''} type="button" onClick={() => setFilter('all')}>Todas</button>
                <button className={filter === 'sponsored' ? 'active' : ''} type="button" onClick={() => setFilter('sponsored')}>Já apadrinhadas</button>
              </div>
              <label className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar criança" aria-label="Buscar criança pelo nome" /><kbd>⌘ K</kbd></label>
            </div>
            {loading && <div className="catalog-message">Carregando a lista da campanha...</div>}
            {!loading && loadError && <div className="catalog-message catalog-error"><p>{loadError}</p><button className="text-button" type="button" onClick={() => void loadCampaign()}>Tentar novamente</button></div>}
            {!loading && !loadError && visibleChildren.length === 0 && <div className="catalog-message">Nenhuma criança encontrada com esse filtro.</div>}
            {!loading && !loadError && visibleChildren.length > 0 && <div className="children-grid">
              {visibleChildren.map((child) => <ChildCard key={child.id} child={child} selected={selected.includes(child.id)} onToggle={toggleChild} />)}
            </div>}
            <div className="catalog-privacy"><ShieldCheck size={15} /><span>Os dados pessoais das crianças ficam restritos à organização. Fotos só são exibidas com autorização expressa.</span></div>
          </div>
        </section>

        <section className="delivery-section section-wrap">
          <div className="delivery-ornament"><Gift size={27} /><span>COM CARINHO</span></div>
          <div className="delivery-copy"><p className="eyebrow">ANOTE NA AGENDA</p><h2>Um encontro para celebrar juntos.</h2><p>Prepare o kit com os três itens e entregue à equipe da campanha antes do prazo.</p></div>
          <div className="delivery-details">
            <p><CalendarDays size={17} /><span><small>ENTREGA ATÉ</small>{campaign ? formatDate(campaign.deliveryDeadline) : '30 de novembro de 2026'}</span></p>
            <p><MapPin size={17} /><span><small>LOCAL</small>{campaign?.deliveryLocation || 'ADEBANKE Espaço Cultural, Artur Alvim'}</span></p>
            <p><Clock3 size={17} /><span><small>ENCONTRO DE NATAL</small>{campaign ? `${formatDate(campaign.eventDate)} · ${campaign.eventTime}` : '19 de dezembro · 12:00'}</span></p>
          </div>
        </section>

        <section className="faq-section section-wrap" id="duvidas">
          <div className="faq-heading"><p className="eyebrow">ANTES DE ESCOLHER</p><h2>Dúvidas frequentes</h2><p>Se precisar de ajuda, a organização está a uma mensagem de distância.</p><a className="text-link" href={whatsAppHref(campaign?.deliveryContact || '5511945963712', 'Olá! Tenho uma dúvida sobre o Natal Solidário.')} target="_blank" rel="noreferrer">Chamar no WhatsApp <ArrowRight size={15} /></a></div>
          <div className="faq-list">
            <details><summary>O que vem no kit? <span>+</span></summary><p>Uma roupa, um par de calçados e um brinquedo, escolhidos com base nas informações exibidas para cada criança.</p></details>
            <details><summary>Posso apadrinhar mais de uma criança? <span>+</span></summary><p>Sim. Selecione todos os códigos que deseja apadrinhar antes de continuar.</p></details>
            <details><summary>Como sei que a criança foi reservada? <span>+</span></summary><p>A lista é atualizada assim que a reserva começa. Cada reserva temporária tem prazo para confirmação e libera a vaga automaticamente se não for concluída.</p></details>
            <details><summary>O WhatsApp envia uma mensagem automaticamente? <span>+</span></summary><p>Não. A confirmação aparece nesta página e um botão abre uma mensagem pronta para você enviar à organização. O envio automático exige integração com a API oficial do WhatsApp.</p></details>
          </div>
        </section>

        <section className="closing-band"><div><span className="closing-heart"><Heart size={19} fill="currentColor" /></span><p>Uma infância merece<br /><strong>um Natal inesquecível.</strong></p></div><a className="button button-cream" href="#criancas">Escolher uma criança <ArrowRight size={17} /></a></section>
        <CampaignShare />
      </main>
      <footer className="site-footer"><a className="brand footer-brand" href="#inicio"><span className="brand-mark"><Gift size={19} /></span><span>Natal <strong>Solidário</strong><small>ARTUR ALVIM · 2026</small></span></a><p>Uma campanha feita com cuidado e respeito.</p><a href="/admin">Área da organização</a></footer>

      {selected.length > 0 && <div className="selection-bar"><div><span className="selection-count">{selected.length}</span><p><strong>{selected.length === 1 ? 'criança selecionada' : 'crianças selecionadas'}</strong><small>Você pode selecionar mais de uma.</small></p></div><button className="button button-green" type="button" onClick={() => { setError(''); setFlow('contact') }}>Continuar <ArrowRight size={17} /></button></div>}
      {flow && campaign && <ReservationDialog step={flow} form={form} reservation={reservation} campaign={campaign} busy={busy} error={error} onFormChange={setForm} onReserve={reserve} onConfirm={confirm} onClose={() => void closeFlow()} />}
    </div>
  )
}
