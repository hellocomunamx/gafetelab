/** Motivos del formulario de contacto. El primero es el que queda elegido al abrir la página. */
export const motivosContacto = [
  "Tengo una duda",
  "Pedido especial",
  "Ya hice un pedido",
  "Factura",
  "Otro",
] as const;

export type MotivoContacto = (typeof motivosContacto)[number];

export const limitesContacto = { nombre: 80, empresa: 80, telefono: 30, mensaje: 2000 } as const;
