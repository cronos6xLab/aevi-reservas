// Cliente HTTP para hablar con el backend de Apps Script.
//
// IMPORTANTE: Apps Script no maneja bien los preflight CORS para
// Content-Type: application/json. Por eso enviamos el body como
// text/plain y lo parseamos con JSON.parse() en el backend.

import type { CitaPayload, CitaCreada, PublicConfig } from './types';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://script.google.com/macros/s/REEMPLAZA-CON-TU-ID/exec';

// En el navegador, GET se hace con fetch normal. Apps Script responde
// con Access-Control-Allow-Origin automáticamente cuando el request
// incluye el header Origin.
async function getJson<T>(action: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(API_URL);
  url.searchParams.set('action', action);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), { method: 'GET' });
  if (!res.ok) throw new Error('Error de conexión (' + res.status + ')');
  return res.json() as Promise<T>;
}

async function postJson<TResp, TBody = Record<string, unknown>>(
  action: string,
  body: TBody
): Promise<TResp> {
  const url = new URL(API_URL);
  url.searchParams.set('action', action);
  const res = await fetch(url.toString(), {
    method: 'POST',
    // text/plain evita el preflight CORS que Apps Script no sabe manejar
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body as Record<string, unknown>),
  });
  if (!res.ok) throw new Error('Error de conexión (' + res.status + ')');
  return res.json() as Promise<TResp>;
}

export const api = {
  getPublicConfig: () => getJson<PublicConfig>('publicConfig'),

  getSlots: (fecha: string) => getJson<string[]>('slots', { fecha }),

  crearCita: (cita: CitaPayload) =>
    postJson<{ ok: true; cita: CitaCreada } | { ok: false; error: string }, { cita: CitaPayload }>(
      'crearCita',
      { cita }
    ),
};
