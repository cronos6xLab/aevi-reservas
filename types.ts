// Tipos compartidos con el backend (code.gs)

export interface Negocio {
  nombre: string;
  tagline: string;
  logoUrl: string;
  moneda: string;
  colorPrimario: string;
  colorAcento: string;
  anuncio: string;
  heroTexto: string;
}

export interface Contacto {
  telefono: string;
  whatsapp: string;
  email: string;
  direccion: string;
  horarioTexto: string;
  estacionamiento: string;
  instagram: string;
  facebook: string;
  tiktok: string;
}

export interface Ubicacion {
  mapEmbed: string;
  mapLink: string;
  lat: string;
  lng: string;
}

export interface Servicio {
  id: string;
  nombre: string;
  descripcion: string;
  duracion: number;
  precio: number;
  activo: boolean;
}

export interface Disponibilidad {
  anticipacionHoras: number;
  maxDias: number;
  diasCerrados: string[];
  bloqueos: Bloqueo[];
}

export interface Bloqueo {
  fecha: string; // yyyy-MM-dd
  hora: string;  // 'HH:mm' o ''
  motivo: string;
}

export interface Horarios {
  [weekday: string]: string[];
}

export interface PublicConfig {
  negocio: Negocio;
  contacto: Contacto;
  ubicacion: Ubicacion;
  servicios: Servicio[];
  horarios: Horarios;
  disponibilidad: Disponibilidad;
}

export interface CitaCreada {
  fecha: string;
  hora: string;
  nombre: string;
  email: string;
  telefono: string;
  servicio: string;
  precio: number;
  estado: string;
}

export interface CitaPayload {
  fecha: string;     // yyyy-MM-dd
  hora: string;      // HH:mm
  nombre: string;
  email: string;
  telefono?: string;
  servicioId: string;
}
