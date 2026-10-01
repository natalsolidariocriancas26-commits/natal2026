# Publicação gratuita

Esta configuração foi preparada para uma VM Oracle Cloud Always Free com Ubuntu, Docker Compose, um subdomínio DuckDNS e HTTPS automático pelo Caddy. A disponibilidade de VMs gratuitas varia por região. A VM mantém o SQLite em disco persistente; não use um plano com sistema de arquivos efêmero para receber reservas reais.

## 1. Preparar a VM e o DNS

1. Crie uma VM Ubuntu na Oracle Cloud usando apenas recursos marcados como Always Free. Reserve um IPv4 público.
2. Nas regras de entrada da rede da VM, libere TCP 22, 80 e 443. No firewall Ubuntu, libere também TCP 80 e 443.
3. Crie um subdomínio gratuito no DuckDNS e aponte-o para o IPv4 público da VM. O Caddy emitirá o certificado HTTPS quando o DNS estiver propagado e as portas estiverem acessíveis.
4. Instale Docker, o plugin Docker Compose e Git na VM. Confirme que `docker compose version` funciona.

## 2. Baixar e configurar

Clone o repositório na VM usando acesso SSH privado do GitHub e entre na pasta do projeto. Não torne público o repositório: embora os dados privados sejam ignorados pelo Git e pelo Docker, mantenha essa barreira.

```bash
mkdir -p data private-data
cp .env.production.example .env.production
nano .env.production
```

Defina `SITE_DOMAIN` como o endereço DuckDNS criado e substitua `ADMIN_PASSWORD` por uma senha exclusiva com pelo menos 16 caracteres. Gere a senha diretamente na VM com `openssl rand -base64 32`; não a envie pelo chat nem a salve no repositório.

O processo do app roda como UID 1000. Dê a ele acesso apenas à pasta persistente do banco:

```bash
sudo chown -R 1000:1000 data
```

## 3. Importar a lista privada (opcional)

Se for publicar os cadastros existentes, confirme antes as autorizações dos responsáveis e transfira `private-data/children.json` diretamente do computador para a VM usando SCP/SFTP. Não envie esse arquivo ao GitHub, ao chat ou a um serviço público de compartilhamento. Restrinja as permissões do arquivo na VM:

```bash
chmod 600 private-data/children.json
```

O app importa esse arquivo somente quando o banco ainda não contém crianças. Depois que a importação for confirmada, remova o JSON da VM; os cadastros permanecem no banco em `data/`.

## 4. Iniciar e conferir

```bash
docker compose --env-file .env.production up -d --build
docker compose --env-file .env.production logs -f app caddy
```

Quando o DNS e o certificado estiverem prontos, abra `https://SEU-SUBDOMINIO.duckdns.org`. O painel fica em `/admin`. A VM pode levar alguns minutos para iniciar; mantenha SSH restrito e guarde cópias protegidas do banco `data/natal-solidario.sqlite`.

Para atualizar após enviar alterações ao repositório:

```bash
git pull
docker compose --env-file .env.production up -d --build
```
