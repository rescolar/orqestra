# Stack Tecnológico y Plan de Rollout

---

## 1. Stack definido

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Framework | **Next.js 15** (App Router) | Frontend + backend en un solo proyecto |
| Lenguaje | **TypeScript** | Tipado fuerte, consistente front y back |
| Estilos | **Tailwind CSS** + **shadcn/ui** | Componentes accesibles, consistentes con el design system |
| Iconos | **Material Symbols Outlined** | Ya definido en mockups |
| ORM | **Prisma** | Schema → tipos TS → migraciones automáticas |
| Base de datos | **PostgreSQL** (Supabase) | Free tier: 500MB, 50K rows. Sintaxis ~MySQL |
| Autenticación | **NextAuth.js** (Auth.js v5) | Email + contraseña (MVP). Preparado para OAuth futuro |
| Drag & Drop | **dnd-kit** | Ligero, accessible, buen soporte React 18+ |
| Estado cliente | **Zustand** o React Context | Evaluar según complejidad real del board |

---

## 2. Estructura del proyecto

```
orqestra/
├── src/
│   ├── app/                    # App Router (pages + layouts + API routes)
│   │   ├── (auth)/             # Login, registro (layout sin sidebar)
│   │   ├── dashboard/          # Dashboard post-login
│   │   ├── events/[id]/board/  # Board principal (vista única del evento)
│   │   ├── venues/             # CRUD de localizaciones
│   │   └── api/                # API Routes (si se necesitan además de Server Actions)
│   ├── components/             # Componentes React reutilizables
│   │   ├── ui/                 # shadcn/ui (button, card, dialog, etc.)
│   │   ├── board/              # Grid de habitaciones, room cards
│   │   ├── panels/             # Panel derecho (person, room, pendings)
│   │   └── layout/             # Header, sidebar, left column
│   ├── lib/                    # Utilidades, helpers, constantes
│   │   ├── db.ts               # Prisma client singleton
│   │   ├── auth.ts             # Configuración NextAuth
│   │   └── actions/            # Server Actions (mutations)
│   ├── hooks/                  # Custom React hooks
│   └── types/                  # Tipos TypeScript del dominio
├── prisma/
│   ├── schema.prisma           # Schema de base de datos
│   └── seed.ts                 # Datos semilla (amenities por defecto, usuario demo)
├── public/                     # Assets estáticos
├── docs/                       # Documentación (ya existente)
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

---

## 3. Entorno local

### 3.1 Requisitos previos

- Node.js 20+ (recomendado: instalar con `nvm`)
- pnpm (gestor de paquetes — más rápido que npm)
- Docker (solo si se quiere PostgreSQL local; opcional si se usa Supabase directamente)

### 3.2 Setup local (primera vez)

```bash
# 1. Instalar dependencias
pnpm install

# 2. Opción A: PostgreSQL local con Docker
docker compose up -d  # levanta postgres en localhost:5432

# 2. Opción B: Usar Supabase directamente (sin Docker)
# Copiar connection string de Supabase al .env

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con:
#   DATABASE_URL=postgresql://...
#   NEXTAUTH_SECRET=... (generar con: openssl rand -base64 32)
#   NEXTAUTH_URL=http://localhost:3000

# 4. Crear base de datos y tablas
pnpm prisma db push    # aplica schema sin migración formal (dev)
pnpm prisma db seed    # crea amenities por defecto + usuario demo

# 5. Arrancar
pnpm dev               # → http://localhost:3000
```

### 3.3 Comandos de desarrollo

```bash
pnpm dev                    # Next.js dev server (hot reload)
pnpm prisma studio          # GUI para explorar la base de datos
pnpm prisma db push         # Aplicar cambios de schema (dev)
pnpm prisma migrate dev     # Crear migración formal (cuando estabilice)
pnpm prisma generate        # Regenerar tipos TS tras cambio de schema
pnpm lint                   # ESLint
pnpm build                  # Build de producción
```

### 3.4 Docker Compose (opcional, para PostgreSQL local)

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: orqestra
      POSTGRES_USER: orqestra
      POSTGRES_PASSWORD: orqestra
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

---

## 4. Plan de deploy

### Fase 1 — Desarrollo local (ahora)

- Todo en `localhost:3000`
- Base de datos: PostgreSQL local (Docker) o Supabase free tier directo
- Sin dominio, sin deploy

### Fase 2 — Publicación MVP

| Servicio | Proveedor | Coste |
|----------|-----------|-------|
| Hosting + CDN + SSL | **Vercel** (free tier) | $0/mes |
| Base de datos | **Supabase** (free tier) | $0/mes |
| Dominio | **Namecheap** / **Porkbun** / **Cloudflare Domains** | ~$12/año |
| DNS | **Vercel** (integrado) | $0 |
| **Total** | | **~$1/mes** |

**Pasos para publicar:**

```bash
# 1. Crear cuenta en Vercel (login con GitHub)
# 2. Importar el repositorio orqestra
# 3. Vercel detecta Next.js automáticamente
# 4. Configurar variables de entorno en Vercel:
#    DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
# 5. Deploy automático en cada push a main

# 6. Comprar dominio (ej: orqestra.app)
# 7. En Vercel: Settings → Domains → añadir dominio
# 8. En el registrador: apuntar nameservers a Vercel
#    ns1.vercel-dns.com
#    ns2.vercel-dns.com
# 9. SSL se configura automáticamente
```

**Flujo de deploy continuo:**
```
git push main → Vercel build → live en orqestra.app (< 1 min)
git push rama → Vercel preview → URL temporal para revisar
```

### Fase 3 — Escalar (cuando haya tracción)

| Señal | Acción |
|-------|--------|
| Free tier de Supabase se queda corto | Supabase Pro ($25/mes) o migrar a AWS RDS |
| Necesitas más de 100GB bandwidth | Vercel Pro ($20/mes) |
| Necesitas backend pesado (jobs, colas) | Añadir servicio Java/Spring Boot en AWS ECS |
| Necesitas multi-tenant serio | Evaluar AWS completo (ECS + RDS + CloudFront) |

No optimizar prematuramente. Migrar cuando los números lo justifiquen.

---

## 5. Variables de entorno

```bash
# .env.example
DATABASE_URL="postgresql://orqestra:orqestra@localhost:5432/orqestra"
NEXTAUTH_SECRET=""          # openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"

# Supabase (si se usa directamente)
# DATABASE_URL="postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"
```

**Importante:** `.env.local` y `.env` nunca se suben al repositorio. Incluir en `.gitignore`.

---

## 6. Decisiones técnicas pendientes

| Decisión | Opciones | Cuándo decidir |
|----------|----------|---------------|
| Estado del board | Zustand vs React Context vs server state | Al implementar el board (Epic 2) |
| Tiempo real | Supabase Realtime vs polling | Solo si multi-usuario (post-MVP) |
| Testing | Vitest + Testing Library vs Playwright | Al tener primeras features estables |
| Email transaccional | Resend vs AWS SES | Solo si se necesita (reset password, notificaciones) |
| Almacenamiento de imágenes | Supabase Storage vs S3 | Solo si se necesita (avatares) |
| Internacionalización (i18n) | next-intl vs next-i18next | Post-MVP. UI copy hardcodeado en español. Extraer strings cuando haya demanda real de otros idiomas |
