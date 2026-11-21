import { ciudades } from "./ciudades";
import { giros } from "./giros";

/** Todas las rutas públicas indexables. Alimenta el sitemap y llms.txt. */
export const rutasPrincipales = [
  { ruta: "/", titulo: "Inicio", prioridad: 1, resumen: "Qué es LaGafetería y cómo pedir gafetes y credenciales para empleados." },
  { ruta: "/precios", titulo: "Precios", prioridad: 0.9, resumen: "Tabla de precios por cantidad para gafetes impresos y digitales, envío y entrega." },
  { ruta: "/como-funciona", titulo: "Cómo funciona", prioridad: 0.8, resumen: "Los cinco pasos para pedir: plantilla, campos variables, Excel, vista previa y pago." },
  { ruta: "/preguntas-frecuentes", titulo: "Preguntas frecuentes", prioridad: 0.8, resumen: "Respuestas sobre precios, pedido mínimo, entrega, envíos, materiales, factura y datos." },
  { ruta: "/cotizar", titulo: "Cotizar", prioridad: 0.9, resumen: "Cotizador con precio, envío, IVA, total y entrega al momento; descarga en PDF o envío por correo." },
  { ruta: "/gafetes-para", titulo: "Gafetes y credenciales por giro", prioridad: 0.7, resumen: "Índice de páginas por giro de empresa." },
  { ruta: "/gafetes-en", titulo: "Gafetes y credenciales por ciudad", prioridad: 0.7, resumen: "Índice de ciudades de México con envío." },
  { ruta: "/aviso-de-privacidad", titulo: "Aviso de privacidad", prioridad: 0.3, resumen: "Quién es responsable de los datos, qué datos se tratan y cómo ejercer los derechos ARCO." },
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
