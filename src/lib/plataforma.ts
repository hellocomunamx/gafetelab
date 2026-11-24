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
    titulo: "Solicitudes de tu equipo",
    texto: "Aprueba en una sola bandeja los cambios de foto, las correcciones de datos y las reposiciones que pide tu gente.",
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
      "El mismo gafete en el celular de cada persona, para mostrarlo sin traer la tarjeta, con su código QR de verificación. Se paga una sola vez por gafete.",
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
      "Mandas una liga por correo o WhatsApp y cada quien sube sus datos y se toma su foto, sin crear cuenta. La liga se cierra al enviar y tú apruebas o pides una corrección antes de imprimir.",
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
        titulo: "Equipo guiado, paso a paso",
        texto:
          "Primero los datos de tu equipo, luego las fotos y al final el diseño. Siempre sabes qué falta y a quién.",
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
        texto:
          "Invita a quien te ayuda y decide qué puede hacer: dueño, administrador o editor. Con una sola cuenta puedes llevar varias empresas.",
      },
      {
        titulo: "Avisos a tu manera",
        texto: "Elige qué te avisamos por correo y cuándo: al momento, en un resumen semanal los lunes o nunca.",
      },
    ],
  },
  {
    grupo: "Tu gente, por su cuenta",
    resumen: "Cada persona resuelve lo suyo desde su celular, y tú solo apruebas.",
    funciones: [
      {
        titulo: "Portal «Mi gafete»",
        texto:
          "Tu empresa tiene su propia liga. Cada persona entra con un código que le llega a su correo, o con su número de empleado y su NIP.",
      },
      {
        titulo: "Solicitudes con seguimiento",
        texto:
          "Desde su portal piden cambiar su foto, corregir un dato o reponer su gafete. Tú lo apruebas en una sola bandeja y ellos ven en qué va.",
      },
      {
        titulo: "Liga para subir datos y foto",
        texto:
          "Cada quien llena sus datos y se toma la foto, sin crear cuenta. La liga se cierra al enviar y solo se reabre si tú pides una corrección.",
      },
      {
        titulo: "Correcciones con motivo",
        texto:
          "Si una foto no sirve, dices qué cambiar y por qué, y se lo mandas por correo o por WhatsApp con el mensaje ya escrito.",
      },
      {
        titulo: "Cambio de foto desde el gafete digital",
        texto: "La persona propone su foto nueva desde su celular y tú decides si la aceptas, comparando la de antes con la de ahora.",
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
        titulo: "Sube tus gafetes ya listos",
        texto:
          "Si ya tienes el gafete terminado de cada persona, súbelos de forma masiva. Cada uno se asigna solo por el nombre del archivo y revisamos su medida y su calidad.",
      },
      {
        titulo: "Qué va impreso, por diseño",
        texto:
          "Guardas todos los datos de tu equipo y, en cada diseño, eliges cuáles se imprimen y en qué cara. El nombre es opcional, para gafetes genéricos.",
      },
      {
        titulo: "Tú decides qué muestra tu QR",
        texto:
          "Una página de verificación que dice si el gafete está vigente, con los campos que tú elijas, una liga tuya o un dato. Incluido en todos los gafetes, sin costo extra.",
      },
      {
        titulo: "Vista previa de cada gafete",
        texto: "Ves el de cada persona con sus datos reales, y te avisamos a quién le falta la foto o un dato.",
      },
      {
        titulo: "Diseños por reglas",
        texto: "Un diseño distinto según el puesto, el departamento, la sucursal, el tipo de contrato o cualquier otro dato de tu equipo.",
      },
    ],
  },
  {
    grupo: "Tus pedidos",
    resumen: "Pide lo de hoy sin empezar de cero cada vez.",
    funciones: [
      {
        titulo: "Carrito y paquetes prepagados",
        texto:
          "Compra en línea un paquete de lista o uno a la medida. Tus gafetes quedan a tu favor y se usan solos en tus siguientes pedidos.",
      },
      {
        titulo: "Pago en línea",
        texto: "Con tarjeta, en efectivo en OXXO o por transferencia (SPEI). Con tarjeta tienes unos minutos para cancelar sin cargo.",
      },
      {
        titulo: "Envíos con rastreo",
        texto: "Ves el estado de cada pedido y, cuando sale, te llega un correo con la paquetería y la guía para seguirlo.",
      },
      {
        titulo: "Facturas",
        texto: "Tus datos fiscales se capturan una vez. Pides tu factura al pagar o después, dentro del mismo mes.",
      },
      {
        titulo: "Reposiciones",
        texto: "Vuelve a pedir un gafete perdido o dañado sin capturar otra vez sus datos.",
      },
      {
        titulo: "Predeterminados y pedido abierto",
        texto:
          "Tu material, tu diseño y tu dirección ya vienen elegidos. Ve sumando altas y reposiciones, y te avisamos cuando llegues a la cantidad que tú elijas.",
      },
    ],
  },
];

/** Lo que cuida que nadie haga gafetes a nombre de tu empresa ni abuse de la plataforma. */
export const confianzaPlataforma: Funcion[] = [
  {
    titulo: "Verificación a tu elección",
    texto:
      "Con tu constancia de situación fiscal, con tu INE y una prueba de tu negocio, o con un correo de tu empresa. La revisamos a mano y se hace una sola vez.",
  },
  {
    titulo: "Insignia «Empresa verificada»",
    texto: "Cuando tu empresa queda verificada, lo ves en tu plataforma y ya puedes pedir.",
  },
  {
    titulo: "Entra con Google",
    texto: "Crea tu cuenta o entra con tu cuenta de Google en un clic, o con tu correo y contraseña.",
  },
  {
    titulo: "Protección contra abuso",
    texto:
      "Límites de intentos, verificación contra robots y revisión automática de cada foto e identificación que se sube, para que tu plataforma solo tenga lo que debe.",
  },
];

/** El portal de empleados «Mi gafete», contado en pasos para quien lo usa. */
export const portalEmpleados: Funcion[] = [
  {
    titulo: "Una liga para toda tu empresa",
    texto: "Por ejemplo, lagafeteria.com/e/tu-empresa. La compartes una vez en tu grupo de WhatsApp o en tu intranet.",
  },
  {
    titulo: "Entra en segundos",
    texto:
      "Con un código que le llega a su correo, o con su número de empleado y un NIP de 6 números: tú le das uno temporal y la persona crea el suyo.",
  },
  {
    titulo: "Pide lo que necesita",
    texto: "Cambiar su foto, corregir su nombre o su puesto, o reponer su gafete perdido o dañado.",
  },
  {
    titulo: "Tú apruebas, y ve en qué va",
    texto: "Todo llega a una sola bandeja. Apruebas o rechazas con un motivo, y la persona ve el estado desde su celular.",
  },
];

/** Lo que la plataforma no cobra, dicho sin letras chiquitas. */
export const sinCostoExtra = [
  "Sin mensualidad ni anualidad",
  "Sin costo por usuario ni por persona guardada",
  "Sin pedido mínimo",
  "Solo pagas los gafetes que pides",
];
