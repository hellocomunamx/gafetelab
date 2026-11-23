/**
 * Códigos telefónicos por país (ISO 3166-1 alfa-2 → lada internacional).
 * Los nombres en español salen de Intl.DisplayNames, así no se guardan aquí.
 */
const LADAS: Record<string, string> = {
  AF: "93", AL: "355", DE: "49", AD: "376", AO: "244", AI: "1", AG: "1", SA: "966", DZ: "213", AR: "54",
  AM: "374", AW: "297", AU: "61", AT: "43", AZ: "994", BS: "1", BD: "880", BB: "1", BH: "973", BE: "32",
  BZ: "501", BJ: "229", BM: "1", BY: "375", BO: "591", BA: "387", BW: "267", BR: "55", BN: "673", BG: "359",
  BF: "226", BI: "257", BT: "975", CV: "238", KH: "855", CM: "237", CA: "1", QA: "974", TD: "235", CL: "56",
  CN: "86", CY: "357", CO: "57", KM: "269", CG: "242", CD: "243", KP: "850", KR: "82", CI: "225", CR: "506",
  HR: "385", CU: "53", CW: "599", DK: "45", DM: "1", EC: "593", EG: "20", SV: "503", AE: "971", ER: "291",
  SK: "421", SI: "386", ES: "34", US: "1", EE: "372", SZ: "268", ET: "251", PH: "63", FI: "358", FJ: "679",
  FR: "33", GA: "241", GM: "220", GE: "995", GH: "233", GI: "350", GD: "1", GR: "30", GL: "299", GP: "590",
  GU: "1", GT: "502", GF: "594", GN: "224", GQ: "240", GW: "245", GY: "592", HT: "509", HN: "504", HK: "852",
  HU: "36", IN: "91", ID: "62", IQ: "964", IR: "98", IE: "353", IS: "354", KY: "1", CK: "682", FO: "298",
  FK: "500", MP: "1", MH: "692", SB: "677", TC: "1", VG: "1", VI: "1", IL: "972", IT: "39", JM: "1",
  JP: "81", JO: "962", KZ: "7", KE: "254", KG: "996", KI: "686", XK: "383", KW: "965", LA: "856", LS: "266",
  LV: "371", LB: "961", LR: "231", LY: "218", LI: "423", LT: "370", LU: "352", MO: "853", MK: "389", MG: "261",
  MY: "60", MW: "265", MV: "960", ML: "223", MT: "356", MA: "212", MQ: "596", MU: "230", MR: "222", YT: "262",
  MX: "52", FM: "691", MD: "373", MC: "377", MN: "976", ME: "382", MS: "1", MZ: "258", MM: "95", NA: "264",
  NR: "674", NP: "977", NI: "505", NE: "227", NG: "234", NU: "683", NO: "47", NC: "687", NZ: "64", OM: "968",
  NL: "31", PK: "92", PW: "680", PS: "970", PA: "507", PG: "675", PY: "595", PE: "51", PF: "689", PL: "48",
  PT: "351", PR: "1", GB: "44", CF: "236", CZ: "420", DO: "1", RE: "262", RW: "250", RO: "40", RU: "7",
  WS: "685", AS: "1", KN: "1", SM: "378", PM: "508", VC: "1", SH: "290", LC: "1", ST: "239", SN: "221",
  RS: "381", SC: "248", SL: "232", SG: "65", SX: "1", SY: "963", SO: "252", LK: "94", ZA: "27", SD: "249",
  SS: "211", SE: "46", CH: "41", SR: "597", TH: "66", TW: "886", TZ: "255", TJ: "992", TL: "670", TG: "228",
  TK: "690", TO: "676", TT: "1", TN: "216", TM: "993", TR: "90", TV: "688", UA: "380", UG: "256", UY: "598",
  UZ: "998", VU: "678", VA: "39", VE: "58", VN: "84", WF: "681", YE: "967", DJ: "253", ZM: "260", ZW: "263",
};

export type Pais = { iso: string; nombre: string; lada: string; bandera: string };

/** País que queda elegido siempre al abrir un formulario. */
export const PAIS_PREDETERMINADO = "MX";

const bandera = (iso: string) =>
  String.fromCodePoint(...[...iso].map((letra) => 0x1f1e6 + letra.charCodeAt(0) - 65));

/** Sin acentos ni mayúsculas, para buscar «mexico» y encontrar «México». */
export const normalizar = (texto: string) =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

let cache: Pais[] | null = null;

/** Todos los países en orden alfabético, con México primero. */
export function paises(): Pais[] {
  if (cache) return cache;
  const nombres = new Intl.DisplayNames(["es-MX", "es"], { type: "region" });
  const lista = Object.entries(LADAS).map(([iso, lada]) => ({
    iso,
    lada,
    nombre: nombres.of(iso) ?? iso,
    bandera: bandera(iso),
  }));
  lista.sort((a, b) =>
    a.iso === PAIS_PREDETERMINADO ? -1 : b.iso === PAIS_PREDETERMINADO ? 1 : a.nombre.localeCompare(b.nombre, "es"),
  );
  cache = lista;
  return lista;
}

export function buscarPaises(consulta: string): Pais[] {
  const q = normalizar(consulta).replace(/^\+/, "");
  if (!q) return paises();
  const digitos = /^\d+$/.test(q);
  return paises().filter((p) =>
    digitos ? p.lada.startsWith(q) : normalizar(p.nombre).includes(q) || p.iso.toLowerCase() === q,
  );
}
