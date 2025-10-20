// Este archivo es para declaraciones de tipos personalizadas.
// Ayuda a TypeScript a entender módulos que no tienen sus propias definiciones de tipo.

// Le decimos a TypeScript que cuando importamos un módulo con `?url`,
// su exportación por defecto es un string (la URL).
declare module '*?url' {
  const url: string;
  export default url;
}