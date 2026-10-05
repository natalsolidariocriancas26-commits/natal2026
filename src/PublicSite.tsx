import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
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
  id: number
  publicCode: string
  name?: string
  genderLabel?: string
  ageLabel?: string
  status: 'AVAILABLE' | 'RESERVED' | 'SPONSORED' | 'RECEIVED' | 'DELIVERED'
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
  children: Array<Pick<Child, 'id' | 'publicCode' | 'name' | 'genderLabel' | 'ageLabel' | 'clothingSize' | 'pantsSize' | 'shoeSize' | 'toySuggestion'>>
}

const emptyForm: ContactForm = { name: '', whatsapp: '', email: '', city: '' }

function whatsAppHref(phone: string, text: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
}

// endereço oficial do site, usado nos convites e no botão Copiar link
const SITE_URL = 'https://natalsolidariocriancas26-commits.github.io/natal2026/'

function CampaignShare() {
  const [copied, setCopied] = useState(false)
  const link = SITE_URL
  const text = `Faça parte do Natal Solidário 2026. Apadrinhe uma criança e ajude a preparar um presente especial: ${link}`

  async function copyLink() {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="share-strip">
      <span>Convide mais gente para participar: <a className="share-site-link" href={link} target="_blank" rel="noreferrer">{link}</a></span>
      <div>
        <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a>
        <button type="button" onClick={() => void copyLink()}><Copy size={15} /> {copied ? 'Link copiado' : 'Copiar link'}</button>
      </div>
    </div>
  )
}

const inviteText = `Oi! Estou participando do Natal Solidário 2026 em Artur Alvim. Ainda tem criança esperando um padrinho ou madrinha. Escolha uma ou mais crianças e ajude a preparar um presente de Natal: ${SITE_URL}`

function InviteFriend({ waiting }: { waiting: number }) {
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    await navigator.clipboard.writeText(SITE_URL)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2500)
  }

  return (
    <section className="invite-friend section-wrap" aria-labelledby="invite-title">
      <div className="invite-copy">
        <p className="eyebrow"><Share2 size={14} /> AJUDE A ENCONTRAR MAIS PADRINHOS</p>
        <h2 id="invite-title">Mande para um amigo</h2>
        {waiting > 0 && <p className="invite-count"><strong>{waiting}</strong><span>{waiting === 1 ? 'criança ainda está esperando' : 'crianças ainda estão esperando'}<br />por um padrinho</span></p>}
        <p>Compartilhe o site com amigos e familiares: cada convite pode virar o presente de uma ou várias crianças.</p>
      </div>
      <div className="invite-actions">
        <a className="button button-whatsapp invite-button" href={`https://wa.me/?text=${encodeURIComponent(inviteText)}`} target="_blank" rel="noreferrer"><MessageCircle size={22} /> Enviar para um amigo</a>
        <button className="button button-quiet invite-copy-button" type="button" onClick={() => void copyLink()}><Copy size={17} /> {copied ? 'Link copiado!' : 'Copiar link do site'}</button>
      </div>
    </section>
  )
}

function AppHeader({ contact, onDonate }: { contact: string; onDonate: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const shareText = 'Faça parte do Natal Solidário 2026. Escolha uma criança e ajude a preparar um presente especial.'
  const shareUrl = SITE_URL

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
          <Phone size={18} /> Fale com a organização
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
          <button className="nav-admin" type="button" onClick={() => { setMenuOpen(false); onDonate() }}><Heart size={19} /> Quero doar</button>
          <button className="nav-share" type="button" onClick={shareCampaign}><Share2 size={19} /> Compartilhar</button>
        </nav>
      </header>
    </>
  )
}

