import { Portada, Seccion } from "@/components/ui";
import { metadatos } from "@/lib/seo";
import { site } from "@/lib/site";

const ruta = "/aviso-de-privacidad";

// PENDIENTE: sustituir por el aviso de privacidad definitivo antes de recibir
// datos o fotos de empleados. Mientras tanto la página no se indexa.
export const metadata = metadatos({
  titulo: "Aviso de privacidad",
  descripcion: "Aviso de privacidad de GafeteLab.",
  ruta,
  noindex: true,
});

export default function AvisoDePrivacidad() {
  return (
    <>
      <Portada migas={[{ nombre: "Aviso de privacidad", ruta }]} titulo="Aviso de privacidad" />
      <Seccion>
        <div className="max-w-2xl space-y-4 text-gris">
          <p>
            Estamos preparando nuestro aviso de privacidad completo. Si tienes dudas sobre cómo
            tratamos los datos y las fotografías de tu equipo, escríbenos a{" "}
            <a href={`mailto:${site.correo}`} className="text-tinta underline">
              {site.correo}
            </a>
            .
          </p>
        </div>
      </Seccion>
    </>
  );
}
