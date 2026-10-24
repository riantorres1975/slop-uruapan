// Configuración de entrada compartida de SLOP URUAPAN.
// La geografía, los límites y el suelo se inyectan desde el manifiesto OSM de Uruapan.
export function isTypingInField(event) {
  const target = event.target;
  return Boolean(target && (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable));
}
