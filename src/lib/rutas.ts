import { ciudades } from "./ciudades";
import { giros } from "./giros";

/** Todas las rutas públicas indexables. Alimenta el sitemap y llms.txt. */
export const rutasPrincipales = [
  { ruta: "/", titulo: "Inicio", prioridad: 1, resumen: "Qué es GafeteLab y cómo pedir gafetes y credenciales para empleados." },
  { ruta: "/precios", titulo: "Precios", prioridad: 0.9, resumen: "Tabla de precios por cantidad, costo de frente y vuelta y calculadora." },
  { ruta: "/como-funciona", titulo: "Cómo funciona", prioridad: 0.8, resumen: "Los cinco pasos para pedir: plantilla, campos variables, Excel, vista previa y pago." },
  { ruta: "/preguntas-frecuentes", titulo: "Preguntas frecuentes", prioridad: 0.8, resumen: "Respuestas sobre precios, pedido mínimo, entrega, envíos, materiales, factura y datos." },
  { ruta: "/cotizar", titulo: "Cotizar", prioridad: 0.9, resumen: "Calculadora de precio y solicitud de cotización con envío." },
  { ruta: "/gafetes-para", titulo: "Gafetes y credenciales por giro", prioridad: 0.7, resumen: "Índice de páginas por giro de empresa." },
  { ruta: "/gafetes-en", titulo: "Gafetes y credenciales por ciudad", prioridad: 0.7, resumen: "Índice de ciudades de México con envío." },
];

export const rutasGiros = giros.map((g) => ({
  ruta: `/gafetes-para/${g.slug}`,
  titulo: `Gafetes y credenciales para ${g.nombre}`,
  prioridad: 0.7,
  resumen: g.resumen,
}));

export const rutasCiudades = ciudades.map((c) => ({
  ruta: `/gafetes-en/${c.slug}`,
  titulo: `Gafetes y credenciales ${c.enTexto}`,
  prioridad: 0.6,
  resumen: `Envío a ${c.nombre}, ${c.estado}.`,
}));