function ChildCard({ child, selected, onToggle }: { child: Child; selected: boolean; onToggle: (id: number) => void }) {
  const available = child.status === 'AVAILABLE'
  const sponsored = ['SPONSORED', 'RECEIVED', 'DELIVERED'].includes(child.status)
  const statusLabel = child.status === 'AVAILABLE' ? 'Disponível'
    : child.status === 'RESERVED' ? 'Em reserva'
      : child.status === 'RECEIVED' ? 'Presente recebido'
        : child.status === 'DELIVERED' ? 'Entregue' : 'Já apadrinhado'

  return (
    <article className={`child-card${selected ? ' is-selected' : ''}${available ? '' : ' is-unavailable'}${sponsored ? ' is-sponsored' : ''}`}>
      <div className="child-card-top">
        <span className="child-code"><span className="child-tree" aria-hidden="true">🎄</span>{child.publicCode}</span>
        <span className={`status-pill status-${child.status.toLowerCase()}`}><span />{statusLabel}</span>
      </div>
      <div className="child-details">
        <div
          className="child-name-row"
          style={{
            display: 'flex',
            visibility: 'visible',
            opacity: 1,
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <div style={{ display: 'block', visibility: 'visible', opacity: 1, minWidth: 0, flex: '1 1 auto' }}>
            <span
              className="card-label"
              style={{
                display: 'block',
                visibility: 'visible',
                opacity: 1,
                marginBottom: '3px',
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '1.1px',
              }}
            >
              CRIANÇA
            </span>
            <h3
              style={{
                display: 'block',
                visibility: 'visible',
                opacity: 1,
                margin: 0,
              }}
            >
              {child.name?.trim() || 'Nome não informado'}
            </h3>
          </div>
          <span className="child-smile" aria-hidden="true">{sponsored ? '😄' : '😊'}</span>
        </div>
        <div className="child-meta">
          <span>{child.genderLabel || 'Menino ou menina'}</span>
          <span>{child.ageLabel || 'Idade não informada'}</span>
        </div>
        <div className="gift-specs">
          {child.clothingSize && <span><i>ROUPA</i> tam. {child.clothingSize}</span>}
          {child.shoeSize && <span><i>CALÇADO</i> nº {child.shoeSize}</span>}
        </div>
        <div className="child-toy"><i>BRINQUEDO</i><span>{child.toySuggestion || 'A definir'}</span></div>
        {available ? (
          <button className={selected ? 'select-child selected' : 'select-child'} type="button" onClick={() => onToggle(child.id)} aria-pressed={selected}>
            {selected ? <><Check size={16} /> Selecionada</> : <>Quero apadrinhar <ArrowRight size={15} /></>}
          </button>
        ) : <p className="unavailable-note">{sponsored ? 'Obrigado a quem já apadrinhou esta criança.' : 'Agradecemos por fazer parte desta corrente.'}</p>}
      </div>
    </article>
  )
}

// imagens ficam em public/images (funciona também no GitHub Pages)
function imageUrl(file: string) {
  return `${import.meta.env.BASE_URL}images/${file}`
}

const PIX_KEY = 'pretallinda@gmail.com'
// link de convite do grupo de WhatsApp dos padrinhos (ex.: https://chat.whatsapp.com/...)
const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/L6O19cdymFEAvwfRD3bE8X'

function DonationDialog({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  async function copyPix() {
    await navigator.clipboard.writeText(PIX_KEY)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="reservation-dialog" role="dialog" aria-modal="true" aria-labelledby="donation-title">
        <button className="dialog-close icon-button" type="button" aria-label="Fechar" onClick={onClose}><X size={20} /></button>
        <img className="donation-photo" src={imageUrl('kids-christmas-lunch.jpg')} alt="Crianças felizes no almoço de Natal" />
        <span className="eyebrow">FAÇA UMA DOAÇÃO</span>
        <h2 id="donation-title">Quero doar</h2>
        <p className="dialog-intro">O valor arrecadado será usado para montar a festa e o almoço de Natal das crianças, incluindo os alimentos e os materiais necessários para o almoço. Use a chave Pix abaixo.</p>
        <div className="delivery-summary">
          <span><Heart size={16} /> Chave Pix (e-mail): <strong>{PIX_KEY}</strong></span>
          <span><ShieldCheck size={16} /> Banco: Caixa Econômica Federal</span>
          <span><Gift size={16} /> Favorecida: Lucelaine J. Carvalho Oliveira</span>
        </div>
        <button className="button button-green button-wide" type="button" onClick={() => void copyPix()}>
          {copied ? <><Check size={17} /> Chave Pix copiada</> : <><Copy size={17} /> Copiar chave Pix</>}
        </button>
        <button className="text-button done-close" type="button" onClick={onClose}>Voltar à campanha</button>
      </section>
    </div>
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
            <label>WhatsApp<input required inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" value={form.whatsapp} onChange={(event) => onFormChange({ ...form, whatsapp: event.target.value })} /></label>
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
              <strong>{child.publicCode}{child.name ? ` · ${child.name}` : ''}</strong>
              <span>{child.genderLabel || 'Gênero não informado'} · {child.ageLabel || 'Idade não informada'}</span>
              <span>Roupa tam. {child.clothingSize || 'a confirmar'} · Calçado nº {child.shoeSize || 'a confirmar'}</span>
              <span>Brinquedo: {child.toySuggestion || 'à escolha'}</span>
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
          <h2 id="reservation-title">Obrigado, {form.name.split(' ')[0]}.</h2>
          <p className="dialog-intro">Seu gesto vai fazer parte do Natal de {reservation.children.length === 1 ? 'uma criança' : `${reservation.children.length} crianças`}.</p>
          <div className="reservation-list done-list">
            {reservation.children.map((child) => <div className="reservation-line done-line" key={child.id}>
              <small>{child.publicCode}</small>
              <strong className="done-name">{child.name || 'Criança apadrinhada'}</strong>
              <span>{child.genderLabel || 'Gênero não informado'} · {child.ageLabel || 'Idade não informada'}</span>
              <ul className="done-gifts">
                <li><Gift size={15} /> Roupa <b>tam. {child.clothingSize || 'a confirmar'}</b></li>
                <li><Gift size={15} /> Calçado <b>nº {child.shoeSize || 'a confirmar'}</b></li>
                <li><Gift size={15} /> Brinquedo <b>{child.toySuggestion || 'à escolha'}</b></li>
              </ul>
            </div>)}
          </div>
          <p className="done-deadline"><CalendarDays size={20} /> Entregar até <strong>{formatDate(campaign.deliveryDeadline)}</strong></p>
          {WHATSAPP_GROUP_URL && <a className="button button-whatsapp button-wide done-group" href={WHATSAPP_GROUP_URL} target="_blank" rel="noreferrer">
            <MessageCircle size={18} /> Entrar no grupo do WhatsApp
          </a>}
          <div className="delivery-summary">
            <span><MapPin size={16} /> {campaign.deliveryLocation}</span>
            <span><Gift size={16} /> 1 roupa, 1 par de calçados e 1 brinquedo</span>
          </div>
          <a className="button button-whatsapp button-wide" href={whatsAppHref(campaign.deliveryContact, `Olá, ${form.name}! Confirmo meu apadrinhamento no Natal Solidário. Protocolo: ${reservation.children.map((child) => child.publicCode).join(', ')}.`)} target="_blank" rel="noreferrer">
            <Phone size={17} /> Falar com a organização no WhatsApp
          </a>
          <p className="privacy-note">Uma mensagem pronta será aberta para você enviar. O WhatsApp não envia mensagens automaticamente.</p>
          <a className="button button-quiet button-wide done-invite" href={`https://wa.me/?text=${encodeURIComponent(inviteText)}`} target="_blank" rel="noreferrer">
            <Share2 size={17} /> Convidar um amigo para apadrinhar também
          </a>
          <button className="text-button done-close" type="button" onClick={onClose}>Voltar à campanha</button>
        </>}
      </section>
    </div>
  )
}

export default function PublicSite() {
  const [data, setData] = useState<PublicData | null>(null)
  const [loadError, setLoadError] = useState('')
  const [filter, setFilter] = useState<'all' | 'available' | 'sponsored'>('all')
  const [selected, setSelected] = useState<number[]>([])
  const [flow, setFlow] = useState<'contact' | 'confirm' | 'done' | null>(null)
  const [form, setForm] = useState<ContactForm>(emptyForm)
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [donationOpen, setDonationOpen] = useState(false)

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
        : ['SPONSORED', 'RECEIVED', 'DELIVERED'].includes(child.status))
      return matchesFilter
    })
  }, [data, filter])

  function toggleChild(id: number) {
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
      // completa a reserva com as informações do cartão da criança
      setReservation({
        ...response,
        children: response.children.map((reserved) => ({
          ...data?.children.find((child) => String(child.id) === String(reserved.id)),
          ...reserved,
        })),
      })
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
      <AppHeader contact={campaign?.deliveryContact || '5511945963712'} onDonate={() => setDonationOpen(true)} />
      <main>
        <section className="campaign-hero" id="inicio">
          <div className="hero-copy">
            <img className="hero-photo" src={imageUrl('kids-gifts-hat.jpg')} alt="" aria-hidden="true" />
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
          <div className="hero-side">
          <aside className="donation-box" aria-labelledby="donation-box-title">
            <p className="eyebrow"><Heart size={14} /> TODA AJUDA FAZ DIFERENÇA</p>
            <h2 id="donation-box-title">Você também pode doar</h2>
            <p>Já apadrinhou uma criança e quer fazer ainda mais? Ou prefere apenas contribuir? Sua doação ajuda a montar a festa e o almoço de Natal das crianças, com os alimentos e materiais necessários.</p>
            <button className="button button-green donation-box-button" type="button" onClick={() => setDonationOpen(true)}><Gift size={22} /> Quero doar</button>
            <small>Doação via Pix · Caixa Econômica Federal</small>
          </aside>
          </div>
          <div className="hero-bottom-note"><span>ENTREGA DOS KITS ATÉ</span><strong>{campaign ? formatDate(campaign.deliveryDeadline) : '30 de novembro de 2026'}</strong></div>
        </section>

        <section className="campaign-numbers" aria-label="Resumo da campanha">
          <div><strong>{loading ? '—' : availableCount}</strong><span>crianças esperando<br />por um padrinho</span></div>
          <div><strong>{loading ? '—' : sponsoredCount}</strong><span>já receberam<br />um padrinho</span></div>
          <p>Um presente pode virar uma lembrança para a vida toda.</p>
        </section>

        <InviteFriend waiting={loading ? 0 : availableCount} />

        <section className="how-section section-wrap" id="como-funciona">
          <div className="section-heading">
            <div><p className="eyebrow">SIMPLES DE FAZER, BONITO DE RECEBER</p><h2>Como funciona</h2></div>
            <p className="how-motto">Você escolhe com o coração, <strong>a gente cuida de tudo</strong> e várias crianças ganham um Natal que nunca vão esquecer.</p>
          </div>
          <div className="path-wrap">
            <div className="path-photos" aria-hidden="true">
              <img src={imageUrl('kids-thumbs-up.jpg')} alt="" loading="lazy" />
              <img src={imageUrl('kids-opening-gifts.jpg')} alt="" loading="lazy" />
              <img src={imageUrl('kids-gifts-street.jpg')} alt="" loading="lazy" />
            </div>
          <ol className="path-steps">
            <li><span className="path-node">1</span><div className="path-card"><Gift size={20} /><h3>Escolha</h3><p>Marque uma ou mais crianças.</p></div></li>
            <li><span className="path-node">2</span><div className="path-card"><Heart size={20} /><h3>Confirme</h3><p>Informe um contato e confirme o apadrinhamento de uma ou várias crianças, sem criar conta.</p></div></li>
            <li><span className="path-node">3</span><div className="path-card"><PackageCheck size={20} /><h3>Prepare-se</h3><p>Monte o kit de cada criança com roupa, calçado e um brinquedo.</p></div></li>
            <li><span className="path-node">4</span><div className="path-card"><MapPin size={20} /><h3>Entregue</h3><p>Entregue o presente de cada criança ao organizador do evento até a data combinada.</p></div></li>
          </ol>
          </div>
          <p className="path-finish"><Sparkles size={16} /> No fim do caminho, uma ou várias crianças com um Natal inesquecível.</p>
        </section>

        <section className="children-section" id="criancas">
          <div className="section-wrap">
            <div className="section-heading children-heading">
              <div><p className="eyebrow">O PRÓXIMO PRESENTE PODE SER O SEU</p><h2>Escolha uma ou mais crianças</h2></div>
              <div className="children-heading-side">
                <p>Cada criança aparece com as informações necessárias para montar o kit. Crianças apadrinhadas continuam na lista.</p>
              </div>
            </div>
            <div className="catalog-toolbar">
              <div className="filter-tabs" role="group" aria-label="Filtrar crianças">
                <button className={filter === 'available' ? 'active' : ''} type="button" onClick={() => setFilter('available')}>Disponíveis <span>{availableCount}</span></button>
                <button className={filter === 'all' ? 'active' : ''} type="button" onClick={() => setFilter('all')}>Todas</button>
                <button className={filter === 'sponsored' ? 'active' : ''} type="button" onClick={() => setFilter('sponsored')}>Já apadrinhadas</button>
              </div>
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
            <p><CalendarDays size={26} /><span><small>ENTREGA ATÉ</small>{campaign ? formatDate(campaign.deliveryDeadline) : '30 de novembro de 2026'}</span></p>
            <p><MapPin size={26} /><span><small>LOCAL</small>{campaign?.deliveryLocation || 'ADEBANKE Espaço Cultural, Artur Alvim'}</span></p>
            <p><Clock3 size={26} /><span><small>ENCONTRO DE NATAL</small>{campaign ? `${formatDate(campaign.eventDate)} · ${campaign.eventTime}` : '19 de dezembro · 12:00'}</span></p>
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
      <footer className="site-footer"><a className="brand footer-brand" href="#inicio"><span className="brand-mark"><Gift size={19} /></span><span>Natal <strong>Solidário</strong><small>ARTUR ALVIM · 2026</small></span></a><p>Uma campanha feita com cuidado e respeito.</p></footer>

      {selected.length > 0 && <div className="selection-bar"><div><span className="selection-count">{selected.length}</span><p><strong>{selected.length === 1 ? 'criança selecionada' : 'crianças selecionadas'}</strong><small>Você pode selecionar mais de uma.</small></p></div><button className="button button-green" type="button" onClick={() => { setError(''); setFlow('contact') }}>Continuar <ArrowRight size={17} /></button></div>}
      {flow && campaign && <ReservationDialog step={flow} form={form} reservation={reservation} campaign={campaign} busy={busy} error={error} onFormChange={setForm} onReserve={reserve} onConfirm={confirm} onClose={() => void closeFlow()} />}
      {donationOpen && <DonationDialog onClose={() => setDonationOpen(false)} />}
    </div>
  )
}
