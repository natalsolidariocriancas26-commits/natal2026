const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwTwOR8uvV0L2Ony4kb1_XT_5p9Fy7ZCCiBkaFb419qB5C23sFOgG-oTv5EhE1EvTeY/exec'

type SheetRow = [
  string | number,
  string,
  string | number,
  string | number,
  string | number,
  string,
  string,
  string,
  string?
]

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {

  // CARREGAR CARTÕES
  if (
    path === '/api/public/campaign' &&
    (!options.method || options.method === 'GET')
  ) {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'GET',
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error('Não foi possível carregar os cartões.')
    }

    const rows = await response.json() as SheetRow[]
    const [, ...cards] = rows

    const children = cards
      .filter((row) => row[0] !== '' && row[0] !== undefined)
      .map((row, index) => {
        const statusText = String(row[6] || '').toLowerCase()

        let status:
          | 'AVAILABLE'
          | 'RESERVED'
          | 'SPONSORED'
          | 'RECEIVED'
          | 'DELIVERED'

        if (statusText.includes('reserv')) {
          status = 'RESERVED'
        } else if (
          statusText.includes('entreg') ||
          statusText.includes('receb') ||
          statusText.includes('apadrinh')
        ) {
          status = 'SPONSORED'
        } else {
          status = 'AVAILABLE'
        }

        return {
          id: index + 1,
          publicCode: `NS-${row[0]}`,
          genderLabel: String(row[1] || ''),
          ageLabel: String(row[2] || ''),
          status,
          clothingSize: String(row[3] || ''),
          shoeSize: String(row[4] || ''),
          toySuggestion: String(row[5] || ''),
        }
      })

    const counts = {
      AVAILABLE: children.filter((child) => child.status === 'AVAILABLE').length,
      RESERVED: children.filter((child) => child.status === 'RESERVED').length,
      SPONSORED: children.filter((child) => child.status === 'SPONSORED').length,
      RECEIVED: 0,
      DELIVERED: 0,
    }

    return {
      campaign: {
        campaignName: 'Natal Solidário',
        year: 2026,
        eventDate: '2026-12-19',
        eventTime: '12:00',
        deliveryDeadline: '2026-11-30',
        deliveryLocation: 'ADEBANKE Espaço Cultural, Artur Alvim',
        deliveryContact: '5511945963712',
        donationInfo: 'Faça parte desta corrente de solidariedade.',
        introduction:
          'Escolha um cartão, prepare um presente e faça uma criança sorrir.',
        reservationMinutes: 30,
      },
      children,
      counts,
    } as T
  }

  // RESERVAR CARTÃO
  if (path === '/api/reservations' && options.method === 'POST') {
    const body = JSON.parse(String(options.body || '{}'))

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        cartao: body.cartao,
        responsavel: body.responsavel,
        whatsapp: body.whatsapp,
      }),
    })

    const result = await response.json()

    if (!result.sucesso) {
      throw new Error(result.mensagem || 'Não foi possível reservar o cartão.')
    }

    return {
      id: String(body.cartao),
      status: 'RESERVED',
    } as T
  }

  // OUTRAS REQUISIÇÕES
  const response = await fetch(path, {
    ...options,
    credentials: 'same-origin',
    headers: {
      ...(options.body
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...options.headers,
    },
  })

  if (response.status === 204) {
    return undefined as T
  }

  const body = await response.json() as T & { error?: string }

  if (!response.ok) {
    throw new Error(
      body.error || 'Não foi possível concluir a solicitação.',
    )
  }

  return body
}

export function formatDate(date: string) {
  if (!date) return 'A definir'

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`))
}
