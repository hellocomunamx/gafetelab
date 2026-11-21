export type Ciudad = {
  slug: string;
  nombre: string;
  estado: string;
  /** "en Monterrey", "en la Ciudad de México" */
  enTexto: string;
  /** Párrafo propio de la ciudad: a quién le sirve ahí. */
  contexto: string;
  /** Slugs de los giros más comunes en la ciudad. */
  giros: string[];
};

export const ciudades: Ciudad[] = [
  {
    slug: "ciudad-de-mexico",
    nombre: "Ciudad de México",
    estado: "Ciudad de México",
    enTexto: "en la Ciudad de México",
    contexto:
      "En la capital conviven corporativos, cadenas de tiendas, restaurantes, hospitales y centros de contacto con plantillas grandes y mucha rotación. Para RH, el reto no es imprimir un gafete, sino mantener identificado a un equipo que cambia cada semana.",
    giros: ["tiendas-y-retail", "restaurantes", "call-centers", "seguridad-privada"],
  },
  {
    slug: "guadalajara",
    nombre: "Guadalajara",
    estado: "Jalisco",
    enTexto: "en Guadalajara",
    contexto:
      "Guadalajara y su zona metropolitana concentran empresas de tecnología, comercio, restaurantes y un calendario fuerte de ferias y exposiciones. Los gafetes y credenciales se piden tanto para personal de planta como para eventos.",
    giros: ["eventos", "tiendas-y-retail", "restaurantes", "call-centers"],
  },
  {
    slug: "monterrey",
    nombre: "Monterrey",
    estado: "Nuevo León",
    enTexto: "en Monterrey",
    contexto:
      "En Monterrey y su área metropolitana predominan la industria, los corporativos y los servicios que les dan soporte: seguridad privada, limpieza y comedores industriales, todos con personal que debe identificarse al entrar a planta.",
    giros: ["seguridad-privada", "limpieza", "tiendas-y-retail", "clinicas-y-consultorios"],
  },
  {
    slug: "puebla",
    nombre: "Puebla",
    estado: "Puebla",
    enTexto: "en Puebla",
    contexto:
      "Puebla combina industria, comercio y una de las mayores concentraciones de universidades y colegios del país, así que las credenciales escolares y de personal administrativo son un pedido frecuente.",
    giros: ["escuelas", "tiendas-y-retail", "restaurantes", "clinicas-y-consultorios"],
  },
  {
    slug: "tijuana",
    nombre: "Tijuana",
    estado: "Baja California",
    enTexto: "en Tijuana",
    contexto:
      "Tijuana tiene una base amplia de plantas manufactureras, clínicas que atienden pacientes de ambos lados de la frontera y centros de contacto bilingües, con ingresos de personal constantes.",
    giros: ["clinicas-y-consultorios", "call-centers", "seguridad-privada", "limpieza"],
  },
  {
    slug: "leon",
    nombre: "León",
    estado: "Guanajuato",
    enTexto: "en León",
    contexto:
      "León es conocida por su industria del calzado y la piel, su comercio y sus ferias y exposiciones. Fábricas, tiendas y recintos necesitan identificar a su personal y a sus expositores.",
    giros: ["tiendas-y-retail", "eventos", "seguridad-privada", "restaurantes"],
  },
  {
    slug: "queretaro",
    nombre: "Querétaro",
    estado: "Querétaro",
    enTexto: "en Querétaro",
    contexto:
      "Querétaro ha crecido con parques industriales, centros de datos, centros de contacto y servicios compartidos. Las empresas que llegan contratan por grupos y necesitan credenciales para generaciones completas.",
    giros: ["call-centers", "seguridad-privada", "limpieza", "tiendas-y-retail"],
  },
  {
    slug: "merida",
    nombre: "Mérida",
    estado: "Yucatán",
    enTexto: "en Mérida",
    contexto:
      "Mérida tiene una oferta creciente de restaurantes, hoteles, clínicas y comercio. Son negocios de atención directa, donde el gafete con el nombre de quien atiende forma parte del servicio.",
    giros: ["restaurantes", "clinicas-y-consultorios", "tiendas-y-retail", "escuelas"],
  },
  {
    slug: "cancun",
    nombre: "Cancún",
    estado: "Quintana Roo",
    enTexto: "en Cancún",
    contexto:
      "En Cancún la hotelería, los restaurantes y los congresos marcan el ritmo. El personal cambia con la temporada y cada ingreso necesita su gafete listo antes de salir a piso.",
    giros: ["restaurantes", "eventos", "seguridad-privada", "limpieza"],
  },
  {
    slug: "hermosillo",
    nombre: "Hermosillo",
    estado: "Sonora",
    enTexto: "en Hermosillo",
    contexto:
      "Hermosillo, capital de Sonora, reúne industria automotriz, comercio, servicios de salud y centros de contacto. Está en nuestro mismo estado, así que es de los destinos más cercanos para envío.",
    giros: ["call-centers", "clinicas-y-consultorios", "tiendas-y-retail", "seguridad-privada"],
  },
  {
    slug: "ciudad-obregon",
    nombre: "Ciudad Obregón",
    estado: "Sonora",
    enTexto: "en Ciudad Obregón",
    contexto:
      "Ciudad Obregón y el Valle del Yaqui reúnen agroindustria, comercio, clínicas, escuelas y restaurantes. Son equipos que cambian con la temporada y necesitan identificar pronto a quien entra.",
    giros: ["tiendas-y-retail", "restaurantes", "clinicas-y-consultorios", "escuelas"],
  },
  {
    slug: "culiacan",
    nombre: "Culiacán",
    estado: "Sinaloa",
    enTexto: "en Culiacán",
    contexto:
      "Culiacán tiene una economía fuerte en agroindustria, comercio y restaurantes. Empacadoras, tiendas y cadenas de comida identifican a su personal de planta y de temporada.",
    giros: ["restaurantes", "tiendas-y-retail", "seguridad-privada", "limpieza"],
  },
];

export function ciudadPorSlug(slug: string): Ciudad | undefined {
  return ciudades.find((c) => c.slug === slug);
}
