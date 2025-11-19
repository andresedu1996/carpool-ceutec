![Estado del Proyecto](https://img.shields.io/badge/ESTADO-EN_DESARROLLO-brightgreen)
![Tipo](https://img.shields.io/badge/Tipo-App__Web-informational)
![Stack](https://img.shields.io/badge/Stack-React__%7C__Firebase__%7C__Vite-6f42c1)

# CarPool – Agenda de Viajes Universitarios

Aplicación web construida con **React + Vite** para conectar estudiantes y conductores del campus. Permite **registrar datos personales**, **explorar conductores disponibles**, **agendar viajes**, **consultar viajes programados** y ofrece un **panel especializado para cada conductor** con métricas, control de disponibilidad y contacto directo con los pasajeros. Toda la información se sincroniza en tiempo real usando **Firebase Authentication + Firestore**.

---

## Características Principales

- ✅ **Perfil del pasajero**  
  Formulario estilo dashboard (inspirado en PanelConductor) para registrar nombre, campus, teléfono y dirección vinculados al usuario autenticado.

- 🚗 **Lista de conductores**  
  Catálogo responsivo con la misma UI oscura que “Agendar Viaje”, mostrando colonia, horarios, vehículo, precio, capacidad, campus atendidos y enlaces de WhatsApp. Cada tarjeta redirige rápidamente al calendario de reservas.

- 📅 **Agendar viaje**  
  Selección de conductor, fecha y horario disponible; evita colisiones controlando los cupos máximos por conductor/horario y bloqueando opciones cuando se llenan. Integra contacto directo con WhatsApp y muestra en tiempo real los datos completos del conductor seleccionado.

- 🧾 **Mis viajes**  
  Vista del pasajero ordenada por prioridad (programado > completado > cancelado) mostrando todos los datos del conductor y un botón para cancelar o chatear por WhatsApp según corresponda.

- 🧑‍✈️ **Panel del conductor**  
  Dashboard con estadísticas, edición de perfil, lista de viajes y acciones rápidas:
  - Prioriza viajes programados y muestra datos completos del pasajero (auto-cargados desde `usuarios`).
  - Botón para marcar viaje como completado sin salir de la página.
  - Enlace a WhatsApp cuando el pasajero dejó teléfono en su perfil.

- 🔐 **Autenticación unificada**  
  El formulario de pasajero y el panel del conductor detectan al usuario actual usando `onAuthStateChanged`. Si no hay sesión activa, redirigen a las pantallas de login correspondientes.

- 🎨 **UI coherente**  
  Se adoptó el mismo look & feel del panel (gradientes verdes, tarjetas oscuras, iconografía) en módulos clave como Agendar Viaje, Lista de Conductores y el formulario de datos personales para mantener una experiencia fluida en desktop y móvil.

---

## Tecnologías

- **Frontend:** React 19, Vite 7, React Router.
- **Estilos:** Bootstrap 5, React Icons, estilos inline inspirados en paneles oscuros.
- **Backend-as-a-Service:** Firebase Authentication + Firestore (colecciones `usuarios`, `conductores`, `viajes`, `pasajeros`).
- **Herramientas auxiliares:** Vite asset glob para imágenes de conductores, scripts de seed (`seed_conductores.js`).

---

## Estructura de datos relevante

- **usuarios**  
  Datos maestros del pasajero (nombre, campus, teléfono, dirección, email, role). Se usan para rellenar formularios y enriquecer la vista de “Mis viajes” y el panel del conductor.

- **conductores**  
  Perfil con nombre, colonia, vehículo, capacidad, horarios, campus y teléfono. El panel permite editar todos los campos.

- **viajes**  
  Registros creados al agendar un viaje con referencias a pasajero y conductor, fechas, horarios, estado (`programado`, `completado`, `cancelado`) y marcas de tiempo.

- **pasajeros (legacy)**  
  Se mantiene por compatibilidad con versiones anteriores, pero la información mostrada en la UI se alimenta principalmente de `usuarios`.

---

## Configuración y ejecución

1. **Clona** el repositorio e instala dependencias.
2. Crea un archivo `.env` / `.env.local` con las variables de Firebase:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   VITE_FIREBASE_MEASUREMENT_ID=...
   ```
3. (Opcional) Ejecuta `node seed_conductores.js` para poblar conductores de ejemplo.
4. Inicia la aplicación:
   ```bash
   npm run dev
   ```
5. Flujos sugeridos:
   - Crear/actualizar datos personales → Agendar viaje → Revisar “Mis viajes”.
   - Autenticarse como conductor → Revisar panel, viajes y editar perfil.

Scripts disponibles:

| Script            | Descripción                      |
|-------------------|----------------------------------|
| `npm run dev`     | Servidor de desarrollo           |
| `npm run build`   | Compilación para producción      |
| `npm run preview` | Revisión local del build         |
| `npm run lint`    | Revisión de estilos y errores    |

---

## Próximos pasos / ideas

- Notificaciones push cuando el viaje cambia de estado.
- Integración de precios dinámicos para dividir costos entre pasajeros.
- Modo offline para registrar viajes y sincronizar luego.

---

## Licencia

Proyecto académico/experimental. Usa y adapta el código bajo tu propio riesgo; recuerda configurar tus credenciales de Firebase antes de desplegarlo.
