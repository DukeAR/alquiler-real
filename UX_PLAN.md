# 🎯 UX PRODUCT ENGINEER REFACTOR - PLAN DETALLADO

**Objetivo:** Llevar Alquiler Real de "app funcional básica" a "producto profesional tipo Airbnb"

---

## 📊 ANÁLISIS ACTUAL

### ✅ Lo que YA funciona bien
- Búsqueda por ubicación
- Filtros (precio, tipo, verificados)
- Vista grid y mapa
- Perfil con validaciones
- Chat con optimistic updates
- Error handling robusto
- Loading states
- Responsive design base

### ⚠️ Lo que FALTA / NECESITA MEJORA
- Home hero simplista
- Sin autocompletado de ubicación
- Cards básicas sin favoritos
- Sin persistencia de favoritos
- PropertyDetailView imagen única
- Navegación sin estructura clara
- Perfiles no diferenciados (tenant vs host)
- UI states básicos

---

## 🚀 PLAN DE IMPLEMENTACIÓN (9 Sprints)

### **SPRINT 1: Home Rediseñado**
**Tiempo estimado:** 30 mins
**Cambios:**
- Hero banner mejorado con subtítulo atractivo
- Mostrar 6 propiedades destacadas máximo (en lugar de todas)
- Sección "Recomendados para ti" con skeleton loaders
- Filtros sticky mejorados (price range con slider visual)
- "Clear filters" button funcional

**Archivos a editar:**
- `src/App.tsx` → ExploreView

**Visual esperado:**
```
HERO SECTION
┌─────────────────────────────────────┐
│  🏠 Encontrá tu lugar ideal          │
│  Alquileres verificados en Argentina │
│  [BUSCADOR] [Search button]         │
└─────────────────────────────────────┘

FEATURED SECTION
┌─ Destacados para vos ────────────────┐
│  [Card] [Card] [Card]                │
│  [Card] [Card] [Card]                │
└─────────────────────────────────────┘

MAIN SECTION
┌─ Todas las propiedades ──────────────┐
│  [Card] [Card] [Card]                │
│  [Card] [Card] [Card]                │
└─────────────────────────────────────┘
```

---

### **SPRINT 2: Location Autocomplete**
**Tiempo estimado:** 25 mins
**Cambios:**
- Nueva componente: `LocationAutocomplete.tsx`
- Mock data con ciudades argentinas (Mar del Plata, Tigre, etc)
- Dropdown con suggestions
- Debounced search

**Archivos a crear:**
- `src/components/LocationAutocomplete.tsx`

**Archivos a editar:**
- `src/App.tsx` → Integrar en ExploreView

**Código ejemplo:**
```typescript
// LocationAutocomplete.tsx
export interface LocationSuggestion {
  id: string;
  name: string;
  region: string;
  properties: number;
}

const mockLocations: LocationSuggestion[] = [
  { id: '1', name: 'Mar del Plata', region: 'Buenos Aires', properties: 124 },
  { id: '2', name: 'Tigre', region: 'Buenos Aires', properties: 89 },
  // ... más
];
```

---

### **SPRINT 3: PropertyCard Rediseño + Favoritos UI**
**Tiempo estimado:** 40 mins
**Cambios:**
- Añadir botón ❤️ en card
- Mostrar rating con estrellas
- Mostrar ubicación clara
- Mejorar tipografía y espaciado
- Botón favorito interactivo (estado local primero)

**Archivos a editar:**
- `src/components/PropertyCard.tsx`

**Código visual esperado:**
```
┌──────────────────┐
│   [Image]        │
│  ❤️              │  ← Favorito button
├──────────────────┤
│ Nombre Propiedad │
│ ⭐⭐⭐⭐⭐ (124)  │
│ 📍 Mar del Plata │
│ $XX.XXX/noche    │
│ [Ver detalles]   │
└──────────────────┘
```

---

### **SPRINT 4: Favorites System**
**Tiempo estimado:** 35 mins
**Cambios:**
- Crear `useFavorites.ts` hook custom
- localStorage para persistencia
- Agregar favoritos al contexto de usuario (opcional: sincronizar con backend)
- Métodos: `toggleFavorite()`, `isFavorite()`, `getFavorites()`

**Archivos a crear:**
- `src/hooks/useFavorites.ts`

**Archivos a editar:**
- `src/components/PropertyCard.tsx` → Usar hook
- `src/App.tsx` → Pasar favoriteIds a cards

**Implementación:**
```typescript
const useFavorites = () => {
  const [favorites, setFavorites] = useState<Set<string>>(
    new Set(JSON.parse(localStorage.getItem('favorites') || '[]'))
  );

  const toggleFavorite = (propertyId: string) => {
    const newFavs = new Set(favorites);
    newFavs.has(propertyId) ? newFavs.delete(propertyId) : newFavs.add(propertyId);
    setFavorites(newFavs);
    localStorage.setItem('favorites', JSON.stringify([...newFavs]));
  };

  return { favorites, toggleFavorite, isFavorite: (id: string) => favorites.has(id) };
};
```

---

### **SPRINT 5: Favorites Page**
**Tiempo estimado:** 30 mins
**Cambios:**
- Nueva ruta: `/favorites`
- Lista de propiedades favoritas
- EmptyState cuando no hay favoritos
- Opción para quitar de favoritos
- Misma card design que home

**Archivos a crear:**
- `src/components/FavoritesView.tsx`

**Archivos a editar:**
- `src/App.tsx` → Agregar ruta

**Visual:**
```
┌─ Mis Favoritos ──────────────────────┐
│ (X favoritos guardados)              │
│                                      │
│  [Card] [Card] [Card]                │
│  [Card] [Card] [Card]                │
│                                      │
│ Si está vacío:                       │
│ [🏠 Sin favoritos]                   │
│ [Explorar propiedades →]             │
└──────────────────────────────────────┘
```

