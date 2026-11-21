/** Lo que una empresa puede hacer en su plataforma una vez creada su cuenta. */
export const accionesPlataforma = [
  {
    titulo: "Altas",
    texto: "Agrega a quien entra a tu equipo y pide su gafete, uno solo o un grupo con Excel.",
  },
  {
    titulo: "Bajas",
    texto: "Da de baja a quien ya no trabaja contigo para que no aparezca en pedidos futuros.",
  },
  {
    titulo: "Reposiciones",
    texto: "Vuelve a pedir un gafete perdido o dañado sin capturar otra vez sus datos.",
  },
  {
    titulo: "Desactivaciones",
    texto: "Desactiva un gafete digital al momento: su código QR deja de mostrarlo como vigente.",
  },
  {
    titulo: "Reactivaciones",
    texto: "Reactívalo cuando la persona regrese, sin emitir un gafete nuevo.",
  },
];

/** Cómo se configura la plataforma para que cada pedido salga solo. */
export const ajustesPlataforma = [
  {
    titulo: "Predeterminados de tu negocio",
    texto:
      "Guarda una vez tu material, tu diseño, tus campos y tu dirección de entrega. Cada pedido nuevo arranca con eso ya elegido.",
  },
  {
    titulo: "Pedido abierto con aviso",
    texto:
      "Ve sumando altas y reposiciones conforme ocurren. Cuando llegas a la cantidad que tú elijas, te avisamos y te mostramos la cotización lista para confirmar.",
  },
  {
    titulo: "Diseños por reglas",
    texto:
      "Asigna un diseño distinto según el puesto, el departamento, la sucursal o el tipo de contrato (planta, temporal o visitante). Cada persona recibe el que le toca.",
  },
  {
    titulo: "Campos a tu medida",
    texto:
      "Elige qué campos lleva tu gafete y si van al frente o a la vuelta. Con eso se genera la plantilla de Excel que descargas, llenas y subes.",
  },
];

/** Qué es cada modalidad, en una línea. */
export const modalidadesDetalle = [
  {
    titulo: "Impreso",
    texto:
      "El gafete de siempre: tarjeta de PVC rígido tamaño CR80, a una cara o por frente y vuelta, enviada a tu empresa.",
  },
  {
    titulo: "Digital",
    texto:
      "El gafete en el celular de cada persona, con un código QR que cualquiera puede escanear para comprobar que sigue vigente.",
  },
  {
    titulo: "Impreso + digital",
    texto:
      "Las dos versiones del mismo gafete: la tarjeta para portar y la digital para verificar.",
  },
];
