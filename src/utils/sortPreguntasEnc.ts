/** Mismo criterio que `reporte-via-tramo.ts` en Angular (consecutivo "26.1", etc.). */
export function sortPreguntasByConsecutivo<T extends { consecutivo: string }>(list: T[]): T[] {
  const parseNum = (val: string): number => {
    const parts = val.toString().split('.');
    const main = parseInt(parts[0] || '0', 10) || 0;
    const sub = parseInt(parts[1] || '0', 10) || 0;
    return main * 100 + sub;
  };
  return [...list].sort((a, b) => parseNum(a.consecutivo) - parseNum(b.consecutivo));
}
