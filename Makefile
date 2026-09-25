DC_PROD=docker compose -f docker-compose.yml
DC_DEV=docker compose -f docker-compose.dev.yml

.PHONY: help setup verify lint typecheck test migrate \
        dev dev-down dev-logs dev-logs-server dev-logs-web dev-shell dev-root-shell dev-db dev-prune \
        up-prod down-prod update-prod logs-prod shell-prod db-prod prune tunnel-check

default: help

help:
	@echo "HistoCar — Commandes disponibles :"
	@echo "----------------------------------"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ─── Setup ────────────────────────────────────────────────────────────────────

setup: ## [SETUP] Crée le .env depuis .env.dist et installe les dépendances hôte
	@if [ -f .env ]; then \
		echo "ℹ️  .env existe déjà — pas écrasé."; \
	else \
		cp .env.dist .env; \
		echo "✅ .env créé depuis .env.dist — renseigne JWT_SECRET et SIGNUP_INVITE_CODE."; \
	fi
	@echo "📦 Installation des dépendances (npm workspaces)..."
	npm install
	npm run prisma:generate -w packages/server
	@echo "✅ Prêt. Lance 'make dev'."

tunnel-check: ## [SETUP] Vérifie la config du tunnel cloudflare avant un up-prod
	@grep -q '^TUNNEL_UUID=.\+' .env || { echo "❌ TUNNEL_UUID vide dans .env"; exit 1; }
	@uuid=$$(grep '^TUNNEL_UUID=' .env | cut -d= -f2); \
	  [ -f "cloudflared/$$uuid.json" ] || { echo "❌ cloudflared/$$uuid.json introuvable"; exit 1; }
	@grep -q 'example.com' cloudflared/config.yaml && \
	  { echo "❌ Hostname placeholder encore présent dans cloudflared/config.yaml"; exit 1; } || true
	@echo "✅ Tunnel configuré."

# ─── Qualité ──────────────────────────────────────────────────────────────────

verify: ## [QA] lint + typecheck + tests (à lancer avant de dire que c'est fini)
	npm run verify

lint: ## [QA] Biome check sur tout le repo
	npm run lint:fix

typecheck: ## [QA] Typecheck des deux workspaces
	npm run typecheck

test: ## [QA] Tests vitest (workspace server)
	npm run test

# ─── Développement ────────────────────────────────────────────────────────────

dev: ## [DEV] Lance la stack de développement (db + server hot-reload + vite)
	@echo "🚀 Démarrage de l'environnement de développement HistoCar..."
	@echo "   Ports exposés :"
	@echo "   • Web (vite)      → http://localhost:5173"
	@echo "   • API             → http://localhost:3001/api"
	@echo "   • Debugger server → localhost:9229"
	@echo "   • Postgres        → localhost:5432"
	$(DC_DEV) up --build -d
	@echo ""
	@echo "✅ Stack de dev lancée ! Logs : make dev-logs"

dev-down: ## [DEV] Stoppe l'environnement de développement
	@echo "🛑 Arrêt de l'environnement de développement..."
	$(DC_DEV) down

dev-logs: ## [DEV] Affiche les logs de tous les services dev en temps réel
	$(DC_DEV) logs -f

dev-logs-server: ## [DEV] Affiche les logs du serveur uniquement
	$(DC_DEV) logs -f server

dev-logs-web: ## [DEV] Affiche les logs du front uniquement
	$(DC_DEV) logs -f web

dev-shell: ## [DEV] Ouvre un terminal dans le container server dev
	@echo "💻 Connexion au container server dev..."
	$(DC_DEV) exec server bash

dev-root-shell: ## [DEV] Ouvre un terminal root dans le container server dev
	@echo "👑 Connexion root au container server dev..."
	$(DC_DEV) exec -u root server bash

dev-db: ## [DEV] Ouvre un psql sur la base de dev
	$(DC_DEV) exec db sh -c 'psql -U $$POSTGRES_USER -d $$POSTGRES_DB'

migrate: ## [DEV] Crée et applique une migration prisma (usage: make migrate NAME=add_x)
	@if [ -z "$(NAME)" ]; then echo "❌ Usage : make migrate NAME=<nom_migration>"; exit 1; fi
	$(DC_DEV) exec server npx prisma migrate dev --schema packages/server/prisma/schema.prisma --name $(NAME)

dev-prune: ## [DEV] Stoppe les containers dev ET supprime les volumes (données + node_modules)
	@echo "🔥 Suppression complète de l'environnement dev (containers + volumes)..."
	$(DC_DEV) down --volumes

# ─── Production ───────────────────────────────────────────────────────────────

up-prod: tunnel-check ## [PROD] Lance la stack de production + tunnel cloudflare
	@echo "🚀 Démarrage de HistoCar en PRODUCTION..."
	@echo "   Les migrations prisma tournent avant le serveur (service migrate)."
	$(DC_PROD) up --build -d
	@echo ""
	@echo "✅ Prod lancée ! Vérif locale : http://localhost:8080"

down-prod: ## [PROD] Stoppe la stack de production
	@echo "🛑 Arrêt de la production..."
	$(DC_PROD) down

update-prod: ## [PROD] Met à jour la prod sans coupure de service
	@echo "🔄 Mise à jour transparente de la PRODUCTION..."
	$(DC_PROD) up -d --build --remove-orphans
	@echo "✅ HistoCar mis à jour !"

logs-prod: ## [PROD] Affiche les logs de la production en temps réel
	$(DC_PROD) logs -f

shell-prod: ## [PROD] Ouvre un terminal dans le container server de prod
	$(DC_PROD) exec server sh

db-prod: ## [PROD] Ouvre un psql sur la base de production
	$(DC_PROD) exec db sh -c 'psql -U $$POSTGRES_USER -d $$POSTGRES_DB'

prune: ## [PROD] Stoppe les containers de prod ET supprime les volumes (DESTRUCTIF)
	@echo "🔥 Suppression complète de la prod (containers + données Postgres + justificatifs)..."
	$(DC_PROD) down --volumes
