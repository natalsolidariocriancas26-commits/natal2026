# Natal Solidário 2026

Plataforma responsiva para apadrinhamento de kits de Natal, com catálogo público anônimo e painel privado da organização.

## Executar localmente

Requisitos: Node.js 20.19+ (ou 22.12+) e npm.

```powershell
npm.cmd install
Copy-Item .env.example .env
notepad .env
npm.cmd run dev
```

No `.env`, defina `ADMIN_PASSWORD` com uma senha exclusiva de pelo menos 16 caracteres. Não compartilhe essa senha no chat nem a envie ao repositório. O site abre em `http://localhost:5173`; a API usa a porta `3001`.

Para produção local: `npm.cmd run build` e depois `npm.cmd start`. O servidor Express atende a API e os arquivos compilados. Use HTTPS, configure a senha em um gerenciador de segredos e proteja o arquivo SQLite e seus backups.

## Dados importados

Na primeira inicialização, se o banco ainda não tiver registros, o servidor importa `private-data/children.json`. A pasta e o banco `.local-data/` são ignorados pelo Git. A lista recebida para esta campanha gerou 56 cadastros: 44 disponíveis e 12 marcados como já apadrinhados. Nomes completos ficam somente no banco local e na área administrativa; nomes e telefones de padrinhos existentes não foram importados. Idades em meses são mantidas como texto, e gênero e sugestão de brinquedo permanecem vazios quando não constam na lista.

Para uma nova campanha ou ambiente, substitua o arquivo privado antes da primeira inicialização. O banco não reimporta a lista se já houver cadastros.

## Arquitetura

- React + TypeScript + Vite para a campanha, catálogo e painel.
- Express para API, limites de requisição, cabeçalhos de segurança e sessão administrativa.
- SQLite (`better-sqlite3`) para crianças, padrinhos, reservas, itens reservados, entregas, configurações e sessões.
- Reservar e confirmar executa atualizações em transação; um índice único parcial impede que o mesmo cadastro seja reservado simultaneamente por pessoas diferentes.
- Uma reserva sem confirmação expira após o prazo configurado e devolve a criança à lista.
- O catálogo nunca recebe o nome completo. Idade, gênero informado, tamanhos, brinquedo e foto podem ser liberados por configuração; fotos ainda exigem autorização individual registrada.

O painel fica em `/admin`. A autenticação usa senha configurada por ambiente, cookie `HttpOnly`/`SameSite=Strict` e tokens aleatórios armazenados como hash no banco. Sem `ADMIN_PASSWORD`, o painel permanece desativado.

## WhatsApp e privacidade

Os botões abrem conversas com mensagens pré-preenchidas. O WhatsApp só envia uma mensagem depois que a pessoa toca em enviar; envio automático ao padrinho exige integração separada com a WhatsApp Business Platform, conta e credenciais próprias.

O app reduz a exposição pública e registra o aceite da campanha, mas isso não substitui revisão jurídica da base legal e do consentimento do responsável, política de retenção, controles de acesso à máquina, backups criptografados e hospedagem HTTPS. Antes de divulgar a campanha publicamente, valide esses pontos e confirme a autorização dos responsáveis para cada informação ou imagem de menor.

## Verificação

```powershell
npm.cmd run test:server
npm.cmd run build
npm.cmd run lint
```
