'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import type { PublicConfig, Servicio } from '../lib/types';

/* =========================================================
   Constantes de presentación
   ========================================================= */
const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const WEEKDAYS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const DOW_LABELS = ['L','M','M','J','V','S','D'];

const CHECK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>';

/* =========================================================
   Utilidades
   ========================================================= */
function money(n: number, currency: string) {
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency || 'MXN',
      maximumFractionDigits: 0,
    }).format(n || 0);
  } catch {
    return '$' + (n || 0);
  }
}

const sameDay = (a: Date | null, b: Date | null) =>
  !!a && !!b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const toISO = (d: Date) =>
  d.getFullYear() + '-' +
  String(d.getMonth() + 1).padStart(2, '0') + '-' +
  String(d.getDate()).padStart(2, '0');

const formatDate = (d: Date) =>
  `${WEEKDAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`;

const telHref = (raw: string) => 'tel:' + String(raw || '').replace(/[^\d+]/g, '');
const waHref = (raw: string) => 'https://wa.me/' + String(raw || '').replace(/[^\d]/g, '');

/* =========================================================
   Página
   ========================================================= */
export default function Page() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Calendario
  const [view, setView] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [date, setDate] = useState<Date | null>(null);

  // Slots (disponibilidad real)
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Selección
  const [time, setTime] = useState<string | null>(null);
  const [service, setService] = useState<Servicio | null>(null);

  // Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [noteErr, setNoteErr] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<null | {
    name: string;
    email: string;
    cita: { fecha: string; hora: string; servicio: string; precio: number };
  }>(null);

  // Soporte modal
  const [supportOpen, setSupportOpen] = useState(false);
  const supportCloseRef = useRef<HTMLButtonElement>(null);
  const supportBtnRef = useRef<HTMLButtonElement>(null);

  /* ----- Cargar config al montar ----- */
  useEffect(() => {
    (async () => {
      try {
        const cfg = await api.getPublicConfig();
        setConfig(cfg);
        // Aplicar colores del tema si los personalizaron
        if (cfg.negocio?.colorPrimario) {
          document.documentElement.style.setProperty('--color-deep-teal', cfg.negocio.colorPrimario);
        }
        if (cfg.negocio?.colorAcento) {
          document.documentElement.style.setProperty('--color-mint-pulse', cfg.negocio.colorAcento);
        }
        // Encontrar primer día abierto
        const cursor = new Date();
        cursor.setHours(0, 0, 0, 0);
        for (let i = 0; i < 90; i++) {
          if (!isClosedDay(cursor, cfg)) {
            setDate(new Date(cursor));
            setView(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
            break;
          }
          cursor.setDate(cursor.getDate() + 1);
        }
      } catch (e) {
        console.error('No se pudo cargar la configuración:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ----- Cargar slots cuando cambia el día seleccionado ----- */
  useEffect(() => {
    if (!date) { setSlots(null); return; }
    let cancelled = false;
    setSlotsLoading(true);
    setTime(null);
    api.getSlots(toISO(date))
      .then((s) => { if (!cancelled) setSlots(s || []); })
      .catch(() => { if (!cancelled) setSlots([]); })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
  }, [date]);

  /* ----- ESC para cerrar modal ----- */
  useEffect(() => {
    if (!supportOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSupportOpen(false);
        supportBtnRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [supportOpen]);

  useEffect(() => {
    if (supportOpen) supportCloseRef.current?.focus();
  }, [supportOpen]);

  /* ----- Helpers de calendario ----- */
  function isClosedDay(d: Date, cfg: PublicConfig = config as PublicConfig): boolean {
    if (!cfg) return true;
    const horarios = cfg.horarios || {};
    const wd = String(d.getDay());
    const list = horarios[wd] || horarios[String(wd)] || [];
    if (!list.length) return true;
    const disp = cfg.disponibilidad || ({} as any);
    const iso = toISO(d);
    if ((disp.diasCerrados || []).includes(iso)) return true;
    const bloqueos = disp.bloqueos || [];
    return bloqueos.some((b: any) => b.fecha === iso && !b.hora);
  }

  /* ----- Render calendario ----- */
  const calendarCells = useMemo(() => {
    const year = view.getFullYear();
    const month = view.getMonth();
    const cells: (Date | null)[] = [];
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [view]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const canPrevMonth = !(
    view.getFullYear() === today.getFullYear() &&
    view.getMonth() === today.getMonth()
  );

  /* ----- Submit cita ----- */
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    if (!service || !date || !time) {
      setNote('Selecciona un servicio, un día y un horario para continuar.');
      setNoteErr(true);
      return;
    }
    if (!name.trim() || !email.trim()) {
      setNote('Escribe tu nombre y correo para confirmar.');
      setNoteErr(true);
      return;
    }
    setSubmitting(true);
    setNote('');
    setNoteErr(false);
    try {
      const result = await api.crearCita({
        fecha: toISO(date),
        hora: time,
        nombre: name.trim(),
        email: email.trim(),
        telefono: phone.trim() || undefined,
        servicioId: service.id,
      });
      if (!result.ok) {
        setNote(result.error || 'No se pudo confirmar la reserva.');
        setNoteErr(true);
        // Recargar slots porque algo cambió
        setSlots(null);
      } else {
        setConfirmation({
          name: name.trim(),
          email: email.trim(),
          cita: {
            fecha: toISO(date),
            hora: time,
            servicio: result.cita.servicio,
            precio: result.cita.precio,
          },
        });
      }
    } catch (err: any) {
      setNote(err?.message || 'Error de conexión. Intenta de nuevo.');
      setNoteErr(true);
    } finally {
      setSubmitting(false);
    }
  }

  /* =========================================================
     BOOT / LOADING
     ========================================================= */
  if (loading) {
    return (
      <div className="boot">
        <span className="boot-spin" /> Cargando…
      </div>
    );
  }

  /* =========================================================
     DATOS DERIVADAS
     ========================================================= */
  const neg = config?.negocio || ({} as any);
  const con = config?.contacto || ({} as any);
  const ubi = config?.ubicacion || ({} as any);
  const servicios = config?.servicios || [];
  const currency = neg.moneda || 'MXN';
  const bizName = neg.nombre || 'Aevi Wellness';

  // Wordmark (split en primer espacio)
  const wmParts = bizName.split(' ');
  const wmFirst = wmParts.length > 1 ? wmParts.slice(0, -1).join(' ') : bizName;
  const wmLast = wmParts.length > 1 ? wmParts[wmParts.length - 1] : '';

  /* =========================================================
     RENDER
     ========================================================= */
  return (
    <>
      {/* Announcement bar */}
      {neg.anuncio ? (
        <div className="announce" dangerouslySetInnerHTML={{ __html: neg.anuncio }} />
      ) : null}

      {/* Header */}
      <header className="site-header">
        <div className="header-inner">
          <a href="#top" className="wordmark">
            {wmFirst}{wmLast ? <> <span>{wmLast}</span></> : null}
          </a>
          <nav className="nav" aria-label="Navegación principal">
            <a href="#agenda">Agenda</a>
            <a href="#servicios">Servicios</a>
            <a href="#ubicacion">Ubicación</a>
          </nav>
        </div>
      </header>

      <main id="top">
        {/* Hero */}
        <section className="hero" aria-label="Presentación">
          <div className="hero-dark">
            <p className="eyebrow">Reservas · {bizName}</p>
            <h1 className="display">Agenda tu ritual</h1>
            <p className="lead">
              {neg.heroTexto ||
                'Elige el día, el horario y el servicio. Confirmamos tu cita al instante y te enviamos los detalles por correo.'}
            </p>
            <div className="hero-actions">
              <a href="#agenda" className="btn-outline-mint">Ver disponibilidad &#8594;</a>
            </div>
          </div>

          <div className="hero-light" aria-hidden="true">
            <div className="hero-mark">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="4.5" width="18" height="16" rx="2" />
                <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
                <circle cx="8" cy="14" r="1" />
                <circle cx="12" cy="14" r="1" />
                <circle cx="16" cy="14" r="1" />
              </svg>
              <span>Reserva</span>
            </div>
          </div>
        </section>

        {/* Agenda */}
        <section id="agenda" className="section section--bone">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">01 — Reservas</p>
              <h2 className="heading-lg">Elige día y horario</h2>
              <p className="lead">Selecciona un día disponible en el calendario y luego tu horario.</p>
            </div>

            <div className="agenda-grid">
              {/* Calendario */}
              <div className="card">
                <div className="cal-head">
                  <button
                    className="cal-nav"
                    type="button"
                    aria-label="Mes anterior"
                    disabled={!canPrevMonth}
                    onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
                  >
                    &#8592;
                  </button>
                  <p className="cal-month">
                    {MONTHS[view.getMonth()]} {view.getFullYear()}
                  </p>
                  <button
                    className="cal-nav"
                    type="button"
                    aria-label="Mes siguiente"
                    onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
                  >
                    &#8594;
                  </button>
                </div>

                <div className="cal-grid" role="grid" aria-label="Calendario de disponibilidad">
                  {DOW_LABELS.map((l, i) => (
                    <div key={i} className="cal-dow">{l}</div>
                  ))}
                  {calendarCells.map((d, i) => {
                    if (!d) return <span key={i} />;
                    const unavailable = d < today || isClosedDay(d);
                    const isToday = sameDay(d, today);
                    const isSelected = sameDay(d, date);
                    return (
                      <button
                        key={i}
                        type="button"
                        className={
                          'day' +
                          (unavailable ? ' is-off' : '') +
                          (isToday ? ' is-today' : '') +
                          (isSelected ? ' is-selected' : '')
                        }
                        aria-label={formatDate(d)}
                        aria-pressed={isSelected}
                        disabled={unavailable}
                        onClick={() => setDate(d)}
                      >
                        {d.getDate()}
                      </button>
                    );
                  })}
                </div>

                <div className="cal-legend">
                  <span><i className="dot dot--open" />Con disponibilidad</span>
                  <span><i className="dot dot--today" />Hoy</span>
                  <span><i className="dot dot--off" />Cerrado</span>
                </div>
              </div>

              {/* Lateral */}
              <div className="agenda-side">
                <div className="card">
                  <p className="card-label">Horarios</p>
                  <p className={'card-sub' + (date ? '' : ' empty')}>
                    {date ? formatDate(date) : 'Selecciona un día'}
                  </p>
                  <div className="slots">
                    {!date && (
                      <p className="lead" style={{ fontSize: 14 }}>
                        Elige un día en el calendario para ver los horarios.
                      </p>
                    )}
                    {date && slotsLoading && (
                      <p className="lead" style={{ fontSize: 14 }}>Cargando horarios…</p>
                    )}
                    {date && !slotsLoading && slots && slots.length === 0 && (
                      <p className="lead" style={{ fontSize: 14 }}>
                        Sin horarios disponibles este día.
                      </p>
                    )}
                    {date && !slotsLoading && slots && slots.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={'slot' + (time === t ? ' is-selected' : '')}
                        aria-pressed={time === t}
                        onClick={() => setTime(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resumen + Form */}
                <div className="card">
                  {confirmation ? (
                    <>
                      <p className="card-label">Reserva confirmada</p>
                      <h3 className="heading" style={{ marginBottom: 12 }}>
                        Gracias, {confirmation.name}.
                      </h3>
                      <p className="lead" style={{ marginBottom: 24, fontSize: 15 }}>
                        Te enviamos los detalles a {confirmation.email}.
                      </p>
                      <dl className="summary">
                        <div><dt>Servicio</dt><dd>{confirmation.cita.servicio}</dd></div>
                        <div><dt>Día</dt><dd>{date ? formatDate(date) : ''}</dd></div>
                        <div><dt>Hora</dt><dd>{confirmation.cita.hora}</dd></div>
                        <div><dt>Total</dt><dd>{money(confirmation.cita.precio, currency)}</dd></div>
                        <div><dt>Estado</dt><dd>Pendiente de confirmación</dd></div>
                      </dl>
                      <button
                        className="btn btn-ghost"
                        type="button"
                        style={{ width: '100%' }}
                        onClick={() => window.location.reload()}
                      >
                        Hacer otra reserva
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="card-label">Tu reserva</p>
                      <dl className="summary">
                        <div><dt>Servicio</dt><dd>{service?.nombre || '—'}</dd></div>
                        <div><dt>Día</dt><dd>{date ? formatDate(date) : '—'}</dd></div>
                        <div><dt>Hora</dt><dd>{time || '—'}</dd></div>
                        <div><dt>Total</dt><dd>{service ? money(service.precio, currency) : '—'}</dd></div>
                      </dl>
                      <form onSubmit={handleSubmit} noValidate>
                        <label className="field">
                          <span>Nombre</span>
                          <input
                            type="text"
                            placeholder="Tu nombre"
                            autoComplete="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                          />
                        </label>
                        <label className="field">
                          <span>Correo</span>
                          <input
                            type="email"
                            placeholder="tu@correo.com"
                            autoComplete="email"
                            inputMode="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                          />
                        </label>
                        <label className="field">
                          <span>Teléfono</span>
                          <input
                            type="tel"
                            placeholder="+52 55 0000 0000"
                            autoComplete="tel"
                            inputMode="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                          />
                        </label>
                        <button
                          className="btn btn-pill"
                          type="submit"
                          disabled={submitting}
                        >
                          {submitting ? 'Confirmando…' : 'Confirmar reserva'}
                        </button>
                        <p
                          className={'form-note' + (noteErr ? ' error' : '')}
                          role="status"
                          aria-live="polite"
                        >
                          {note}
                        </p>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Servicios */}
        <section id="servicios" className="section">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">02 — Carta de servicios</p>
              <h2 className="heading-lg">Tratamientos disponibles</h2>
              <p className="lead">Selecciona un servicio para añadirlo a tu reserva.</p>
            </div>

            <ul className="service-list">
              {servicios.length === 0 && (
                <li className="service-item" style={{ padding: '24px 16px' }}>
                  <p className="lead" style={{ fontSize: 14 }}>No hay servicios disponibles en este momento.</p>
                </li>
              )}
              {servicios.map((s) => {
                const selected = service?.id === s.id;
                return (
                  <li key={s.id} className="service-item">
                    <button
                      type="button"
                      className={'service' + (selected ? ' is-selected' : '')}
                      aria-pressed={selected}
                      onClick={() => setService(s)}
                    >
                      <span className="service-main">
                        <span className="service-name">{s.nombre}</span>
                        <span className="service-desc">{s.descripcion}</span>
                      </span>
                      <span className="service-dur">{s.duracion} min</span>
                      <span className="service-price">{money(s.precio, currency)}</span>
                      <span
                        className="service-check"
                        aria-hidden="true"
                        dangerouslySetInnerHTML={{ __html: CHECK_SVG }}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Ubicación */}
        <section id="ubicacion" className="section section--bone">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">03 — Ubicación</p>
              <h2 className="heading-lg">Cómo llegar</h2>
              <p className="lead">Toca el mapa para abrir la navegación en tu teléfono.</p>
            </div>

            <a
              className="map-card"
              href={ubi.mapLink || '#'}
              target="_blank"
              rel="noopener"
              aria-label="Abrir navegación hacia la tienda"
            >
              {ubi.mapEmbed ? (
                <iframe
                  src={ubi.mapEmbed}
                  title="Mapa de ubicación de la tienda"
                  loading="lazy"
                />
              ) : null}
              <span className="map-cta">Abrir navegación &#8594;</span>
            </a>

            <dl className="location-meta">
              <div>
                <dt>Dirección</dt>
                <dd>{con.direccion || '—'}</dd>
              </div>
              <div>
                <dt>Horario</dt>
                <dd>{con.horarioTexto || '—'}</dd>
              </div>
              <div>
                <dt>Estacionamiento</dt>
                <dd>{con.estacionamiento || '—'}</dd>
              </div>
            </dl>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <p className="footer-title">{bizName}</p>
              <ul className="footer-list">
                <li>{con.direccion || '—'}</li>
              </ul>
            </div>
            <div>
              <p className="footer-title">Contacto</p>
              <ul className="footer-list">
                <li><a href={telHref(con.telefono)}>{con.telefono || '—'}</a></li>
                <li><a href={'mailto:' + (con.email || '')}>{con.email || '—'}</a></li>
                <li><a href={waHref(con.whatsapp)} target="_blank" rel="noopener">WhatsApp</a></li>
              </ul>
            </div>
            <div>
              <p className="footer-title">Redes</p>
              <ul className="footer-list">
                <li><a href={con.instagram || '#'} target="_blank" rel="noopener">Instagram</a></li>
                <li><a href={con.facebook || '#'} target="_blank" rel="noopener">Facebook</a></li>
                <li><a href={con.tiktok || '#'} target="_blank" rel="noopener">TikTok</a></li>
              </ul>
            </div>
          </div>
          <p className="footer-bottom">
            © {new Date().getFullYear()} {bizName}. Todos los derechos reservados.
          </p>
        </div>
      </footer>

      {/* Soporte FAB + Modal */}
      <button
        ref={supportBtnRef}
        className="support-fab"
        type="button"
        aria-haspopup="dialog"
        onClick={() => setSupportOpen(true)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 12a9 9 0 1 1-3.2-6.9" />
          <path d="M21 4v5h-5" />
        </svg>
        Soporte
      </button>

      {supportOpen && (
        <div
          className="modal is-open"
          role="dialog"
          aria-modal="true"
          aria-labelledby="supportTitle"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSupportOpen(false);
          }}
        >
          <div className="modal-panel">
            <div className="modal-head">
              <div>
                <p className="card-label">Atención</p>
                <h3 className="heading" id="supportTitle">Estamos aquí</h3>
              </div>
              <button
                ref={supportCloseRef}
                className="modal-close"
                type="button"
                aria-label="Cerrar"
                onClick={() => setSupportOpen(false)}
              >
                &times;
              </button>
            </div>

            <div className="contact-row">
              <span>Teléfono</span>
              <a href={telHref(con.telefono)}>{con.telefono || '—'}</a>
            </div>
            <div className="contact-row">
              <span>WhatsApp</span>
              <a href={waHref(con.whatsapp)} target="_blank" rel="noopener">Escribir mensaje</a>
            </div>
            <div className="contact-row">
              <span>Correo</span>
              <a href={'mailto:' + (con.email || '')}>{con.email || '—'}</a>
            </div>
            <div className="contact-row">
              <span>Instagram</span>
              <a href={con.instagram || '#'} target="_blank" rel="noopener">@aeviwellness</a>
            </div>
            <div className="contact-row">
              <span>Facebook</span>
              <a href={con.facebook || '#'} target="_blank" rel="noopener">/aeviwellness</a>
            </div>
            <div className="contact-row">
              <span>TikTok</span>
              <a href={con.tiktok || '#'} target="_blank" rel="noopener">@aeviwellness</a>
            </div>

            <p className="modal-footnote">
              Horario de atención: {con.horarioTexto || '—'}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
