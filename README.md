<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Alquiler Real

Demo de reservas con foco en confianza, trazabilidad y señales reales para tomar mejores decisiones antes de alquilar.

## Mapa UX de reservas

El flujo completo de reserva, con estados, decisiones y fricciones detectadas, quedó documentado en [RESERVATION_UX_MAP.md](./RESERVATION_UX_MAP.md).

## Demo

Credenciales listas para probar los dos recorridos principales:

- Huésped: lucia@demo.com / 123456
- Anfitrión: valeria@demo.com / 123456

La seed demo se carga desde el backend al iniciar y deja pobladas propiedades, reservas, reseñas, conversaciones, favoritos, preferencias y panel de anfitrión.

## Run Locally

Prerequisites: Node.js

1. Install dependencies: `npm install`
2. Configurá las variables de entorno necesarias para backend y frontend
3. Iniciá la app: `npm run dev`

## Validación

Antes de subir cambios o preparar deploy:

1. `npm run lint`
2. `npm test -- --run`
3. `npm run build`
