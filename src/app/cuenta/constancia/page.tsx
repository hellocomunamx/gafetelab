import { redirect } from "next/navigation";

/** La constancia ahora es una de las formas de verificar la empresa. */
export default async function PaginaConstancia({ searchParams }: { searchParams: Promise<{ nueva?: string }> }) {
  const { nueva } = await searchParams;
  redirect(nueva ? "/cuenta/verificacion?nueva=1" : "/cuenta/verificacion");
}
