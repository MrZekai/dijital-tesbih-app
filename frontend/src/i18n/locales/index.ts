// Dil tablolarinin kaydi. `languages.ts` ile birebir ayni kumeyi kapsar.
// Metro statik require kullanir; dinamik import YOK — boylece tum diller
// pakete dahil olur ve calisma zamaninda cozumleme hatasi olusmaz.

import type { LanguageCode } from "../languages";
import en, { type TranslationTable } from "./en";
import tr from "./tr";
import ar from "./ar";
import id from "./id";
import ms from "./ms";
import ur from "./ur";
import fa from "./fa";
import bn from "./bn";
import fr from "./fr";
import ru from "./ru";
import az from "./az";
import uz from "./uz";
import kk from "./kk";
import ky from "./ky";
import tg from "./tg";
import tk from "./tk";
import ps from "./ps";
import sq from "./sq";
import bs from "./bs";
import so from "./so";
import ha from "./ha";
import sw from "./sw";
import ku from "./ku";
import ckb from "./ckb";
import dv from "./dv";
import fa_AF from "./fa-AF";
import pa_Arab from "./pa-Arab";

export const TABLES: Record<LanguageCode, TranslationTable> = {
  en,
  tr: tr,
  ar: ar,
  id: id,
  ms: ms,
  ur: ur,
  fa: fa,
  bn: bn,
  fr: fr,
  ru: ru,
  az: az,
  uz: uz,
  kk: kk,
  ky: ky,
  tg: tg,
  tk: tk,
  ps: ps,
  sq: sq,
  bs: bs,
  so: so,
  ha: ha,
  sw: sw,
  ku: ku,
  ckb: ckb,
  dv: dv,
  "fa-AF": fa_AF,
  "pa-Arab": pa_Arab,
};

/** Bir dilin tablosu; bilinmeyen kod icin Ingilizce doner. */
export function getTable(code: string): TranslationTable {
  return (TABLES as Record<string, TranslationTable>)[code] ?? en;
}