---

### **SPRINT 6: PropertyDetail Gallery**
**Tiempo estimado:** 35 mins
**Cambios:**
- Reemplazar imagen única con galería
- Thumbnails abajo (Airbnb style)
- Modal para full-screen
- Arrows para navegar
- Optimización de imágenes

**Archivos a crear:**
- `src/components/PropertyGallery.tsx`

**Archivos a editar:**
- `src/App.tsx` → PropertyDetailView usar galería

**Campos a agregar en Property (si no existen):**
- `images: string[]` (array de URLs)

---

### **SPRINT 7: Enhanced Navigation**
**Tiempo estimado:** 40 mins
**Cambios:**
- Bottom navbar en mobile (Home, Search, Favorites, Profile)
- Fixed navbar en desktop
- Tabs activos con highlight
- Transiciones smooth
- 5-6 opciones máximo

**Archivos a crear:**
- `src/components/BottomNav.tsx` (mobile)
- `src/components/TopNav.tsx` (desktop)

**Archivos a editar:**
- `src/App.tsx` → Layout component usar navs

**Mobile layout:**
```
┌────────────────────────────────┐
│     APP CONTENT                │
│                                │
└────────────────────────────────┘
┌────┬────┬────┬────────────────┐
│🏠  │🔍  │❤️  │👤  │ Menu       │
└────┴────┴────┴────────────────┘
```

---

### **SPRINT 8: Profile Separation**
**Tiempo estimado:** 45 mins
**Cambios:**
- Detectar tipo de usuario (tenant vs host) en ProfileViewNew
- Tabs: "Mi Cuenta" | "Como Inquilino" | "Como Propietario" (si aplica)
- Secciones diferenciadas:
  - **Inquilino:** Favoritos, Historial (mis reservas), Reseñas
  - **Propietario:** Propiedades publicadas, Estadísticas, Editar propiedades

**Archivos a editar:**
- `src/components/ProfileViewNew.tsx` → Agregar lógica de tabs

---

### **SPRINT 9: Polish & Mobile Pass**
**Tiempo estimado:** 50 mins
**Cambios:**
- Mejorar todos los UX states (loading, error, empty)
- Optimize images/lazy loading
- Test en móvil real (o DevTools)
- Transiciones suaves (Framer Motion)
- Accesibilidad (alt text, aria labels)
- Dark mode consistency

**Archivos a revisar:**
- Todos los componentes de UI

---

## 📋 CHECKLIST DE CAMBIOS

### Home/Explore
- [ ] Hero mejorado
- [ ] Máximo 6 destacados
- [ ] Filtros sticky
- [ ] Clear filters button

### Búsqueda
- [ ] LocationAutocomplete implementado
- [ ] Debounced search
- [ ] Mock data de ciudades

### PropertyCard
- [ ] Botón favorito ❤️
- [ ] Rating con estrellas
- [ ] Ubicación visible
- [ ] Responsive

### Favoritos
- [ ] useFavorites hook
- [ ] localStorage persistencia
- [ ] FavoritesView ruta
- [ ] EmptyState

### Detalle
- [ ] PropertyGallery componente
- [ ] Thumbnails
- [ ] Full-screen modal

### Navegación
- [ ] BottomNav mobile
- [ ] TopNav desktop
- [ ] Routing actualizado
- [ ] Tabs activos

### Perfil
- [ ] Tenant vs Host separation
- [ ] Tabs funcionales
- [ ] Secciones diferenciadas

### UX
- [ ] Loading states mejorados
- [ ] Empty states brandados
- [ ] Error messages claros
- [ ] Transiciones smooth

---

## 🎨 DESIGN PRINCIPLES

**Color Palette (mantener consistencia):**
```
Primary: #15803d (brand/emerald-600)
Secondary: #64748b (slate-500)
Background: #ffffff (light), #0f172a (dark)
Error: #dc2626 (red-600)
Success: #10b981 (emerald-500)
```

**Typography:**
- Headings: `font-black text-{size}`
- Body: `font-medium text-{size}`
- Labels: `font-bold text-xs uppercase`

**Spacing:**
- Mobile: `px-4 py-3` (16px / 12px)
- Desktop: `px-6 py-4` (24px / 16px)

**Border Radius:**
- Inputs/Buttons: `rounded-2xl`
- Cards: `rounded-[48px]`
- Small elements: `rounded-xl`

---

## 🔄 WORKFLOW

**Cambios incrementales sin breaking:**
1. Crear componente nuevo → exportar
2. Importar en App.tsx
3. Integrar en flujo existente
4. Test en dev
5. Commit

**No overwriting:**
- Mantener rutas existentes
- Mantener función
- Solo mejorar UX/diseño

---

## ⏱️ TIMELINE TOTAL

- **Tiempo estimado:** 4-5 horas (sprints secuenciales)
- **Pausas incluidas:** Pruebas entre sprints
- **Risk:** Baja (cambios principalmente visuales)

---

## 🚄 ORDEN DE EJECUCIÓN

✅ **Recomendado empezar por:**
1. Sprint 1 (Home) → Impacto visual inmediato
2. Sprint 2 (Autocomplete) → UX improvement
3. Sprint 3 (PropertyCard fix) → Visual polish
4. Sprint 4 (Favorites logic) → Funcionalidad core
5. Sprint 5 (Favorites page) → Completar feature
6. Sprint 6 (Gallery) → Detail page
7. Sprint 7 (Navigation) → Structure
8. Sprint 8 (Profile) → Userflow
9. Sprint 9 (Polish) → Final touches

---

**Status:** READY TO START ✅

**Next:** Ejecutar Sprint 1 (Home Rediseño)
