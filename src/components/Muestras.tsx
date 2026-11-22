/**
 * Ilustraciones de producto hechas con HTML y SVG: gafetes de muestra, el gafete
 * digital en un celular y la plataforma. No llevan JavaScript ni imágenes
 * externas, así que no pesan en la carga. Todas son decorativas: quien las usa
 * pone el texto alternativo en el contenedor.
 */

const sombra = "shadow-[0_18px_40px_-14px_rgba(27,31,59,0.4)]";

const tonos = {
  rojo: { fondo: "#ffd9d5", figura: "#e63b2e" },
  tinta: { fondo: "#dcdfea", figura: "#1b1f3b" },
  ambar: { fondo: "#fff1c2", figura: "#c98a00" },
  verde: { fondo: "#d3f0e3", figura: "#0a7d4f" },
  azul: { fondo: "#d9e4ff", figura: "#1d4ed8" },
};
export type Tono = keyof typeof tonos;

/** Silueta que hace las veces de fotografía. */
export function Retrato({ tono = "rojo", className = "" }: { tono?: Tono; className?: string }) {
  const t = tonos[tono];
  return (
    <svg viewBox="0 0 40 48" preserveAspectRatio="xMidYMid slice" aria-hidden className={className}>
      <rect width="40" height="48" fill={t.fondo} />
      <circle cx="20" cy="18" r="8.5" fill={t.figura} />
      <path d="M3 48c0-11 7.5-17 17-17s17 6 17 17z" fill={t.figura} />
    </svg>
  );
}

const LADO = 21;

/** Dibujo de un código QR (ilustrativo: el real se genera al emitir cada gafete). */
function trazoQr(semilla: number): string {
  const esquina = (x: number, y: number) => {
    const borde = x === 0 || x === 6 || y === 0 || y === 6;
    return borde || (x >= 2 && x <= 4 && y >= 2 && y <= 4);
  };
  let d = "";
  for (let y = 0; y < LADO; y++) {
    for (let x = 0; x < LADO; x++) {
      const izq = x < 8;
      const der = x >= LADO - 8;
      const arr = y < 8;
      const aba = y >= LADO - 8;
      let lleno: boolean;
      if (izq && arr) lleno = x < 7 && y < 7 && esquina(x, y);
      else if (der && arr) lleno = x >= LADO - 7 && y < 7 && esquina(x - (LADO - 7), y);
      else if (izq && aba) lleno = x < 7 && y >= LADO - 7 && esquina(x, y - (LADO - 7));
      else lleno = (Math.imul((x * 73856093) ^ (y * 19349663) ^ (semilla * 83492791), 2654435761) >>> 0) % 100 < 47;
      if (lleno) d += `M${x} ${y}h1v1h-1z`;
    }
  }
  return d;
}
const QR_A = trazoQr(7);
const QR_B = trazoQr(23);

export function QrMuestra({ variante = "a", className = "" }: { variante?: "a" | "b"; className?: string }) {
  return (
    <svg viewBox={`0 0 ${LADO} ${LADO}`} shapeRendering="crispEdges" aria-hidden className={className}>
      <path d={variante === "a" ? QR_A : QR_B} fill="currentColor" />
    </svg>
  );
}

function Dato({ nombre, valor }: { nombre: string; valor: string }) {
  return (
    <div>
      <dt className="text-[9px] font-semibold tracking-wider text-gris uppercase">{nombre}</dt>
      <dd className="text-[13px] leading-tight font-semibold">{valor}</dd>
    </div>
  );
}

/** Gafete horizontal tamaño CR80, por el frente o por la vuelta. */
export function GafeteHorizontal({ cara = "frente", className = "" }: { cara?: "frente" | "vuelta"; className?: string }) {
  const base = `flex aspect-[856/540] w-[300px] flex-col overflow-hidden rounded-[14px] bg-white text-left text-tinta ${sombra} ${className}`;
  if (cara === "vuelta") {
    return (
      <div className={base}>
        <div className="flex flex-1 items-center gap-4 px-4">
          <QrMuestra className="size-[104px] shrink-0" />
          <dl className="space-y-2">
            <Dato nombre="Vigencia" valor="Diciembre 2027" />
            <Dato nombre="Departamento" valor="Ventas" />
            <Dato nombre="Tipo de sangre" valor="O+" />
          </dl>
        </div>
        <p className="bg-tinta px-4 py-1.5 text-center text-[10px] font-semibold tracking-wider text-white uppercase">
          Escanea para verificar
        </p>
      </div>
    );
  }
  return (
    <div className={base}>
      <div className="flex items-center gap-2 bg-rojo px-4 py-2.5 text-white">
        <span className="flex size-6 items-center justify-center rounded-full bg-white font-titulos text-xs font-extrabold text-rojo">
          T
        </span>
        <span className="font-titulos text-base leading-none font-extrabold">Tu empresa</span>
        <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-semibold tracking-wider uppercase">
          Planta
        </span>
      </div>
      <div className="flex flex-1 items-center gap-3.5 px-4">
        <Retrato tono="rojo" className="h-[96px] w-[78px] shrink-0 rounded-lg" />
        <div className="min-w-0">
          <p className="font-titulos text-[22px] leading-[1.05] font-extrabold">Karla Méndez</p>
          <p className="mt-1 text-sm text-gris">Cajera</p>
          <p className="mt-2 text-[10px] font-semibold tracking-wider text-gris uppercase">No. de empleado 0142</p>
        </div>
      </div>
      <div className="h-2 bg-tinta" />
    </div>
  );
}

