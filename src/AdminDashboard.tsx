import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Gift,
  Heart,
  LockKeyhole,
  LogOut,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  Truck,
  UsersRound,
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
  publicFields: string[]
}

type AdminChild = {
  id: number
  publicCode: string
  privateName: string
  ageLabel: string
  genderLabel: string
  clothingSize: string
  pantsSize: string
  shoeSize: string
  toySuggestion: string
  observations: string
  photoUrl: string
  nameAuthorized: number
  photoAuthorized: number
  status: string
  guardianName?: string
  guardianWhatsapp?: string
  deliveredAt?: string
  receivedBy?: string
  deliveryObservation?: string
}

type Sponsor = { id: number; name: string; whatsapp: string; email: string; city: string; confirmedAt: string; children: string }
type Overview = { counts: Record<string, number>; sponsors: Sponsor[]; campaign: Campaign }
type Tab = 'resumo' | 'criancas' | 'padrinhos' | 'campanha'

const statusLabels: Record<string, string> = {
  AVAILABLE: 'Disponível', RESERVED: 'Em reserva', SPONSORED: 'Apadrinhada', DELIVERED: 'Entregue', CANCELLED: 'Cancelada',
}
const publicFieldLabels: Record<string, string> = {
  name: 'Primeiro nome', gender: 'Menino ou menina', age: 'Idade', clothingSize: 'Tamanho da roupa', pantsSize: 'Tamanho da calça', shoeSize: 'Número do calçado', toySuggestion: 'Sugestão de brinquedo', photo: 'Foto autorizada',
}
const emptyChild = {
  privateName: '', ageLabel: '', genderLabel: '', clothingSize: '', pantsSize: '', shoeSize: '', toySuggestion: '',
  observations: '', photoUrl: '', nameAuthorized: false, photoAuthorized: false, status: 'AVAILABLE',
}

function dateInput(value: string) {
  return value ? value.slice(0, 10) : ''
}

function stateBar(counts: Record<string, number>) {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0) || 1
  return ['AVAILABLE', 'RESERVED', 'SPONSORED', 'DELIVERED', 'CANCELLED'].map((status) => ({ status, value: counts[status] || 0, width: `${((counts[status] || 0) / total) * 100}%` }))
}

function LoginScreen({ configured, onLogin }: { configured: boolean; onLogin: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try { await onLogin(password) } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível entrar.') }
    finally { setBusy(false) }
  }

  return (
    <main className="admin-login-page">
      <a className="login-back" href="/"><ArrowLeft size={16} /> Voltar à campanha</a>
      <section className="admin-login-panel">
        <span className="admin-login-mark"><LockKeyhole size={21} /></span>
        <p className="eyebrow">ACESSO DA EQUIPE</p>
        <h1>Área da organização</h1>
        <p className="login-copy">Acesso restrito a quem organiza o Natal Solidário.</p>
        {!configured ? <div className="setup-notice"><ShieldCheck size={18} /><p>Configure <code>ADMIN_PASSWORD</code> no arquivo local <code>.env</code> para ativar o acesso administrativo.</p></div> : <form className="login-form" onSubmit={submit}>
          <label>Senha da equipe<input autoFocus type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-green button-wide" type="submit" disabled={busy}>{busy ? 'Verificando...' : <>Entrar <ChevronRight size={17} /></>}</button>
        </form>}
        <p className="privacy-note"><ShieldCheck size={14} /> Dados de crianças e padrinhos são visíveis somente após autenticação.</p>
      </section>
    </main>
  )
}

