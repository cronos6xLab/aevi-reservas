# aevi-reservas

Página **pública** de reservas (la que ven los clientes). Desplegada en Vercel.
Lee toda su configuración desde la API de Apps Script (servicios, horarios, contacto, mapa, etc.) y crea citas directamente en la hoja `Citas`.

## Stack
- Next.js 16 (App Router) + React 19 + TypeScript
- Estilos: CSS plano transplantado del HTML original (en `app/globals.css`)
- Sin ORM ni DB propia: usa la API REST de Google Apps Script

## Variables de entorno
Copia `.env.local.example` a `.env.local` y rellena:

```
NEXT_PUBLIC_API_URL=https://script.google.com/macros/s/TU-SCRIPT-ID/exec
```

La URL es la misma que te da Apps Script en **Implementar → Administrar implementaciones → Aplicación web**.

En Vercel: **Settings → Environment Variables** → añade `NEXT_PUBLIC_API_URL` con el mismo valor.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre http://localhost:3000

## Despliegue en Vercel

1. Sube este repo a GitHub (p. ej. `aevi-reservas`).
2. Entra a [vercel.com](https://vercel.com) → Add New Project → importa el repo.
3. Framework preset: **Next.js** (se autodetecta).
4. En **Environment Variables** añade `NEXT_PUBLIC_API_URL` con la URL de tu Apps Script.
5. Deploy. Vercel te da una URL tipo `aevi-reservas.vercel.app`.

## Cómo habla con el backend

Toda la lógica de red está en `lib/api.ts`. Hay 3 endpoints públicos:

| Función            | Método | Endpoint de Apps Script                          |
|--------------------|--------|--------------------------------------------------|
| `getPublicConfig`  | GET    | `?action=publicConfig`                            |
| `getSlots`         | GET    | `?action=slots&fecha=YYYY-MM-DD`                   |
| `crearCita`        | POST   | body JSON `{ action:'crearCita', cita:{...} }`    |

**Nota sobre CORS**: el POST se envía con `Content-Type: text/plain` para evitar el preflight CORS que Apps Script no maneja bien. El backend parsea el body con `JSON.parse()`. Ver `lib/api.ts` para más detalles.

## Estructura

```
aevi-reservas/
├── app/
│   ├── layout.tsx        # Layout raíz
│   ├── page.tsx          # 'use client' — toda la UI migrada a React
│   └── globals.css       # CSS transplantado del HTML original
├── lib/
│   ├── api.ts            # Cliente HTTP (fetch a Apps Script)
│   └── types.ts          # Tipos compartidos
├── .env.local.example
├── .gitignore
├── next.config.mjs
├── package.json
├── tsconfig.json
└── vercel.json
```

## Modificar contenido

NO edites contenido desde este repo (servicios, horarios, etc.). Todo eso se edita desde el panel `aevi-dashboard`, que escribe en la hoja `Config` y este repo la lee en tiempo real.
