import { ciudades } from "./ciudades";
import { giros } from "./giros";

/** Todas las rutas públicas indexables. Alimenta el sitemap y llms.txt. */
export const rutasPrincipales = [
  { ruta: "/", titulo: "Inicio", prioridad: 1, resumen: "Qué es LaGafetería y cómo pedir gafetes y credenciales para empleados o para asistentes a eventos." },
  { ruta: "/precios", titulo: "Precios", prioridad: 0.9, resumen: "Tabla de precios por cantidad, gafete digital, paquetes prepagados, envío y entrega." },
  { ruta: "/materiales", titulo: "Materiales y medidas", prioridad: 0.8, resumen: "Materiales y grosores disponibles, y medidas del archivo: margen de corte, línea de corte y zona segura." },
  { ruta: "/medidas-de-gafetes", titulo: "Medida de un gafete: tamaños, grosores y glosario", prioridad: 0.8, resumen: "Medida estándar de un gafete (CR80, 8.56 × 5.4 cm), otros tamaños a escala, vertical u horizontal, grosores, tamaño del diseño en píxeles y glosario de gafetes y credenciales." },
  { ruta: "/plataforma", titulo: "Plataforma", prioridad: 0.9, resumen: "Qué incluye la plataforma para administrar los gafetes del equipo (altas, bajas, carga de datos, editor de diseño, vista previa) y por qué no tiene costo extra." },
  { ruta: "/como-funciona", titulo: "Cómo funciona", prioridad: 0.8, resumen: "Los cinco pasos para pedir: diseño, campos variables, carga del equipo (Excel, una por una o fotos juntas), vista previa y pago." },
  { ruta: "/preguntas-frecuentes", titulo: "Preguntas frecuentes", prioridad: 0.8, resumen: "Respuestas sobre precios, pedido mínimo, entrega, envíos, materiales, factura y datos." },
  { ruta: "/cotizar", titulo: "Cotizador en línea", prioridad: 0.9, resumen: "Cotizador por modalidad, cantidad y material, con envío, IVA, total y entrega al momento; vista del diseño con zona de impresión; descarga en PDF o envío por correo." },
  { ruta: "/calculadora", titulo: "Calculadora: ¿cuánto te cuesta imprimirlo tú mismo?", prioridad: 0.8, resumen: "Compara el costo real de hacer los gafetes en la oficina (materiales, tiempo y los que se repiten) contra pedirlos impresos en PVC, con los precios vigentes." },
  { ruta: "/gafetes-para", titulo: "Gafetes y credenciales por giro", prioridad: 0.7, resumen: "Índice de páginas por giro de empresa y para eventos." },
  { ruta: "/gafetes-en", titulo: "Envíos a todo México", prioridad: 0.7, resumen: "Cobertura, costo y tiempo de envío, con las ciudades a las que más enviamos." },
  { ruta: "/contacto", titulo: "Contacto", prioridad: 0.5, resumen: "Formulario de contacto para dudas, pedidos especiales y seguimiento. Para saber el precio no hace falta escribir: el cotizador en línea lo da al momento." },
  { ruta: "/terminos", titulo: "Términos y condiciones", prioridad: 0.3, resumen: "Reglas de uso del sitio y de la plataforma: pedidos, precios, pagos, facturas, envíos, cancelaciones, reposiciones y datos del personal." },
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
