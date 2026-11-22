import type { Rol } from "./sesion";

/** Nombre y alcance de cada rol, tal como se muestran en la plataforma. */
export const roles: Record<Rol, { nombre: string; puede: string }> = {
  propietario: {
    nombre: "Dueño",
    puede: "Todo, incluido invitar administradores, cambiar roles y quitar personas.",
  },
  administrador: {
    nombre: "Administrador",
    puede: "Todo lo de la empresa: equipo, diseños, envío y facturación. Invita y quita editores.",
  },
  editor: {
    nombre: "Editor",
    puede: "Equipo, campos y diseños. Ve los datos de envío y de facturación, pero no los cambia.",
  },
};

/** Roles que se pueden dar al invitar, según el rol de quien invita. */
export const rolesInvitables = (rol: Rol): ("administrador" | "editor")[] =>
  rol === "propietario" ? ["editor", "administrador"] : rol === "administrador" ? ["editor"] : [];

export const LARGO_MINIMO_CONTRASENA = 8;
