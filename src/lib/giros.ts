import type { Faq } from "./faqs";

export type Giro = {
  slug: string;
  /** "restaurantes", para "Gafetes y credenciales para restaurantes" */
  nombre: string;
  /** Texto corto para tarjetas y enlaces. */
  resumen: string;
  /** Meta description. */
  descripcion: string;
  /** Respuesta directa a "¿qué gafete necesita un ___?" */
  respuesta: string;
  /** Nombre y puesto de ejemplo para el gafete ilustrativo. */
  ejemplo: { nombre: string; puesto: string };
  retos: string[];
  campos: string[];
  consejo: string;
  /** Tres funciones de la plataforma que más le sirven a este giro, contadas en su idioma. */
  plataforma: { titulo: string; texto: string }[];
  faqs: Faq[];
};

export const giros: Giro[] = [
  {
    slug: "tiendas-y-retail",
    nombre: "tiendas y retail",
    resumen: "Cajeros, vendedores y personal de piso, con rotación constante.",
    descripcion:
      "Gafetes y credenciales para tiendas, sucursales y cadenas de retail. Carga tu plantilla de personal con Excel, repón gafetes sueltos sin pedido mínimo y recibe en cualquier sucursal de México.",
    respuesta:
      "Un gafete para tienda debe decir, a un metro de distancia, quién atiende: nombre de pila en grande, puesto y el logo de la marca. Lo demás (número de empleado, sucursal o código QR) puede ir más chico o al reverso.",
    ejemplo: { nombre: "Karla", puesto: "Cajera" },
    retos: [
      "Entra y sale gente cada mes, y cada ingreso necesita su gafete sin esperar al pedido grande.",
      "Varias sucursales con el mismo diseño, pero con datos y entregas distintas.",
      "El cliente tiene que leer el nombre sin acercarse.",
    ],
    campos: ["Nombre de pila", "Puesto", "Sucursal", "Número de empleado", "Logo de la tienda"],
    consejo:
      "Usa solo el nombre de pila en letra grande. El apellido casi nunca hace falta frente al cliente y le quita espacio al nombre.",
    plataforma: [
      { titulo: "Una liga para cada ingreso", texto: "El cajero nuevo llena sus datos y se toma la foto desde su celular. Tú apruebas y pides su gafete el mismo día." },
      { titulo: "Diseño por sucursal", texto: "Con diseños por reglas, cada tienda o cada puesto recibe el gafete que le toca, sin armar pedidos por separado." },
      { titulo: "Pedido abierto", texto: "Ve sumando altas y reposiciones de todas tus sucursales y te avisamos cuando llegues a la cantidad que elegiste." },
    ],
    faqs: [
      {
        pregunta: "¿Puedo pedir gafetes para varias sucursales en un solo pedido?",
        respuesta:
          "Sí. Agrega una columna de sucursal en tu Excel y todos los gafetes salen con el mismo diseño y el dato de cada tienda.",
      },
      {
        pregunta: "¿Qué hago cuando entra un empleado nuevo?",
        respuesta:
          "Pides solo su gafete. No hay pedido mínimo, así que no necesitas esperar a juntar varios ingresos.",
      },
    ],
  },
  {
    slug: "restaurantes",
    nombre: "restaurantes",
    resumen: "Meseros, cocina, hostess y repartidores identificados.",
    descripcion:
      "Gafetes y credenciales para restaurantes, cafeterías y cadenas de comida. Identifica a meseros, cocina y repartidores con gafetes de PVC resistentes, desde una pieza y con envío a todo México.",
    respuesta:
      "En un restaurante el gafete sirve para que el comensal llame al mesero por su nombre y para distinguir áreas. Funciona mejor con el nombre de pila grande, el puesto y un color por área: salón, cocina, barra o reparto.",
    ejemplo: { nombre: "Luis", puesto: "Mesero" },
    retos: [
      "Mucha rotación y personal por temporada.",
      "El gafete se moja, se mancha y se limpia todos los días.",
      "Cada área necesita distinguirse de un vistazo.",
    ],
    campos: ["Nombre de pila", "Puesto", "Área", "Logo del restaurante"],
    consejo:
      "El PVC se limpia con un trapo húmedo, así que aguanta la operación diaria. Evita fondos muy claros en cocina, donde las manchas se notan más.",
    plataforma: [
      { titulo: "Paquetes prepagados", texto: "Deja pagados tus gafetes, con envíos incluidos, y pide uno cada vez que entra alguien." },
      { titulo: "Un color por área", texto: "Con diseños por reglas, salón, cocina, barra y reparto reciben su versión sin que tú elijas una por una." },
      { titulo: "Reposición desde el celular", texto: "Si un mesero pierde su gafete, lo pide desde «Mi gafete» y tú solo apruebas la reposición." },
    ],
    faqs: [
      {
        pregunta: "¿Los gafetes aguantan el uso en cocina y salón?",
        respuesta:
          "Sí. Son de PVC rígido, no de papel enmicado: no se despegan con la humedad y se pueden limpiar con un trapo húmedo.",
      },
      {
        pregunta: "¿Puedo tener un color distinto por área?",
        respuesta:
          "Sí. Puedes usar un diseño por área o un mismo diseño con una franja de color que cambia según la columna de área en tu Excel.",
      },
    ],
  },
  {
    slug: "seguridad-privada",
    nombre: "empresas de seguridad privada",
    resumen: "Guardias y supervisores con foto, número y vigencia.",
    descripcion:
      "Gafetes y credenciales para empresas de seguridad privada: guardias, supervisores y monitoristas con fotografía, número de empleado y vigencia. Carga por Excel y envío a todo México.",
    respuesta:
      "La credencial de un guardia de seguridad privada debe permitir comprobar de inmediato quién es y para qué empresa trabaja: fotografía clara, nombre completo, número de empleado, nombre de la empresa y vigencia.",
    ejemplo: { nombre: "Jorge Ramírez", puesto: "Guardia" },
    retos: [
      "Plantillas grandes repartidas en muchos servicios y ciudades.",
      "La fotografía y la vigencia tienen que ser legibles para quien revisa.",
      "Altas y bajas frecuentes que obligan a reponer credenciales seguido.",
    ],
    campos: [
      "Fotografía",
      "Nombre completo",
      "Número de empleado",
      "Puesto",
      "Vigencia",
      "Logo de la empresa",
    ],
    consejo:
      "Imprime frente y vuelta: al frente la identificación, y atrás los datos de contacto de la empresa para que cualquier persona pueda verificar al elemento.",
    plataforma: [
      { titulo: "QR que dice si está vigente", texto: "Quien escanea el gafete ve al momento si el guardia sigue activo, con los datos que tú elijas mostrar." },
      { titulo: "Baja en un clic", texto: "Si alguien deja la empresa, lo das de baja y su página de verificación deja de mostrar sus datos." },
      { titulo: "Foto siempre al día", texto: "El guardia propone su foto nueva desde su gafete digital y tú la comparas con la anterior antes de aceptarla." },
    ],
    faqs: [
      {
        pregunta: "¿Imprimen credenciales oficiales o de gobierno para guardias?",
        respuesta:
          "No. Imprimimos la credencial interna de tu empresa de seguridad, no identificaciones oficiales ni documentos emitidos por una autoridad.",
      },
      {
        pregunta: "¿Puedo poner vigencia en la credencial?",
        respuesta:
          "Sí. La vigencia puede ser un texto fijo para todo el pedido o una columna de tu Excel si cambia por persona.",
      },
    ],
  },
  {
    slug: "limpieza",
    nombre: "empresas de limpieza",
    resumen: "Personal que trabaja en instalaciones de tus clientes.",
    descripcion:
      "Gafetes y credenciales para empresas de limpieza y mantenimiento. Identifica a tu personal dentro de las instalaciones de tus clientes con foto, nombre y empresa. Desde una pieza, con envío a todo México.",
    respuesta:
      "El personal de limpieza trabaja en oficinas, hospitales y plazas que no son de su empresa, así que su gafete debe dejar claro a qué compañía pertenece: logo grande, fotografía, nombre y, si aplica, el sitio asignado.",
    ejemplo: { nombre: "María López", puesto: "Limpieza" },
    retos: [
      "Tu personal entra a instalaciones de terceros, donde le piden identificarse.",
      "Rotación alta y equipos repartidos en distintos clientes.",
      "Pedidos chicos y frecuentes, no una sola compra al año.",
    ],
    campos: ["Fotografía", "Nombre completo", "Puesto", "Cliente o sitio asignado", "Logo de la empresa"],
    consejo:
      "Si un mismo empleado cubre varios sitios, deja fuera el nombre del cliente y pon solo tu empresa; así el gafete sirve en todos.",
    plataforma: [
      { titulo: "Gafete digital en el celular", texto: "Para quien cambia de instalación seguido: lo muestra en el celular, con su QR de verificación." },
      { titulo: "Fotos sin perseguir a nadie", texto: "Mandas una liga por WhatsApp y cada persona se toma su foto. La liga se cierra al enviar." },
      { titulo: "Portal para tu personal", texto: "Cada quien pide sus correcciones o su reposición desde «Mi gafete», con su número de empleado y su NIP." },
    ],
    faqs: [
      {
        pregunta: "¿Puedo pedir pocos gafetes cada mes?",
        respuesta:
          "Sí. No hay pedido mínimo: puedes pedir un gafete o cinco cada vez que tengas ingresos.",
      },
    ],
  },
  {
    slug: "call-centers",
    nombre: "call centers",
    resumen: "Agentes, supervisores y áreas con acceso controlado.",
    descripcion:
      "Gafetes y credenciales para call centers y centros de contacto. Identifica agentes, supervisores y campañas con foto y número de empleado. Carga cientos de registros con Excel y recibe en todo México.",
    respuesta:
      "En un call center el gafete identifica a la persona dentro del edificio y la campaña en la que trabaja. Lo usual es fotografía, nombre completo, número de empleado y un color o texto por campaña.",
    ejemplo: { nombre: "Daniela Cruz", puesto: "Agente" },
    retos: [
      "Grupos de capacitación que entran por decenas al mismo tiempo.",
      "Varias campañas en un mismo piso que deben distinguirse.",
      "Rotación alta en los primeros meses.",
    ],
    campos: ["Fotografía", "Nombre completo", "Número de empleado", "Campaña", "Puesto"],
    consejo:
      "Para grupos de capacitación, sube el Excel de toda la generación de una vez: se genera un gafete por renglón y revisas la vista previa de cada uno.",
    plataforma: [
      { titulo: "Altas masivas con Excel", texto: "Sube a toda una generación de agentes con la plantilla, y quien ya estaba se actualiza en lugar de repetirse." },
      { titulo: "Diseño por campaña", texto: "Con diseños por reglas, cada campaña o área recibe su versión del gafete." },
      { titulo: "Avisos a tu manera", texto: "Recibe las solicitudes de tu equipo al momento o en un resumen semanal, para no llenar tu bandeja." },
    ],
    faqs: [
      {
        pregunta: "¿Cuántos gafetes puedo cargar con un Excel?",
        respuesta:
          "Los que necesites. Cada renglón del archivo se convierte en un gafete, y el precio por pieza baja conforme sube la cantidad.",
      },
    ],
  },
  {
    slug: "clinicas-y-consultorios",
    nombre: "clínicas y consultorios",
    resumen: "Médicos, enfermería y recepción, fáciles de identificar.",
    descripcion:
      "Gafetes y credenciales para clínicas, consultorios, laboratorios y hospitales. Identifica a médicos, enfermería y administración con foto, nombre y área. Envío a todo México.",
    respuesta:
      "En una clínica el paciente necesita saber quién lo atiende y cuál es su función. El gafete debe mostrar nombre, puesto o especialidad y área, con fotografía y letra grande para leerse a distancia.",
    ejemplo: { nombre: "Dra. Ana Soto", puesto: "Pediatría" },
    retos: [
      "El paciente debe distinguir a médicos, enfermería y administración.",
      "El gafete se desinfecta seguido.",
      "Personal por turnos y por sede.",
    ],
    campos: ["Fotografía", "Nombre y título", "Especialidad o puesto", "Área", "Logo de la clínica"],
    consejo:
      "Usa un color por función (médicos, enfermería, administración). Ayuda a pacientes y también al personal nuevo.",
    plataforma: [
      { titulo: "Datos a tu medida", texto: "Guarda cédula, especialidad o área, y en cada diseño eliges cuáles se imprimen y en qué cara." },
      { titulo: "QR con tus campos", texto: "Quien escanea ve el nombre, el puesto y si el gafete está vigente, con solo los datos que tú autorizas." },
      { titulo: "Varias personas administrando", texto: "Invita a recepción o a RH con su propio rol, sin compartir contraseñas." },
    ],
    faqs: [
      {
        pregunta: "¿Se pueden limpiar o desinfectar los gafetes?",
        respuesta:
          "Sí. Son tarjetas de PVC rígido que se limpian con un paño húmedo.",
      },
      {
        pregunta: "¿Puedo incluir la cédula profesional?",
        respuesta:
          "Sí, como un campo de texto más. El gafete sigue siendo una identificación interna de tu clínica, no un documento oficial.",
      },
    ],
  },
  {
    slug: "escuelas",
    nombre: "escuelas y colegios",
    resumen: "Docentes, personal administrativo y alumnos.",
    descripcion:
      "Gafetes y credenciales para escuelas, colegios y academias: docentes, personal administrativo y alumnos, con foto, grado y ciclo escolar. Carga las listas con Excel y recibe en todo México.",
    respuesta:
      "Una credencial escolar identifica a la persona como parte de la comunidad del plantel: fotografía, nombre completo, grado o puesto, ciclo escolar y logo de la escuela. Para alumnos suele agregarse matrícula o código QR.",
    ejemplo: { nombre: "Sofía Méndez", puesto: "3.º B" },
    retos: [
      "Listas grandes que cambian cada ciclo escolar.",
      "Fotografías de muchas personas que hay que cuadrar bien.",
      "Reposiciones sueltas durante el año.",
    ],
    campos: ["Fotografía", "Nombre completo", "Grado y grupo o puesto", "Matrícula", "Ciclo escolar"],
    consejo:
      "Exporta la lista de tu sistema escolar a Excel y úsala tal cual: solo conectas cada columna con su campo en el gafete.",
    plataforma: [
      { titulo: "Una liga por persona", texto: "Docentes y personal llenan sus datos y se toman la foto desde su celular, y tú apruebas antes de imprimir." },
      { titulo: "Diseño por tipo de persona", texto: "Con diseños por reglas, docentes, administrativos y alumnos reciben su versión." },
      { titulo: "Pedido abierto", texto: "Junta altas durante el ciclo escolar y pide cuando llegues a la cantidad que tú elijas." },
    ],
    faqs: [
      {
        pregunta: "¿Puedo pedir credenciales para alumnos y para personal en el mismo pedido?",
        respuesta:
          "Sí. Puedes usar un diseño para alumnos y otro para personal, cada uno con su propia lista.",
      },
    ],
  },
  {
    slug: "eventos",
    nombre: "eventos y congresos",
    resumen: "Staff, expositores y asistentes con nombre y categoría.",
    descripcion:
      "Gafetes para eventos, congresos, convenciones y ferias: staff, expositores y asistentes con nombre, empresa y categoría. Carga tu lista de registro con Excel y recibe en cualquier ciudad de México.",
    respuesta:
      "El gafete de un evento debe decir quién es la persona y qué acceso tiene: nombre grande, empresa y categoría (asistente, expositor, staff o prensa), normalmente con un color por categoría.",
    ejemplo: { nombre: "Pablo Ruiz", puesto: "Expositor" },
    retos: [
      "La lista de registro cierra pocos días antes del evento.",
      "Categorías con accesos distintos que deben verse de lejos.",
      "Todo tiene que llegar a la sede, no a la oficina.",
    ],
    campos: ["Nombre", "Empresa", "Categoría", "Código QR", "Logo del evento"],
    consejo:
      "Considera el tiempo de producción y envío al cerrar tu registro, y pide algunas piezas extra con el campo de nombre en blanco para registros de última hora.",
    plataforma: [
      { titulo: "Nombre opcional", texto: "El nombre es opcional, así que también haces gafetes genéricos de staff o de prensa, sin nombre." },
      { titulo: "Diseño por categoría", texto: "Con diseños por reglas, staff, expositores y asistentes reciben su versión." },
      { titulo: "Carga masiva", texto: "Sube tu lista de registro con Excel y revisa la vista previa de cada gafete antes de pagar." },
    ],
    faqs: [
      {
        pregunta: "¿Pueden enviar los gafetes directo a la sede del evento?",
        respuesta:
          "Sí. El pedido se envía a la dirección que indiques, sea tu oficina, el hotel o el recinto.",
      },
    ],
  },
];

export function giroPorSlug(slug: string): Giro | undefined {
  return giros.find((g) => g.slug === slug);
}

/** Nombres cortos de los giros, para elegir uno con chips ("Restaurantes", "Limpieza"). */
export const opcionesGiro = giros.map((g) => {
  const corto = g.nombre.replace(/^empresas de /, "");
  return corto.charAt(0).toUpperCase() + corto.slice(1);
});