function ChildForm({ child, onSave, onClose }: { child: AdminChild | null; onSave: (data: typeof emptyChild) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState({ ...emptyChild, ...(child || {}), nameAuthorized: Boolean(child?.nameAuthorized), photoAuthorized: Boolean(child?.photoAuthorized) })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try { await onSave(form) } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível salvar.') }
    finally { setBusy(false) }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="child-form-title">
        <button className="dialog-close icon-button" type="button" aria-label="Fechar" onClick={onClose}><X size={19} /></button>
        <p className="eyebrow">DADOS RESTRITOS À ORGANIZAÇÃO</p>
        <h2 id="child-form-title">{child ? `Editar ${child.publicCode}` : 'Cadastrar criança'}</h2>
        <form className="admin-form" onSubmit={submit}>
          <label>Nome completo<input required maxLength={120} value={form.privateName} onChange={(event) => setForm({ ...form, privateName: event.target.value })} /></label>
          <label className="consent-check"><input type="checkbox" checked={Boolean(form.nameAuthorized)} onChange={(event) => setForm({ ...form, nameAuthorized: event.target.checked })} /><span>Tenho autorização do responsável para publicar o primeiro nome desta criança.</span></label>
          <div className="form-row">
            <label>Idade<input placeholder="Ex.: 4 anos, 19 meses" value={form.ageLabel} onChange={(event) => setForm({ ...form, ageLabel: event.target.value })} /></label>
            <label>Gênero informado<select value={form.genderLabel} onChange={(event) => setForm({ ...form, genderLabel: event.target.value })}><option value="">Não informado</option><option>Menino</option><option>Menina</option><option>Outro</option></select></label>
          </div>
          <div className="form-row">
            <label>Tamanho da roupa<input value={form.clothingSize} onChange={(event) => setForm({ ...form, clothingSize: event.target.value })} /></label>
            <label>Tamanho da calça<input value={form.pantsSize} onChange={(event) => setForm({ ...form, pantsSize: event.target.value })} /></label>
          </div>
          <div className="form-row">
            <label>Número do calçado<input value={form.shoeSize} onChange={(event) => setForm({ ...form, shoeSize: event.target.value })} /></label>
          </div>
          <label>Sugestão de brinquedo<input maxLength={160} value={form.toySuggestion} onChange={(event) => setForm({ ...form, toySuggestion: event.target.value })} /></label>
          <label>Observações internas<textarea rows={3} value={form.observations} onChange={(event) => setForm({ ...form, observations: event.target.value })} /></label>
          <label>Endereço da foto <span className="optional-label">opcional</span><input type="url" value={form.photoUrl} onChange={(event) => setForm({ ...form, photoUrl: event.target.value })} /></label>
          <label className="consent-check"><input type="checkbox" checked={Boolean(form.photoAuthorized)} onChange={(event) => setForm({ ...form, photoAuthorized: event.target.checked })} /><span>Tenho autorização documentada do responsável para uso desta foto.</span></label>
          {child && <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="dialog-actions"><button className="button button-quiet" type="button" onClick={onClose}>Cancelar</button><button className="button button-green" type="submit" disabled={busy}>{busy ? 'Salvando...' : <>Salvar cadastro <Check size={16} /></>}</button></div>
        </form>
      </section>
    </div>
  )
}

function DeliveryDialog({ child, onSave, onClose }: { child: AdminChild; onSave: (data: { deliveredAt: string; receivedBy: string; observation: string }) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState({ deliveredAt: '', receivedBy: '', observation: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try { await onSave(form) } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível registrar.') }
    finally { setBusy(false) }
  }
  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="admin-dialog delivery-dialog" role="dialog" aria-modal="true" aria-labelledby="delivery-title">
        <button className="dialog-close icon-button" type="button" aria-label="Fechar" onClick={onClose}><X size={19} /></button>
        <p className="eyebrow">CONTROLE DE ENTREGA · {child.publicCode}</p>
        <h2 id="delivery-title">Registrar presente entregue</h2>
        <form className="admin-form" onSubmit={submit}>
          <label>Data da entrega<input type="date" required value={form.deliveredAt} onChange={(event) => setForm({ ...form, deliveredAt: event.target.value })} /></label>
          <label>Responsável pelo recebimento<input required value={form.receivedBy} onChange={(event) => setForm({ ...form, receivedBy: event.target.value })} /></label>
          <label>Observação<textarea rows={3} value={form.observation} onChange={(event) => setForm({ ...form, observation: event.target.value })} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="dialog-actions"><button className="button button-quiet" type="button" onClick={onClose}>Cancelar</button><button className="button button-green" type="submit" disabled={busy}>{busy ? 'Salvando...' : <>Confirmar entrega <PackageCheck size={16} /></>}</button></div>
        </form>
      </section>
    </div>
  )
}

export default function AdminDashboard() {
  const [configured, setConfigured] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [children, setChildren] = useState<AdminChild[]>([])
  const [tab, setTab] = useState<Tab>('resumo')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [ageFilter, setAgeFilter] = useState('')
  const [clothingFilter, setClothingFilter] = useState('')
  const [shoeFilter, setShoeFilter] = useState('')
  const [formChild, setFormChild] = useState<AdminChild | null | undefined>(undefined)
  const [deliveryChild, setDeliveryChild] = useState<AdminChild | null>(null)
  const [campaignForm, setCampaignForm] = useState<Campaign | null>(null)
  const [notice, setNotice] = useState('')
  const [pageError, setPageError] = useState('')
  const [loading, setLoading] = useState(true)

  async function loadOverview() {
    const result = await api<Overview>('/api/admin/overview')
    setOverview(result)
    setCampaignForm(result.campaign)
  }

  async function loadChildren() {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    if (genderFilter) params.set('gender', genderFilter)
    if (ageFilter) params.set('age', ageFilter)
    if (clothingFilter) params.set('clothingSize', clothingFilter)
    if (shoeFilter) params.set('shoeSize', shoeFilter)
    setChildren(await api<AdminChild[]>(`/api/admin/children?${params.toString()}`))
  }

  async function refresh() {
    setPageError('')
    try { await Promise.all([loadOverview(), loadChildren()]) }
    catch (error) { setPageError(error instanceof Error ? error.message : 'Não foi possível atualizar os dados.') }
  }

  useEffect(() => {
    let active = true
    Promise.all([api<{ configured: boolean }>('/api/admin/status'), api<Overview>('/api/admin/overview')])
      .then(([status, result]) => {
        if (!active) return
        setConfigured(status.configured)
        setOverview(result)
        setCampaignForm(result.campaign)
        setAuthenticated(true)
      })
      .catch(async () => {
        try {
          const status = await api<{ configured: boolean }>('/api/admin/status')
          if (active) setConfigured(status.configured)
        } finally { if (active) setAuthenticated(false) }
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!authenticated) return
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    if (genderFilter) params.set('gender', genderFilter)
    if (ageFilter) params.set('age', ageFilter)
    if (clothingFilter) params.set('clothingSize', clothingFilter)
    if (shoeFilter) params.set('shoeSize', shoeFilter)
    let active = true
    api<AdminChild[]>(`/api/admin/children?${params.toString()}`)
      .then((result) => { if (active) setChildren(result) })
      .catch((error) => { if (active) setPageError(error.message) })
    return () => { active = false }
  }, [authenticated, search, statusFilter, genderFilter, ageFilter, clothingFilter, shoeFilter])

  async function login(password: string) {
    await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) })
    setAuthenticated(true)
    await refresh()
  }

  async function logout() {
    await api('/api/admin/logout', { method: 'POST' })
    setAuthenticated(false)
    setOverview(null)
  }

  async function saveChild(input: typeof emptyChild) {
    if (formChild) await api(`/api/admin/children/${formChild.id}`, { method: 'PUT', body: JSON.stringify(input) })
    else await api('/api/admin/children', { method: 'POST', body: JSON.stringify(input) })
    setFormChild(undefined)
    setNotice('Cadastro salvo.')
    await refresh()
  }

  async function removeChild(child: AdminChild) {
    if (!window.confirm(`Excluir o cadastro ${child.publicCode}?`)) return
    try {
      await api(`/api/admin/children/${child.id}`, { method: 'DELETE' })
      setNotice('Cadastro excluído.')
      await refresh()
    } catch (error) { setPageError(error instanceof Error ? error.message : 'Não foi possível excluir.') }
  }

  async function saveDelivery(input: { deliveredAt: string; receivedBy: string; observation: string }) {
    if (!deliveryChild) return
    await api(`/api/admin/children/${deliveryChild.id}/delivery`, { method: 'POST', body: JSON.stringify(input) })
    setDeliveryChild(null)
    setNotice('Entrega registrada.')
    await refresh()
  }

  async function saveCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!campaignForm) return
    setPageError('')
    try {
      const updated = await api<Campaign>('/api/admin/campaign', { method: 'PUT', body: JSON.stringify(campaignForm) })
      setCampaignForm(updated)
      setNotice('Configurações da campanha atualizadas.')
    } catch (error) { setPageError(error instanceof Error ? error.message : 'Não foi possível salvar a campanha.') }
  }

  if (loading) return <main className="admin-loading">Carregando área restrita...</main>
  if (!authenticated) return <LoginScreen configured={configured} onLogin={login} />

  const counts = overview?.counts || {}
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
  const tabs: Array<{ id: Tab; label: string; icon: typeof ClipboardList }> = [
    { id: 'resumo', label: 'Resumo', icon: ClipboardList },
    { id: 'criancas', label: 'Crianças', icon: UsersRound },
    { id: 'padrinhos', label: 'Padrinhos', icon: Heart },
    { id: 'campanha', label: 'Campanha', icon: Settings2 },
  ]

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a className="brand admin-brand" href="/"><span className="brand-mark"><Gift size={20} /></span><span>Natal <strong>Solidário</strong><small>ORGANIZAÇÃO · 2026</small></span></a>
        <div className="sidebar-label">CAMPANHA</div>
        <nav className="admin-nav" aria-label="Seções administrativas">
          {tabs.map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? 'active' : ''} type="button" onClick={() => setTab(id)}><Icon size={17} />{label}{tab === id && <ChevronRight size={15} />}</button>)}
        </nav>
        <div className="sidebar-bottom"><span className="admin-secure"><ShieldCheck size={15} /> Acesso protegido</span><a href="/" className="back-campaign"><ArrowLeft size={15} /> Ver campanha</a></div>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar"><div><p className="eyebrow">NATAL SOLIDÁRIO · 2026</p><h1>{tabs.find((item) => item.id === tab)?.label}</h1></div><div className="admin-top-actions"><span className="admin-user-chip"><span /> Organização</span><button className="icon-button" type="button" onClick={() => void logout()} aria-label="Sair" title="Sair"><LogOut size={18} /></button></div></header>
        {notice && <div className="admin-notice" role="status"><Check size={15} />{notice}<button className="icon-button" aria-label="Fechar aviso" type="button" onClick={() => setNotice('')}><X size={16} /></button></div>}
        {pageError && <div className="admin-error" role="alert">{pageError}<button className="icon-button" aria-label="Fechar erro" type="button" onClick={() => setPageError('')}><X size={16} /></button></div>}

        {tab === 'resumo' && <section className="admin-content">
          <div className="dashboard-intro"><div><span className="eyebrow">ACOMPANHAMENTO DA CAMPANHA</span><h2>Um retrato do que já aconteceu.</h2><p>Os números são atualizados conforme os apadrinhamentos e as entregas são registradas.</p></div><a className="button button-green" href="/" target="_blank" rel="noreferrer">Ver página pública <ArrowLeft className="external-arrow" size={16} /></a></div>
          <div className="stats-grid">
            <article className="stat-tile stat-total"><span>Total cadastradas</span><strong>{total}</strong><small>crianças na campanha</small><UsersRound size={21} /></article>
            <article className="stat-tile stat-available"><span>Disponíveis</span><strong>{counts.AVAILABLE || 0}</strong><small>aguardando padrinho</small><Gift size={21} /></article>
            <article className="stat-tile stat-sponsored"><span>Apadrinhadas</span><strong>{counts.SPONSORED || 0}</strong><small>presentes a preparar</small><Heart size={21} /></article>
            <article className="stat-tile stat-delivered"><span>Entregues</span><strong>{counts.DELIVERED || 0}</strong><small>kits recebidos</small><PackageCheck size={21} /></article>
            <article className="stat-tile stat-pending"><span>Pendentes</span><strong>{counts.RESERVED || 0}</strong><small>reserva aguardando confirmação</small><CalendarDays size={21} /></article>
          </div>
          <div className="dashboard-columns">
            <section className="dashboard-section progress-section"><div className="panel-heading"><div><span className="eyebrow">STATUS DA LISTA</span><h3>Progresso dos kits</h3></div><button className="text-link" type="button" onClick={() => setTab('criancas')}>Ver crianças <ChevronRight size={15} /></button></div>
              <div className="progress-track">{stateBar(counts).map((item) => <span key={item.status} className={`progress-segment segment-${item.status.toLowerCase()}`} style={{ width: item.width }} />)}</div>
              <div className="progress-legend">{stateBar(counts).map((item) => <div key={item.status}><span className={`legend-dot dot-${item.status.toLowerCase()}`} /><span>{statusLabels[item.status]}</span><strong>{item.value}</strong></div>)}</div>
            </section>
            <section className="dashboard-section next-deadline"><CalendarDays size={21} /><span className="eyebrow">PRÓXIMO MARCO</span><h3>Entrega dos kits</h3><strong>{formatDate(overview?.campaign.deliveryDeadline || '')}</strong><p>{overview?.campaign.deliveryLocation}</p></section>
          </div>
          <section className="dashboard-section recent-sponsors"><div className="panel-heading"><div><span className="eyebrow">PARTICIPAÇÃO</span><h3>Apadrinhamentos recentes</h3></div><button className="text-link" type="button" onClick={() => setTab('padrinhos')}>Ver padrinhos <ChevronRight size={15} /></button></div>
            {(overview?.sponsors.length || 0) === 0 ? <p className="empty-admin">Os apadrinhamentos confirmados aparecerão aqui. Registros importados aparecem na lista de crianças.</p> : <div className="sponsor-list">{overview?.sponsors.slice(0, 5).map((sponsor) => <div className="sponsor-row" key={sponsor.id}><span className="sponsor-avatar"><Heart size={16} /></span><div><strong>{sponsor.name}</strong><small>{sponsor.children}</small></div><span>{formatDate(sponsor.confirmedAt.slice(0, 10))}</span></div>)}</div>}
          </section>
        </section>}

        {tab === 'criancas' && <section className="admin-content">
          <div className="admin-section-heading"><div><span className="eyebrow">CADASTRO E DISPONIBILIDADE</span><h2>Crianças da campanha</h2><p>Identificação pública separada dos dados privados.</p></div><button className="button button-green" type="button" onClick={() => setFormChild(null)}><Plus size={17} /> Cadastrar criança</button></div>
          <div className="filter-panel">
            <label className="search-field"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome ou código" /></label>
            <select aria-label="Filtrar status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">Todos os status</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <select aria-label="Filtrar gênero" value={genderFilter} onChange={(event) => setGenderFilter(event.target.value)}><option value="">Todos os gêneros</option><option>Menino</option><option>Menina</option><option>Outro</option></select>
            <input aria-label="Filtrar idade" value={ageFilter} onChange={(event) => setAgeFilter(event.target.value)} placeholder="Idade" />
            <input aria-label="Filtrar tamanho da roupa" value={clothingFilter} onChange={(event) => setClothingFilter(event.target.value)} placeholder="Roupa" />
            <input aria-label="Filtrar número do calçado" value={shoeFilter} onChange={(event) => setShoeFilter(event.target.value)} placeholder="Calçado" />
          </div>
          <div className="admin-table-wrap"><table className="children-table"><thead><tr><th>Criança</th><th>Idade</th><th>Gênero</th><th>Roupa · calçado</th><th>Padrinho(a)</th><th>Telefone</th><th>Status</th><th><span className="sr-only">Ações</span></th></tr></thead><tbody>
            {children.map((child) => <tr key={child.id}><td><strong>{child.privateName}</strong><small>{child.publicCode}</small></td><td>{child.ageLabel || '—'}</td><td>{child.genderLabel || 'não informado'}</td><td>{child.clothingSize || '—'} · {child.shoeSize || '—'}</td><td>{child.guardianName || (child.status === 'SPONSORED' || child.status === 'DELIVERED' ? 'Registro importado' : '—')}</td><td>{child.guardianWhatsapp || '—'}</td><td><span className={`status-pill status-${child.status.toLowerCase()}`}><span />{statusLabels[child.status] || child.status}</span></td><td><div className="row-actions">{child.status === 'SPONSORED' && <button className="icon-button" type="button" onClick={() => setDeliveryChild(child)} title="Registrar entrega" aria-label={`Registrar entrega de ${child.publicCode}`}><Truck size={17} /></button>}<button className="icon-button" type="button" onClick={() => setFormChild(child)} title="Editar" aria-label={`Editar ${child.publicCode}`}><Pencil size={16} /></button>{(child.status === 'AVAILABLE' || child.status === 'CANCELLED') && <button className="icon-button danger-icon" type="button" onClick={() => void removeChild(child)} title="Excluir" aria-label={`Excluir ${child.publicCode}`}><Trash2 size={16} /></button>}</div></td></tr>)}
            {!children.length && <tr><td colSpan={8} className="empty-table">Nenhum cadastro corresponde aos filtros.</td></tr>}
          </tbody></table></div>
          <p className="table-count">{children.length} {children.length === 1 ? 'registro' : 'registros'} encontrados</p>
        </section>}

        {tab === 'padrinhos' && <section className="admin-content">
          <div className="admin-section-heading"><div><span className="eyebrow">CONTATOS DA CAMPANHA</span><h2>Padrinhos e madrinhas</h2><p>Contatos recebidos durante o apadrinhamento online.</p></div><span className="count-chip">{overview?.sponsors.length || 0} cadastros</span></div>
          <section className="dashboard-section sponsored-children-list"><div className="panel-heading"><div><span className="eyebrow">CONTROLE DOS KITS</span><h3>Crianças já apadrinhadas</h3></div><span className="count-chip">{children.filter((child) => child.status === 'SPONSORED' || child.status === 'DELIVERED').length}</span></div>
            <div className="sponsored-children-table"><div className="sponsored-children-header"><span>Criança</span><span>Padrinho(a)</span><span>Telefone</span><span>Status</span></div>
              {children.filter((child) => child.status === 'SPONSORED' || child.status === 'DELIVERED').map((child) => <div className="sponsored-children-row" key={child.id}><strong>{child.privateName}</strong><span>{child.guardianName || 'Registro importado'}</span><span>{child.guardianWhatsapp || 'Não registrado'}</span><span className={`status-pill status-${child.status.toLowerCase()}`}><span />{statusLabels[child.status]}</span></div>)}
              {!children.some((child) => child.status === 'SPONSORED' || child.status === 'DELIVERED') && <p className="empty-admin">Nenhuma criança apadrinhada registrada.</p>}
            </div>
          </section>
          <div className="sponsors-admin-list">{overview?.sponsors.map((sponsor) => <article className="sponsor-admin-row" key={sponsor.id}><span className="sponsor-avatar"><Heart size={17} /></span><div className="sponsor-admin-info"><strong>{sponsor.name}</strong><span>{sponsor.whatsapp}{sponsor.city ? ` · ${sponsor.city}` : ''}</span><small>{sponsor.email || 'Sem e-mail'} · {formatDate(sponsor.confirmedAt.slice(0, 10))}</small></div><div className="sponsor-children"><span>CRIANÇAS</span><strong>{sponsor.children}</strong></div><a className="icon-button whatsapp-admin" href={`https://wa.me/${sponsor.whatsapp}?text=${encodeURIComponent(`Olá, ${sponsor.name}! Obrigado por participar do Natal Solidário. Seu apadrinhamento: ${sponsor.children}. Entrega até ${formatDate(overview.campaign.deliveryDeadline)} em ${overview.campaign.deliveryLocation}.`)}`} target="_blank" rel="noreferrer" aria-label={`Enviar orientações para ${sponsor.name}`} title="Abrir WhatsApp com orientações"><Heart size={17} /></a></article>)}
            {!overview?.sponsors.length && <div className="empty-admin sponsor-empty"><UsersRound size={24} /><h3>Nenhum contato digital ainda</h3><p>Os novos padrinhos aparecerão aqui após confirmarem o apadrinhamento. As crianças já apadrinhadas antes da plataforma aparecem como registros importados.</p></div>}
          </div>
        </section>}

        {tab === 'campanha' && campaignForm && <section className="admin-content">
          <div className="admin-section-heading"><div><span className="eyebrow">INFORMAÇÕES PÚBLICAS</span><h2>Configurações da campanha</h2><p>Edite os dados que aparecem na página e controle a privacidade da lista.</p></div></div>
          <form className="campaign-settings-form" onSubmit={saveCampaign}>
            <section className="settings-block"><div className="settings-title"><CalendarDays size={18} /><div><h3>Datas e local</h3><p>Orientações exibidas após a confirmação.</p></div></div>
              <div className="form-row"><label>Nome da campanha<input required value={campaignForm.campaignName} onChange={(event) => setCampaignForm({ ...campaignForm, campaignName: event.target.value })} /></label><label>Ano<input type="number" min="2020" max="2100" value={campaignForm.year} onChange={(event) => setCampaignForm({ ...campaignForm, year: Number(event.target.value) })} /></label></div>
              <div className="form-row"><label>Data do encontro<input type="date" value={dateInput(campaignForm.eventDate)} onChange={(event) => setCampaignForm({ ...campaignForm, eventDate: event.target.value })} /></label><label>Horário<input type="time" value={campaignForm.eventTime} onChange={(event) => setCampaignForm({ ...campaignForm, eventTime: event.target.value })} /></label></div>
              <label>Prazo de entrega<input type="date" value={dateInput(campaignForm.deliveryDeadline)} onChange={(event) => setCampaignForm({ ...campaignForm, deliveryDeadline: event.target.value })} /></label>
              <label>Local de entrega<textarea rows={2} value={campaignForm.deliveryLocation} onChange={(event) => setCampaignForm({ ...campaignForm, deliveryLocation: event.target.value })} /></label>
              <div className="form-row"><label>WhatsApp da organização<input inputMode="tel" value={campaignForm.deliveryContact} onChange={(event) => setCampaignForm({ ...campaignForm, deliveryContact: event.target.value })} /></label><label>Tempo de reserva (minutos)<input type="number" min="5" max="120" value={campaignForm.reservationMinutes} onChange={(event) => setCampaignForm({ ...campaignForm, reservationMinutes: Number(event.target.value) })} /></label></div>
              <label>Texto de apresentação<textarea rows={3} value={campaignForm.introduction} onChange={(event) => setCampaignForm({ ...campaignForm, introduction: event.target.value })} /></label>
              <label>Orientação para doações<textarea rows={2} value={campaignForm.donationInfo} onChange={(event) => setCampaignForm({ ...campaignForm, donationInfo: event.target.value })} /></label>
            </section>
            <section className="settings-block privacy-settings"><div className="settings-title"><ShieldCheck size={18} /><div><h3>Privacidade da lista</h3><p>Somente os campos selecionados serão exibidos para crianças disponíveis.</p></div></div>
              <div className="public-field-list">{Object.entries(publicFieldLabels).map(([key, label]) => <label className="toggle-row" key={key}><span><strong>{label}</strong><small>{key === 'photo' || key === 'name' ? 'Exige autorização individual cadastrada.' : 'Pode ser alterado a qualquer momento.'}</small></span><input type="checkbox" checked={campaignForm.publicFields.includes(key)} onChange={(event) => setCampaignForm({ ...campaignForm, publicFields: event.target.checked ? [...campaignForm.publicFields, key] : campaignForm.publicFields.filter((field) => field !== key) })} /></label>)}</div>
            </section>
            {pageError && <p className="form-error" role="alert">{pageError}</p>}
            <div className="settings-submit"><span><ShieldCheck size={15} /> O primeiro nome só aparece com autorização individual.</span><button className="button button-green" type="submit">Salvar configurações <Check size={16} /></button></div>
          </form>
        </section>}
      </main>
      <nav className="admin-mobile-nav" aria-label="Navegação administrativa">{tabs.map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? 'active' : ''} type="button" onClick={() => setTab(id)}><Icon size={18} /><span>{label}</span></button>)}</nav>
      {formChild !== undefined && <ChildForm child={formChild} onSave={saveChild} onClose={() => setFormChild(undefined)} />}
      {deliveryChild && <DeliveryDialog child={deliveryChild} onSave={saveDelivery} onClose={() => setDeliveryChild(null)} />}
    </div>
  )
}