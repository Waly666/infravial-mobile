# InfraVial Mobile

Aplicación móvil de inventario vial construida con **Expo** y **React Native**.

Permite registrar y consultar:

- `via_tramos`
- señales verticales
- señales horizontales
- cajas de inspección
- controles semafóricos
- semáforos

También soporta trabajo **offline**, almacenamiento local de pendientes y sincronización posterior.

## Requisitos

- **Node.js** 18 o superior (recomendado 20 LTS)
- **npm**
- **Expo** vía `npx expo` (no hace falta instalar Expo CLI global)
- Android Studio / emulador Android o dispositivo físico con Expo Go o build de desarrollo
- Para iOS: Xcode y simulador (solo en macOS)

## Instalación

```bash
npm install
```

## Configuración

Crea un archivo `.env` en la raíz del proyecto `mobile` con la URL del backend:

```env
EXPO_PUBLIC_API_BASE_URL=http://TU_BACKEND:PUERTO
```

Notas:

- La URL **no** debe terminar en `/`.
- Tras cambiar `.env`, reinicia el servidor de Expo.
- En Android, el proyecto permite tráfico HTTP claro (`cleartext`) para desarrollo; en producción conviene usar HTTPS.

## Ejecución

Iniciar el proyecto (Metro + menú interactivo):

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

Vista web (opcional):

```bash
npm run web
```

Comprobar tipos TypeScript:

```bash
npm run typecheck
```

## Builds con EAS (Expo Application Services)

El archivo `eas.json` define perfiles de build:

| Perfil        | Uso típico        | Android                          |
|---------------|-------------------|----------------------------------|
| `preview`     | pruebas internas  | APK (`distribution`: internal)   |
| `production`  | tienda / release  | App Bundle (AAB)                 |

Requisitos: cuenta Expo, `eas-cli` y proyecto vinculado. Ejemplos:

```bash
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform android --profile production
```

## Inicio de sesión

La app arranca en la pantalla de **Login**.

- **Usuario:** cédula
- **Contraseña:** credencial entregada por el backend

## Modo offline

Pensada para trabajo de campo:

- Puede operar **offline**
- Guarda registros pendientes en almacenamiento local
- Permite editar pendientes desde **Sincronización**
- Al volver **online**, se pueden enviar los pendientes al backend

## Sincronización

Desde la pantalla **Sincronización** puedes:

- Ver pendientes locales
- Editar pendientes con el formulario visual
- Eliminar pendientes
- Enviar pendientes al backend

## Temas y UI

- Modo claro / oscuro
- Colores por módulo
- Listas y formularios actualizados

## Estructura del código

Carpetas principales:

- `src/screens` — pantallas y wizards
- `src/navigation` — navegación principal
- `src/services/api` — integración con el backend
- `src/services/sync` — cola offline y sincronización
- `src/storage/offline` — persistencia local
- `src/theme` — tema visual
- `plugins/` — config plugins de Expo (p. ej. Android)

## Módulos principales

- **Tramos** — inventario vial base
- **Señales verticales** — registro y edición
- **Señales horizontales** — registro y edición
- **Cajas** — cajas de inspección
- **Control semafórico** — controlador y armario
- **Semáforos** — semáforo, caras, diagnóstico y fotos

## Solución de problemas

**La app no conecta al API**

- Revisa `EXPO_PUBLIC_API_BASE_URL`
- Comprueba que el backend sea accesible desde el móvil o emulador (misma red, firewall, IP correcta)
- Reinicia Expo limpiando caché:

```bash
npx expo start --clear
```

**Dependencias o caché corrupta**

En Linux / macOS:

```bash
rm -rf node_modules package-lock.json
npm install
```

En Windows (PowerShell), desde la carpeta del proyecto:

```powershell
Remove-Item -Recurse -Force node_modules, package-lock.json -ErrorAction SilentlyContinue
npm install
```

## Tecnologías

- Expo ~54
- React Native
- TypeScript
- React Navigation (stack y tabs)
- Axios
- expo-sqlite
- AsyncStorage
- NetInfo
- expo-location
- expo-image-picker
- expo-secure-store