/** Gafete vertical tamaño CR80, por el frente o por la vuelta. */
export function GafeteVertical({ cara = "frente", className = "" }: { cara?: "frente" | "vuelta"; className?: string }) {
  const base = `flex aspect-[540/856] w-[150px] flex-col overflow-hidden rounded-[14px] bg-white text-center text-tinta ${sombra} ${className}`;
  if (cara === "vuelta") {
    return (
      <div className={`${base} items-center px-3 pt-5 pb-0`}>
        <QrMuestra variante="b" className="size-[96px]" />
        <p className="mt-2 text-[9px] font-semibold tracking-wider text-gris uppercase">Escanea para verificar</p>
        <dl className="mt-3 space-y-1.5">
          <Dato nombre="Vigencia" valor="Junio 2027" />
          <Dato nombre="Sucursal" valor="Centro" />
        </dl>
        <div className="mt-auto h-2 w-[150px] shrink-0 bg-resaltador" />
      </div>
    );
  }
  return (
    <div className={base}>
      <div className="bg-tinta px-3 pt-2.5 pb-9 text-white">
        <span className="mx-auto mb-2 block h-2 w-9 rounded-full bg-white/90" />
        <span className="font-titulos text-sm leading-none font-extrabold">Tu empresa</span>
      </div>
      <Retrato tono="ambar" className="mx-auto -mt-7 size-[68px] shrink-0 rounded-full ring-4 ring-white" />
      <p className="mt-2 px-2 font-titulos text-[17px] leading-[1.05] font-extrabold">Luis Ortega</p>
      <p className="mt-0.5 text-xs text-gris">Supervisor</p>
      <p className="mt-2 text-[9px] font-semibold tracking-wider text-gris uppercase">No. 0087</p>
      <p className="mt-auto bg-resaltador py-1 text-[9px] font-bold tracking-widest uppercase">Seguridad</p>
    </div>
  );
}

const claseSello = "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase";

export function SelloVigente({ className = "" }: { className?: string }) {
  return (
    <span className={`${claseSello} bg-[#d3f0e3] text-[#075f3c] ${className}`}>
      <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
        <path d="M2 6.5l2.6 2.6L10 3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Vigente
    </span>
  );
}

export function SelloExpirado({ className = "" }: { className?: string }) {
  return (
    <span className={`${claseSello} bg-[#ffd9d5] text-[#a8231a] ${className}`}>
      <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
        <path d="M3 3l6 6M9 3l-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      Expirado
    </span>
  );
}

/**
 * El gafete digital en un celular. `estado` fija el sello; con "cambia" se
 * muestran los dos y la animación del héroe alterna entre ellos.
 */
export function Celular({
  estado = "vigente",
  className = "",
}: {
  estado?: "vigente" | "expirado" | "cambia";
  className?: string;
}) {
  return (
    <div className={`h-[330px] w-[170px] rounded-[30px] bg-tinta p-2 text-tinta ${sombra} ${className}`}>
      <div className="relative flex h-full flex-col items-center overflow-hidden rounded-[23px] bg-white text-center">
        <span className="absolute top-1.5 h-1.5 w-12 rounded-full bg-tinta" />
        <div className="w-full bg-rojo px-3 pt-6 pb-8 text-white">
          <p className="text-[9px] font-semibold tracking-widest uppercase opacity-80">Gafete digital</p>
          <p className="font-titulos text-sm leading-tight font-extrabold">Tu empresa</p>
        </div>
        <Retrato tono="tinta" className="-mt-6 size-[58px] shrink-0 rounded-full ring-4 ring-white" />
        <p className="mt-1.5 font-titulos text-base leading-none font-extrabold">Ana Robles</p>
        <p className="mt-0.5 text-[11px] text-gris">Enfermera</p>
        <QrMuestra variante="b" className="mt-2.5 size-[76px]" />
        <div className="relative mt-auto mb-3 flex h-7 w-full items-center justify-center">
          {estado === "cambia" ? (
            <>
              <SelloVigente className="sello-vigente absolute" />
              <SelloExpirado className="sello-expirado absolute" />
            </>
          ) : estado === "vigente" ? (
            <SelloVigente />
          ) : (
            <SelloExpirado />
          )}
        </div>
      </div>
    </div>
  );
}

