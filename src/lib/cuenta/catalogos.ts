/** Catálogos cortos para los formularios de la cuenta. */

export const estadosMexico = [
  "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua",
  "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México", "Guanajuato", "Guerrero",
  "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla",
  "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas",
  "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas",
];

/** Regímenes fiscales del SAT más comunes (clave y descripción). */
export const regimenesFiscales = [
  { clave: "601", nombre: "General de Ley Personas Morales" },
  { clave: "603", nombre: "Personas Morales con Fines no Lucrativos" },
  { clave: "605", nombre: "Sueldos y Salarios e Ingresos Asimilados a Salarios" },
  { clave: "606", nombre: "Arrendamiento" },
  { clave: "612", nombre: "Personas Físicas con Actividades Empresariales y Profesionales" },
  { clave: "616", nombre: "Sin obligaciones fiscales" },
  { clave: "621", nombre: "Incorporación Fiscal" },
  { clave: "622", nombre: "Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras" },
  { clave: "623", nombre: "Opcional para Grupos de Sociedades" },
  { clave: "624", nombre: "Coordinados" },
  { clave: "625", nombre: "Actividades Empresariales con ingresos por Plataformas Tecnológicas" },
  { clave: "626", nombre: "Régimen Simplificado de Confianza" },
];

export const usosCfdi = [
  { clave: "G03", nombre: "Gastos en general" },
  { clave: "G01", nombre: "Adquisición de mercancías" },
  { clave: "S01", nombre: "Sin efectos fiscales" },
];

export const estatusEmpleado = [
  { id: "activo", nombre: "Activo" },
  { id: "pendiente", nombre: "Pendiente" },
  { id: "baja", nombre: "Baja" },
] as const;

export const motivosGafete: Record<string, string> = {
  alta: "Alta",
  reposicion: "Reposición",
  cambio_datos: "Cambio de datos",
};

export const estadosGafete: Record<string, string> = {
  en_pedido: "En pedido",
  en_produccion: "En producción",
  enviado: "Enviado",
  activo: "Activo",
  desactivado: "Desactivado",
  cancelado: "Cancelado",
};
