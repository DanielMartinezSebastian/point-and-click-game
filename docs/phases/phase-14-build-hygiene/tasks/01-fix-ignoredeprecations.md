# Task 01 — Fix `ignoreDeprecations` inválido en tsconfig raíz

**Effort**: ~0.5h | **Blocks**: ninguna | **Blocked by**: ninguna

---

## 🎯 Objetivo

El `tsconfig.json` de la raíz declara `"ignoreDeprecations": "6.0"`, valor que
TypeScript 5.9 rechaza con `error TS5103: Invalid value for '--ignoreDeprecations'`.
Esto hace fallar cualquier `tsc` que extienda el config raíz (engine-core,
engine-renderer-r3f) antes de compilar. Hay que corregir el valor.

---

## ✅ Success Criteria

- [ ] `npx tsc -p packages/engine-core/tsconfig.json` no emite `TS5103`
- [ ] `npx tsc -p packages/engine-renderer-r3f/tsconfig.json` no emite `TS5103`
- [ ] `npm run build` (raíz) no falla por error de configuración de TS
- [ ] Sin cambios de runtime

---

## 📝 Instructions

### Step 1 — Comprobar si `ignoreDeprecations` es necesario

Abre `tsconfig.json` (raíz). Revisa si hay opciones deprecadas que requieran
la supresión (p.ej. `importsNotUsedAsValues`, `preserveValueImports`,
`keyofStringsOnly`, `suppressImplicitAnyIndexErrors`, `noImplicitUseStrict`,
`out`, `charset`). El config actual NO usa ninguna → la línea probablemente es
innecesaria.

### Step 2 — Aplicar el fix

Opción A (preferida si no hay opciones deprecadas): **eliminar** la línea
`"ignoreDeprecations": "6.0",`.

Opción B (si algún `tsc` lo reclama tras quitarla): cambiar el valor a
`"5.0"` (único valor válido en TS 5.x):

```jsonc
"ignoreDeprecations": "5.0",
```

NO usar `"6.0"` — TS 5.9 no lo reconoce.

### Step 3 — Validación

```bash
npx tsc -p packages/engine-core/tsconfig.json          # sin TS5103
npx tsc -p packages/engine-renderer-r3f/tsconfig.json  # sin TS5103
```

(Es esperable que engine-core aún reporte errores de TIPO en los tests; eso
lo resuelve la Task 02. Aquí solo importa que NO aparezca `TS5103`.)

---

## 📚 References

- `tsconfig.json` (raíz, línea ~21)
- TS docs: `--ignoreDeprecations` solo acepta `"5.0"` en la serie 5.x