const equipo: { nombre: string; puesto: string; area: string; tono: Tono; estatus: "Activo" | "Baja" | "Alta nueva" }[] = [
  { nombre: "Karla Méndez", puesto: "Cajera", area: "Ventas", tono: "rojo", estatus: "Activo" },
  { nombre: "Luis Ortega", puesto: "Supervisor", area: "Seguridad", tono: "ambar", estatus: "Activo" },
  { nombre: "Ana Robles", puesto: "Enfermera", area: "Clínica", tono: "tinta", estatus: "Alta nueva" },
  { nombre: "Diego Salas", puesto: "Almacenista", area: "Bodega", tono: "azul", estatus: "Activo" },
  { nombre: "Marta Ibarra", puesto: "Recepcionista", area: "Ventas", tono: "verde", estatus: "Baja" },
];

const claseEstatus = {
  Activo: "bg-[#d3f0e3] text-[#075f3c]",
  "Alta nueva": "bg-resaltador/60 text-tinta",
  Baja: "bg-linea text-gris",
};

/**
 * La plataforma dentro de una ventana de navegador: el equipo con su estatus y,
 * en la versión completa, la vista previa de un gafete. La versión `compacta`
 * es la que cabe en el héroe.
 */
export function VentanaPlataforma({ compacta = false, className = "" }: { compacta?: boolean; className?: string }) {
  const filas = compacta ? equipo.slice(0, 4) : equipo;
  return (
    <div className={`overflow-hidden rounded-[14px] bg-white text-left text-tinta ${sombra} ${className}`}>
      <div className="flex items-center gap-1.5 border-b border-linea bg-papel px-3 py-2">
        <span className="size-2 rounded-full bg-rojo-claro" />
        <span className="size-2 rounded-full bg-resaltador" />
        <span className="size-2 rounded-full bg-[#5fcf9a]" />
        <span className="ml-2 truncate rounded-full bg-white px-2.5 py-0.5 text-[10px] text-gris">
          lagafeteria.com/cuenta
        </span>
      </div>

      <div className={`flex items-center gap-1 border-b border-linea px-3 py-2 ${compacta ? "text-[10px]" : "text-xs"}`}>
        <span className="mr-2 font-titulos font-extrabold">Tu empresa</span>
        <span className="rounded-full bg-tinta px-2.5 py-1 font-semibold text-white">Equipo</span>
        <span className="px-1.5 py-1 font-semibold">Diseños</span>
        <span className={`px-1.5 py-1 font-semibold ${compacta ? "hidden" : "hidden sm:inline"}`}>Campos</span>
        <span className={`px-1.5 py-1 font-semibold ${compacta ? "hidden" : "hidden sm:inline"}`}>Envío y facturación</span>
      </div>

      <div className={compacta ? "p-3" : "grid gap-4 p-4 md:grid-cols-[1fr_210px]"}>
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`font-titulos leading-none font-extrabold ${compacta ? "text-sm" : "text-lg"}`}>
              Equipo
              <span className={`font-texto text-[11px] font-normal text-gris ${compacta ? "ml-1.5" : "mt-1 block"}`}>
                128 personas
              </span>
            </p>
            <div className="flex gap-1.5 text-[10px] font-semibold whitespace-nowrap">
              {compacta ? null : <span className="rounded-full border border-tinta px-2 py-1">Importar Excel</span>}
              <span className="rounded-full bg-rojo px-2 py-1 text-white">Agregar persona</span>
            </div>
          </div>
          <ul className="mt-2.5 divide-y divide-linea rounded-tarjeta-chica border border-linea">
            {filas.map((p) => (
              <li key={p.nombre} className={`flex items-center gap-2.5 px-2.5 ${compacta ? "py-1.5" : "py-2"}`}>
                <Retrato tono={p.tono} className={`shrink-0 rounded-md ${compacta ? "size-6" : "size-8"}`} />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate font-semibold ${compacta ? "text-[11px]" : "text-sm"}`}>{p.nombre}</span>
                  <span className={`block truncate text-gris ${compacta ? "text-[9px]" : "text-xs"}`}>
                    {p.puesto} · {p.area}
                  </span>
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 font-semibold ${compacta ? "text-[9px]" : "text-[11px]"} ${claseEstatus[p.estatus]}`}>
                  {p.estatus}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {compacta ? null : (
          <div className="hidden rounded-tarjeta-chica bg-papel p-3 md:block">
            <p className="text-xs font-semibold">Vista previa</p>
            <div className="mt-2 flex h-[122px] items-start justify-center overflow-hidden">
              <GafeteHorizontal className="shrink-0 origin-top scale-[0.62] shadow-none ring-1 ring-linea" />
            </div>
            <p className="mt-2 text-xs font-semibold text-[#075f3c]">Listo para imprimir</p>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-tarjeta-chica bg-white px-1 py-1.5">
                <dt className="font-titulos text-lg leading-none font-extrabold">125</dt>
                <dd className="text-[10px] text-gris">gafetes listos</dd>
              </div>
              <div className="rounded-tarjeta-chica bg-white px-1 py-1.5">
                <dt className="font-titulos text-lg leading-none font-extrabold">3</dt>
                <dd className="text-[10px] text-gris">les falta algo</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
