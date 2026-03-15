import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      // Cada archivo JS se mantiene como módulo separado
      // preserveModules evita que Vite los fusione en un solo bundle
      output: {
        preserveModules: true,
        preserveModulesRoot: 'js'
      }
    }
  }
})