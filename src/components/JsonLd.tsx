/** Inserta uno o varios nodos schema.org como JSON-LD en el HTML del servidor. */
export function JsonLd({ data }: { data: object | object[] }) {
  const nodos = Array.isArray(data) ? data : [data];
  return (
    <>
      {nodos.map((nodo, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(nodo).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  );
}
