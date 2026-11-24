import { Boton, Contenedor } from "@/components/ui";

export default function GafeteNoEncontrado() {
  return (
    <Contenedor className="py-14 sm:py-20">
      <div className="mx-auto max-w-sm text-center">
        <p className="inline-block rounded-full bg-tinta px-4 py-1.5 text-sm font-bold tracking-wider text-white uppercase">
          No encontrado
        </p>
        <h1 className="mt-5 text-3xl font-extrabold">No pudimos verificar este gafete</h1>
        <p className="mt-3 text-gris">
          El código no corresponde a ningún gafete que se pueda verificar aquí. Si lo escaneaste de
          una credencial, avisa a la empresa que la emitió.
        </p>
        <Boton href="/" variante="secundario" className="mt-6">
          Ir a LaGafetería
        </Boton>
      </div>
    </Contenedor>
  );
}
