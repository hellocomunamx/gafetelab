import { ciudades } from "./ciudades";
import { giros } from "./giros";

/** Todas las rutas públicas indexables. Alimenta el sitemap y llms.txt. */
export const rutasPrincipales = [
  { ruta: "/", titulo: "Inicio", prioridad: 1, resumen: "Qué es LaGafetería y cómo pedir gafetes y credenciales para empleados." },
  { ruta: "/precios", titulo: "Precios", prioridad: 0.9, resumen: "Tabla de precios por cantidad, gafete digital, paquetes prepagados, envío y entrega." },
  { ruta: "/materiales", titulo: "Materiales y medidas", prioridad: 0.8, resumen: "Materiales y grosores disponibles, y medidas del archivo: margen de corte, línea de corte y zona segura." },
  { ruta: "/plataforma", titulo: "Plataforma", prioridad: 0.9, resumen: "Qué incluye la plataforma para administrar los gafetes del equipo (altas, bajas, carga de datos, editor de diseño, vista previa) y por qué no tiene costo extra." },
  { ruta: "/como-funciona", titulo: "Cómo funciona", prioridad: 0.8, resumen: "Los cinco pasos para pedir: diseño, campos variables, carga del equipo (Excel, una por una o fotos juntas), vista previa y pago." },
  { ruta: "/preguntas-frecuentes", titulo: "Preguntas frecuentes", prioridad: 0.8, resumen: "Respuestas sobre precios, pedido mínimo, entrega, envíos, materiales, factura y datos." },
  { ruta: "/cotizar", titulo: "Cotizar", prioridad: 0.9, resumen: "Cotizador por modalidad, cantidad y material, con envío, IVA, total y entrega al momento; vista del diseño con zona de impresión; descarga en PDF o envío por correo." },
  { ruta: "/gafetes-para", titulo: "Gafetes y credenciales por giro", prioridad: 0.7, resumen: "Índice de páginas por giro de empresa." },
  { ruta: "/gafetes-en", titulo: "Envíos a todo México", prioridad: 0.7, resumen: "Cobertura, costo y tiempo de envío, con las ciudades a las que más enviamos." },
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
