import { fetchPreguntasEncuesta } from '@/services/api/encuestaApi';
import {
  fetchBarrios,
  fetchComunas,
  fetchEsquemasPerfil,
  fetchObsVias,
  fetchPreguntasEncuestaTramo,
  fetchZats,
} from '@/services/api/catalogViaTramoApi';
import { fetchJornadaActiva } from '@/services/api/jornadaApi';
import { fetchObsSemaforos } from '@/services/api/semaforoCatalogApi';
import { fetchDemarcaciones, fetchObsSh, fetchUbicSenHor } from '@/services/api/senHorCatalogApi';
import { fetchObsSvCatalogo, fetchSenVertCatalogo } from '@/services/api/senVertCatalogApi';
import { fetchCajasInsp } from '@/services/api/cajaInspApi';
import { fetchControlesSem } from '@/services/api/controlSemApi';
import { fetchSemaforos } from '@/services/api/semaforoApi';
import { fetchExistSenHorRegistros } from '@/services/api/senHorApi';
import { fetchExistSenVertRegistros } from '@/services/api/senVertApi';
import { fetchViaTramos } from '@/services/api/viaTramoApi';

export async function warmupOfflineData(): Promise<void> {
  const jornada = await fetchJornadaActiva().catch(() => null);
  const filtro = jornada?.codMunicipio ? { munDivipol: jornada.codMunicipio } : undefined;

  /** Dos oleadas reducen picos de CPU/red y congelamientos en Expo Go. */
  await Promise.allSettled([
    fetchViaTramos(),
    fetchExistSenVertRegistros(),
    fetchExistSenHorRegistros(),
    fetchCajasInsp(),
    fetchControlesSem(),
    fetchSemaforos(),
    fetchZats(),
    fetchComunas(),
    fetchBarrios(),
  ]);

  await Promise.allSettled([
    fetchZats(filtro),
    fetchComunas(filtro),
    fetchBarrios(filtro),
    fetchEsquemasPerfil(),
    fetchObsVias(),
    fetchPreguntasEncuestaTramo(),
    fetchPreguntasEncuesta(),
    fetchSenVertCatalogo(),
    fetchObsSvCatalogo(),
    fetchDemarcaciones(),
    fetchUbicSenHor(),
    fetchObsSh(),
    fetchObsSemaforos(),
  ]);
}

