# CAP_DASH — Guia de Deploy na VM "Relatórios" (Armazém Cloud)

> **VM**: Relatórios · **Cloud**: Armazém Cloud (CONTEGO)  
> **OS esperado**: Ubuntu/Debian · **Objetivo**: Deploy com Docker  
> **Esta instância vai hospedar múltiplos apps** — cada um em seu próprio Docker Compose isolado.

---

## Pré-requisitos

| Item | Valor |
|------|-------|
| Armazém Cloud Console | `https://vm.armazem.cloud` |
| Cloud Login | `contego_admin` / `INvIAkestOnG` |
| VM Name | `Relatorios` |
| VM SSH Login | `contego` / `Contego@Oness` |

---

## Passo 1 — Descobrir o IP da VM

1. Acesse **https://vm.armazem.cloud/login/?service=tenant:CONTEGO**
2. Faça login com `contego_admin` / `INvIAkestOnG`
3. Navegue até **vDCs → VM → Relatorios**
4. Copie o **IP público** (ou IP interno se for acesso via VPN)

> Neste guia usamos `<VM_IP>` como placeholder. Substitua pelo IP real.

---

## Passo 2 — Conectar via SSH

```powershell
# Do seu Windows (PowerShell):
ssh contego@<VM_IP>
# Senha: Contego@Oness
```

Se SSH não estiver habilitado na VM, use o **console web** do Armazém Cloud (botão "Console" na página da VM).

---

## Passo 3 — Instalar Docker na VM

Execute os comandos abaixo **dentro da VM** (via SSH ou console):

```bash
# Atualizar sistema
sudo apt-get update -y && sudo apt-get upgrade -y

# Instalar dependências
sudo apt-get install -y ca-certificates curl gnupg lsb-release git

# Adicionar repositório Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin

# Permitir uso sem sudo
sudo usermod -aG docker contego
newgrp docker

# Verificar
docker --version
docker compose version
```

---

## Passo 4 — Transferir o Projeto para a VM

**Opção A — SCP (do seu Windows):**

```powershell
# No PowerShell do seu PC (na pasta do projeto):
cd C:\Users\OnesmusSimiyu\Desktop\CAP_DASH

# Copiar todo o projeto
scp -r . contego@<VM_IP>:~/apps/capdash/
```

**Opção B — Git clone (se o repo estiver no GitHub/GitLab):**

```bash
# Na VM:
mkdir -p ~/apps
cd ~/apps
git clone <URL_DO_REPOSITORIO> capdash
cd capdash
```

---

## Passo 5 — Configurar Variáveis de Ambiente

Na VM, edite o arquivo `.env` do backend com as credenciais de produção:

```bash
cd ~/apps/capdash

# Editar o backend .env
nano backend/.env
```

**Ajustes obrigatórios no `backend/.env`:**

```env
# Trocar de development para production
ENVIRONMENT=production

# Atualizar CORS para incluir o IP/domínio da VM
CORS_ORIGINS=http://<VM_IP>,https://relatorios.contego.com.br

# JWT_SECRET — manter o existente ou gerar um novo:
# python3 -c "import secrets; print(secrets.token_hex(32))"
```

**Criar/editar o `.env` na raiz (para o frontend):**

```bash
nano .env
```

```env
VITE_API_BASE_URL=/api/v1
VITE_OPENAI_API_KEY=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
```

---

## Passo 6 — Build & Deploy

```bash
cd ~/apps/capdash

# Build e iniciar os containers
docker compose up --build -d

# Verificar status
docker compose ps

# Ver logs em tempo real
docker compose logs -f
```

**Resultado esperado:**
```
NAME                STATUS      PORTS
capdash-backend     Running     8000/tcp
capdash-frontend    Running     0.0.0.0:80->80/tcp
```

---

## Passo 7 — Testar

```bash
# Health check (backend)
curl http://localhost/api/v1/

# Resposta esperada: {"status":"ok","version":"1.0.0"}

# Login teste
curl -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@capdash.io","password":"Admin@123"}'
```

**No navegador:**
- Frontend: `http://<VM_IP>`
- API Docs: `http://<VM_IP>/docs`

---

## Passo 8 — Configurar Firewall (se necessário)

```bash
# Permitir HTTP e SSH
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## Comandos Úteis de Manutenção

```bash
# Parar tudo
docker compose down

# Rebuild após mudanças no código
docker compose up --build -d

# Ver logs do backend
docker compose logs -f backend

# Ver logs do frontend/nginx
docker compose logs -f frontend

# Restart apenas o backend
docker compose restart backend

# Limpar imagens antigas
docker system prune -af
```

---

## Deploy de Atualização (workflow)

```bash
cd ~/apps/capdash

# 1. Puxar código novo
git pull origin master

# 2. Rebuild e restart
docker compose up --build -d

# 3. Verificar
docker compose ps
```

---

## Hospedando MÚLTIPLOS Apps na mesma VM

Como esta VM será compartilhada, cada app deve ter seu próprio stack:

```
~/apps/
├── capdash/          ← porta 80 (este app)
│   └── docker-compose.yml
├── outro-app/        ← porta 8080 (futuro)
│   └── docker-compose.yml
└── nginx-proxy/      ← (opcional) proxy central com SSL
    └── docker-compose.yml
```

### Para adicionar outro app:

1. Mude a porta do CAP_DASH de `80` para `8081`:
   ```yaml
   # Em capdash/docker-compose.yml:
   ports:
     - "8081:80"
   ```

2. Crie um **Nginx proxy central** na porta 80 que roteia por domínio/path:
   ```
   relatorios.contego.com.br    → localhost:8081 (CAP_DASH)
   outro.contego.com.br         → localhost:8082 (outro app)
   ```

---

## Troubleshooting

| Problema | Solução |
|----------|---------|
| Porta 80 ocupada | `sudo lsof -i :80` e pare o processo, ou mude a porta no docker-compose |
| Container não inicia | `docker compose logs backend` para ver o erro |
| "Permission denied" no Docker | `sudo usermod -aG docker contego && newgrp docker` |
| Frontend carrega mas API falha | Verifique CORS_ORIGINS no backend/.env inclui o domínio correto |
| DB vazia após rebuild | O volume `capdash-db` persiste. Se quiser resetar: `docker volume rm capdash_capdash-db` |

---

## Arquitetura do Deploy

```
┌─────────────────────────────────────────────┐
│          VM "Relatórios" (Armazém Cloud)     │
│                                              │
│  ┌─────────────────────────────────────┐     │
│  │  Docker Compose (capdash-net)       │     │
│  │                                     │     │
│  │  ┌───────────────┐                  │     │
│  │  │   Frontend    │ :80 ←── Browser  │     │
│  │  │   (Nginx)     │                  │     │
│  │  │  SPA + proxy  │                  │     │
│  │  └───────┬───────┘                  │     │
│  │          │ /api/*                   │     │
│  │  ┌───────▼───────┐                  │     │
│  │  │   Backend     │ :8000 (internal) │     │
│  │  │  (FastAPI)    │                  │     │
│  │  │  + SQLite DB  │                  │     │
│  │  └───────────────┘                  │     │
│  └─────────────────────────────────────┘     │
│                                              │
│  ~/apps/capdash/                             │
│  ~/apps/outro-app/   (futuro)                │
└─────────────────────────────────────────────┘
```
