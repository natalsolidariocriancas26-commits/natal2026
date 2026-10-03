const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwTwOR8uvV0L2Ony4kb1_XT_5p9Fy7ZCCiBkaFb419qB5C23sFOgG-oTv5EhE1EvTeY/exec'

type SheetRow = [
  string | number, // NS
  string,          // Nome
  string,          // Sexo
  string | number, // Idade
  string | number, // Roupa
  string | number, // Calçado
  string,          // Status
  string,          // Responsável
  string?,         // WhatsApp
]

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
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
      .map((row) => {
        const ns = String(row[0] ?? '').trim()
        const nome = String(row[1] ?? '').trim()
        const sexo = String(row[2] ?? '').trim()
        const idade = String(row[3] ?? '').trim()
        const roupa = String(row[4] ?? '').trim()
        const calcado = String(row[5] ?? '').trim()

        // Normaliza o status vindo da planilha
        const statusText = String(row[6] ?? '')
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')

        let status:
          | 'AVAILABLE'
          | 'SPONSORED'
          | 'RECEIVED'

        if (
          statusText.includes('presente recebido') ||
          statusText.includes('presente_recebido')
        ) {
          status = 'RECEIVED'
        } else if (
          statusText.includes('apadrinh')
        ) {
          status = 'SPONSORED'
        } else {
          status = 'AVAILABLE'
        }

        return {
          id: ns,
          publicCode: ns,
          name: nome,
          genderLabel: sexo,
          ageLabel: idade,
          status,
          clothingSize: roupa,
          shoeSize: calcado,
          toySuggestion: 'À escolha',
        }
      })

    const counts = {
      AVAILABLE: children.filter(
        (child) => child.status === 'AVAILABLE',
      ).length,

      RESERVED: 0,

      SPONSORED: children.filter(
        (child) => child.status === 'SPONSORED',
      ).length,

      RECEIVED: children.filter(
        (child) => child.status === 'RECEIVED',
      ).length,

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
        donationInfo:
          'Faça parte desta corrente de solidariedade.',
        introduction:
          'Escolha um cartão, prepare um presente e faça uma criança sorrir.',
        reservationMinutes: 30,
      },

      children,

      counts,
    } as T
  }

  if (
    path === '/api/reservations' &&
    options.method === 'POST'
  ) {
    const body = JSON.parse(String(options.body || '{}'))

    const childIds = Array.isArray(body.childIds)
      ? body.childIds
      : []

    if (childIds.length === 0) {
      throw new Error('Nenhum cartão foi selecionado.')
    }

    const cartao = String(childIds[0])

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        cartao,
        responsavel: body.name,
        whatsapp: body.whatsapp,
      }),
    })

    const result = await response.json()

    if (!result.sucesso) {
      throw new Error(
        result.mensagem ||
          'Não foi possível reservar o cartão.',
      )
    }

    return {
      id: cartao,

      expiresAt: new Date(
        Date.now() + 30 * 60 * 1000,
      ).toISOString(),

      children: [
        {
          id: cartao,
          publicCode: cartao,
        },
      ],
    } as T
  }

  if (
    path.startsWith('/api/reservations/') &&
    path.endsWith('/confirm') &&
    options.method === 'POST'
  ) {
    return {
      sucesso: true,
    } as T
  }

  if (
    path.startsWith('/api/reservations/') &&
    path.endsWith('/cancel') &&
    options.method === 'POST'
  ) {
    return {
      sucesso: true,
    } as T
  }

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

  const body = await response.json() as T & {
    error?: string
  }

  if (!response.ok) {
    throw new Error(
      body.error ||
        'Não foi possível concluir a solicitação.',
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
