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
    texto: "Desactiva un gafete al momento: quien escanee su código QR ya no lo ve como vigente.",
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
      "El mismo gafete en el celular de cada persona, para mostrarlo sin traer la tarjeta, con su código QR de verificación.",
  },
  {
    titulo: "Impreso + digital",
    texto:
      "Las dos versiones del mismo gafete: la tarjeta para portar y la digital para llevar en el celular.",
  },
];

export type Funcion = { titulo: string; texto: string; pronto?: boolean };

/**
 * Las formas de subir los datos del equipo (paso 3). `pronto` marca lo que
 * todavía no está disponible: quítalo cuando se libere.
 */
export const formasDeCargar: Funcion[] = [
  {
    titulo: "Con Excel",
    texto:
      "Descarga la plantilla con las columnas de tus campos, llénala y súbela. Cada renglón es una persona, y quien ya estaba se actualiza en lugar de repetirse.",
  },
  {
    titulo: "Una por una",
    texto: "Para la persona que entró hoy: capturas sus datos, subes su foto y queda lista en un minuto.",
  },
  {
    titulo: "Todas las fotos juntas",
    texto:
      "Arrastra las fotos de todos o un archivo ZIP. Cada una se asigna sola por número de empleado o por nombre, y las dudosas te las preguntamos.",
  },
  {
    titulo: "Con una liga para cada persona",
    texto:
      "Mandas una liga por correo o WhatsApp y cada quien sube sus datos y su foto, sin crear cuenta. Tú apruebas o rechazas antes de imprimir.",
  },
];

/**
 * Todo lo que incluye la plataforma, por grupos. `pronto` marca lo que todavía
 * no está disponible: quítalo de cada función conforme se libere.
 */
export const funcionesPlataforma: { grupo: string; resumen: string; funciones: Funcion[] }[] = [
  {
    grupo: "Tu equipo",
    resumen: "Todas las personas de tu empresa en un solo lugar, siempre al día.",
    funciones: [
      {
        titulo: "Altas y bajas",
        texto:
          "Agrega a quien entra y da de baja a quien se va. Filtra por departamento, puesto, estatus o tipo de contrato.",
      },
      {
        titulo: "Carga como te acomode",
        texto: "Con Excel, una persona a la vez, las fotos de todos juntas o una liga para cada persona. Nadie se captura dos veces.",
      },
      {
        titulo: "Historial de cada persona",
        texto: "Cuántos gafetes se le han emitido, cuándo y por qué: alta, reposición o cambio de datos.",
      },
      {
        titulo: "Usuarios con roles",
        texto: "Invita a quien te ayuda con los gafetes y decide qué puede hacer: dueño, administrador o editor.",
      },
      {
        titulo: "Liga para cada persona",
        texto: "Cada quien sube sus datos y su foto desde su celular, y tú apruebas o rechazas.",
      },
    ],
  },
  {
    grupo: "Tu diseño",
    resumen: "El gafete de tu empresa, como tú lo quieres, sin mandar archivos por correo.",
    funciones: [
      {
        titulo: "Editor de diseño",
        texto:
          "Arrastra tu logo, los campos, la foto y el código QR a donde quieras, por frente y vuelta. Parte de una plantilla, de tu propio fondo o de cero.",
      },
      {
        titulo: "Campos a tu medida",
        texto: "Tú decides qué lleva tu gafete: puesto, área, tipo de sangre, vigencia o lo que tu empresa necesite.",
      },
      {
        titulo: "Tú decides qué muestra tu QR",
        texto:
          "Una página de verificación que dice si el gafete está vigente o expirado, una liga tuya o un dato. Va incluida en todos los gafetes, sin costo extra.",
      },
      {
        titulo: "Vista previa de cada gafete",
        texto: "Ves el de cada persona con sus datos reales, y te avisamos a quién le falta la foto o un dato.",
      },
      {
        titulo: "Diseños por reglas",
        texto: "Un diseño distinto según el puesto, el departamento, la sucursal o el tipo de contrato.",
        pronto: true,
      },
    ],
  },
  {
    grupo: "Tus pedidos",
    resumen: "Pide lo de hoy sin empezar de cero cada vez.",
    funciones: [
      {
        titulo: "Envío y facturación guardados",
        texto: "Tus direcciones y tus datos fiscales se capturan una vez y quedan listos para cada pedido.",
      },
      {
        titulo: "Reposiciones",
        texto: "Vuelve a pedir un gafete perdido o dañado sin capturar otra vez sus datos.",
        pronto: true,
      },
      {
        titulo: "Predeterminados de tu negocio",
        texto: "Tu material, tu diseño y tu dirección de entrega ya vienen elegidos en cada pedido nuevo.",
        pronto: true,
      },
      {
        titulo: "Pedido abierto con aviso",
        texto: "Ve sumando altas y reposiciones, y te avisamos cuando llegues a la cantidad que tú elijas.",
        pronto: true,
      },
    ],
  },
];

/** Lo que la plataforma no cobra, dicho sin letras chiquitas. */
export const sinCostoExtra = [
  "Sin mensualidad ni anualidad",
  "Sin costo por usuario ni por persona guardada",
  "Sin pedido mínimo",
  "Solo pagas los gafetes que pides",
];
