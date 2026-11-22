/** Motivos del formulario de contacto. El primero es el que queda elegido al abrir la página. */
export const motivosContacto = [
  "Tengo una duda",
  "Pedido especial",
  "Paquete prepagado",
  "Ya hice un pedido",
  "Factura",
  "Tengo una idea",
  "Otro",
] as const;

/** Motivo para proponer lo que a la persona le gustaría que existiera. Se abre con /contacto#idea. */
export const MOTIVO_IDEA: (typeof motivosContacto)[number] = "Tengo una idea";
/** Motivo con el que llega un paquete armado en /precios. */
export const MOTIVO_PAQUETE: (typeof motivosContacto)[number] = "Paquete prepagado";

/** Lo que todavía no se vende, para decirlo igual en las preguntas y en el contacto. */
export const adicionalesPendientes = "portagafetes, cordones, yoyos ni micas";

export type MotivoContacto = (typeof motivosContacto)[number];

export const limitesContacto = { nombre: 80, empresa: 80, telefono: 30, mensaje: 2000 } as const;
