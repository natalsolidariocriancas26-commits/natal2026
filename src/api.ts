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
  /*
   * ============================================================
   * DADOS PÚBLICOS DA CAMPANHA
   * ============================================================
   */

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
      .filter(
        (row) =>
          row[0] !== '' &&
          row[0] !== undefined &&
          row[0] !== null,
      )
      .map((row) => {
        const ns = String(row[0] ?? '').trim()
        const nome = String(row[1] ?? '').trim()
        const sexo = String(row[2] ?? '').trim()
        const idade = String(row[3] ?? '').trim()
        const roupa = String(row[4] ?? '').trim()
        const calcado = String(row[5] ?? '').trim()

        /*
         * Normaliza o status vindo da planilha.
         *
         * Disponível
         * Apadrinhada
         * Presente recebido
         */
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
          /*
           * Qualquer outro status é tratado como disponível.
           * Isso mantém compatibilidade com a planilha atual.
           */
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

      /*
       * Não usamos mais "Reservado" como status público.
       */
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
        deliveryLocation:
          'ADEBANKE Espaço Cultural, Artur Alvim',
        deliveryContact: '5511945963712',
        donationInfo:
          'Faça parte desta corrente de solidariedade.',
        introduction:
          'Escolha uma ou mais crianças e faça deste Natal uma lembrança para a vida toda.',
        reservationMinutes: 30,
      },

      children,

      counts,
    } as T
  }

  /*
   * ============================================================
   * APADRINHAMENTO
   * ============================================================
   *
   * Quando a pessoa seleciona um cartão:
   *
   * Site → Apps Script → Google Sheets
   *
   * O Apps Script verifica se está disponível e,
   * se estiver, muda imediatamente para "Apadrinhada".
   */

  if (
    path === '/api/reservations' &&
    options.method === 'POST'
  ) {
    const body = JSON.parse(
      String(options.body || '{}'),
    )

    const childIds = Array.isArray(body.childIds)
      ? body.childIds
      : []

    if (childIds.length === 0) {
      throw new Error(
        'Nenhum cartão foi selecionado.',
      )
    }

    /*
     * O sistema atual trabalha com um cartão por apadrinhamento.
     */
    const cartao = String(childIds[0])

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',

      /*
       * text/plain evita problemas de CORS/preflight
       * com o Google Apps Script.
       */
      headers: {
        'Content-Type':
          'text/plain;charset=utf-8',
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

    /*
     * Mantemos este formato porque o PublicSite.tsx
     * espera uma resposta de reserva.
     *
     * Na prática, o cartão já foi marcado como
     * "Apadrinhada" na planilha pelo Apps Script.
     */
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

  /*
   * ============================================================
   * CONFIRMAÇÃO
   * ============================================================
   *
   * O apadrinhamento já foi gravado na planilha no POST acima.
   * Portanto, esta etapa apenas responde com sucesso.
   */

  if (
    path.startsWith('/api/reservations/') &&
    path.endsWith('/confirm') &&
    options.method === 'POST'
  ) {
    return {
      sucesso: true,
    } as T
  }

  /*
   * ============================================================
   * CANCELAMENTO
   * ============================================================
   *
   * Mantido para compatibilidade com o PublicSite.tsx.
   */

  if (
    path.startsWith('/api/reservations/') &&
    path.endsWith('/cancel') &&
    options.method === 'POST'
  ) {
    return {
      sucesso: true,
    } as T
  }

  /*
   * ============================================================
   * OUTRAS ROTAS
   * ============================================================
   */

  const response = await fetch(path, {
    ...options,

    credentials: 'same-origin',

    headers: {
      ...(options.body
        ? {
            'Content-Type':
              'application/json',
          }
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

/*
 * ============================================================
 * FORMATAÇÃO DE DATA
 * ============================================================
 */

export function formatDate(date: string) {
  if (!date) {
    return 'A definir'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(
    new Date(`${date}T12:00:00Z`),
  )
}
