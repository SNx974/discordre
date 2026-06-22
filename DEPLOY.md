# 🚀 Déploiement sur Dockploy

Ce guide explique comment déployer la stack MATCHMAKING sur **Dockploy** (PaaS self-hosted).

---

## 1. Pré-requis

- Un **VPS** (2 vCPU / 4 GB RAM minimum) avec Dockploy installé
- Un **nom de domaine** pointant vers le VPS (ex : `matchmaking.example.com`)
- Une **app Discord** créée sur https://discord.com/developers/applications avec :
  - Bot ajouté à ton serveur
  - OAuth2 redirect : `https://matchmaking.example.com/api/auth/callback/discord`
- Un **repo GitHub** : `https://github.com/SNx974/discordre` (déjà pushé)

---

## 2. Configuration Discord

Sur https://discord.com/developers/applications :

1. **Bot** → copie le `TOKEN` → ce sera `DISCORD_BOT_TOKEN`
2. **OAuth2 → General** : note le `CLIENT ID` et `CLIENT SECRET`
3. **Bot → Privileged Gateway Intents** : active :
   - ✅ Presence Intent
   - ✅ Server Members Intent
   - ✅ Message Content Intent
4. **OAuth2 → URL Generator** : scopes `bot`, `applications.commands`, permissions :
   - Manage Channels
   - Manage Roles
   - Send Messages
   - Embed Links
   - Attach Files
   - Read Message History
   - Use External Emojis
   - Add Reactions
5. Invite le bot sur ton serveur avec l'URL générée
6. Clic droit sur ton serveur → "Copier l'identifiant du serveur" → `DISCORD_GUILD_ID`
7. Crée une catégorie "Matchs" sur Discord → clic droit → "Copier l'identifiant" → `DISCORD_MATCH_CATEGORY_ID`
8. Crée un rôle "Staff" → `DISCORD_ADMIN_ROLE_ID`

---

## 3. Secrets à préparer

Génère les secrets :

```bash
# NEXTAUTH_SECRET
openssl rand -hex 32

# INTERNAL_API_SECRET
openssl rand -hex 32

# POSTGRES_PASSWORD
openssl rand -hex 24
```

Récap de ce dont tu auras besoin dans Dockploy :

| Variable | Source |
|---|---|
| `POSTGRES_USER` | `matchmaking` |
| `POSTGRES_PASSWORD` | généré ci-dessus |
| `POSTGRES_DB` | `matchmaking` |
| `S3_ACCESS_KEY` | généré (ou `minioadmin`) |
| `S3_SECRET_KEY` | généré (ou `minioadmin`) |
| `S3_BUCKET` | `matchmaking-screenshots` |
| `S3_PUBLIC_URL` | URL publique du bucket (ou interne) |
| `NEXTAUTH_URL` | `https://matchmaking.example.com` |
| `NEXTAUTH_SECRET` | généré |
| `INTERNAL_API_SECRET` | généré |
| `DISCORD_CLIENT_ID` | depuis Discord |
| `DISCORD_CLIENT_SECRET` | depuis Discord |
| `DISCORD_BOT_TOKEN` | depuis Discord |
| `DISCORD_GUILD_ID` | ID du serveur |
| `DISCORD_ADMIN_ROLE_ID` | ID du rôle Staff |
| `DISCORD_MATCH_CATEGORY_ID` | ID de la catégorie |
| `OPENAI_API_KEY` | depuis https://platform.openai.com |
| `OCR_PROVIDER` | `gpt4o` |
| `BOT_LOG_LEVEL` | `info` |
| `WEB_PORT` | `3000` |
| `API_PORT` | `4000` |
| `NEXT_PUBLIC_API_URL` | `https://matchmaking.example.com/api` (URL publique) |

---

## 4. Déploiement sur Dockploy

### Option A — Via l'UI Dockploy (le plus simple)

1. Connecte-toi à ton instance Dockploy
2. **Create Project** → nom : `matchmaking`
3. **Add Service** → **Compose**
4. **Source** : choisis **Git** → `https://github.com/SNx974/discordre`
5. **Compose Path** : `infra/docker-compose.prod.yml`
6. **Environment Variables** : colle toutes les vars du tableau ci-dessus
7. **Deploy** 🚀

### Option B — Via Docker Compose direct sur le VPS

Sur ton VPS :

```bash
git clone https://github.com/SNx974/discordre.git
cd discordre

# Copier et éditer le .env
cp .env.example .env
nano .env   # remplir toutes les valeurs

# Build + start
docker compose -f infra/docker-compose.prod.yml up -d --build
```

Vérifier :

```bash
docker compose -f infra/docker-compose.prod.yml ps
docker compose -f infra/docker-compose.prod.yml logs -f api
```

---

## 5. Reverse proxy + HTTPS

Dockploy gère en général Traefik ou Caddy automatiquement. Sinon, sur un VPS brut :

### Avec Caddy (recommandé)

```caddyfile
matchmaking.example.com {
    reverse_proxy web:3000
}

api.matchmaking.example.com {
    reverse_proxy api:4000
}
```

### Avec Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name matchmaking.example.com;
    
    ssl_certificate /etc/letsencrypt/live/matchmaking.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/matchmaking.example.com/privkey.pem;
    
    location / {
        proxy_pass http://web:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api/ {
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass http://api:4000;
    }
    
    location /socket.io/ {
        proxy_pass http://api:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 6. Première migration DB

Une fois la stack up :

```bash
docker compose -f infra/docker-compose.prod.yml exec api npx prisma migrate deploy
```

(ou push la migration depuis ton poste de dev avant de déployer)

---

## 7. Vérifications post-déploiement

- [ ] `https://matchmaking.example.com` → page d'accueil s'affiche
- [ ] Login Discord → redirige, user créé en DB
- [ ] Dashboard → accessible
- [ ] `https://matchmaking.example.com/api/health` (si reverse proxy OK) → JSON `{"status":"ok"}`
- [ ] Bot Discord → en ligne sur ton serveur
- [ ] Créer une équipe + un match → channel Discord privé créé automatiquement
- [ ] DM reçu avec lien d'invitation

---

## 8. Logs & debug

```bash
# Tous les services
docker compose -f infra/docker-compose.prod.yml logs -f

# Un service spécifique
docker compose -f infra/docker-compose.prod.yml logs -f api
docker compose -f infra/docker-compose.prod.yml logs -f bot
```

---

## 9. Mise à jour

```bash
git pull
docker compose -f infra/docker-compose.prod.yml up -d --build
```

---

## 10. Troubleshooting

| Symptôme | Cause probable |
|---|---|
| API crash au démarrage | `DATABASE_URL` invalide ou Postgres pas ready → attends le healthcheck |
| Bot "TokenInvalid" | Mauvais `DISCORD_BOT_TOKEN` |
| Bot "Missing Intents" | As-tu activé les 3 intents privileged dans l'app Discord ? |
| Web ne build pas | Oublie de `output: 'standalone'` dans next.config.js → déjà OK |
| WebSocket ne connecte pas | Reverse proxy ne forwarde pas `/socket.io/` correctement |
| OCR fails | `OPENAI_API_KEY` invalide ou quota épuisé |

---

Bon déploiement ! 🎮