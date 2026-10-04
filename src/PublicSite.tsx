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
