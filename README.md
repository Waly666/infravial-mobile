# InfraVial Mobile

Aplicacion movil de inventario vial construida con `Expo` y `React Native`.

Permite registrar y consultar:

- `via_tramos`
- senales verticales
- senales horizontales
- cajas de inspeccion
- controles semaforicos
- semaforos

Tambien soporta trabajo `offline`, almacenamiento local de pendientes y sincronizacion posterior.

## Requisitos

- `Node.js` 18 o superior
- `npm`
- `Expo CLI` via `npx expo`
- Android Studio / emulador Android o dispositivo fisico con Expo Go o build de desarrollo

## Instalacion

```bash
npm install
```

## Configuracion

Crea un archivo `.env` en la raiz del proyecto `mobile` con la URL del backend:

```env
EXPO_PUBLIC_API_BASE_URL=http://TU_BACKEND:PUERTO
```

Notas:

- la URL no debe terminar en `/`
- despues de cambiar `.env`, reinicia Expo

## Ejecucion

Iniciar el proyecto:

```bash
npm run start
```

Abrir en Android:

```bash
npm run android
```

Abrir en iOS:

```bash
npm run ios
```

Ejecutar chequeo de tipos:

```bash
npm run typecheck
```

## Inicio de sesion

La app inicia mostrando pantalla de `Login`.

- usuario: cedula
- contrasena: credencial entregada por el backend

## Modo offline

La app esta pensada para trabajo en campo:

- puede operar en `offline`
- guarda registros pendientes en almacenamiento local
- permite editar pendientes desde `Sincronizacion`
- cuando se pasa a `online`, se pueden sincronizar los pendientes

## Sincronizacion

Desde la pantalla `Sincronizacion` se puede:

- ver pendientes locales
- editar pendientes con el formulario visual
- eliminar pendientes
- enviar pendientes al backend

## Temas y UI

La app incluye:

- modo claro / oscuro
- colores por modulo
- listas y formularios modernizados

## Estructura general

Carpetas importantes:

- `src/screens`: pantallas y wizards
- `src/navigation`: navegacion principal
- `src/services/api`: integracion con backend
- `src/services/sync`: cola offline y sincronizacion
- `src/storage/offline`: persistencia local
- `src/theme`: tema visual

## Modulos principales

- `Tramos`: inventario vial base
- `Senales verticales`: registro y edicion
- `Senales horizontales`: registro y edicion
- `Cajas`: cajas de inspeccion
- `Control semaforico`: controlador y armario
- `Semaforos`: semaforo, caras, diagnostico y fotos

## Troubleshooting

Si la app no conecta:

- revisa `EXPO_PUBLIC_API_BASE_URL`
- confirma que el backend sea accesible desde el celular o emulador
- reinicia Expo con cache limpia:

```bash
npx expo start --clear
```

Si algo falla por dependencias:

```bash
rm -rf node_modules package-lock.json
npm install
```

## Tecnologias

- `Expo`
- `React Native`
- `TypeScript`
- `React Navigation`
- `Axios`
- `expo-sqlite`
- `AsyncStorage`
- `NetInfo`

