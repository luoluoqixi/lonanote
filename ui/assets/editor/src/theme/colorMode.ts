export async function setColorMode(mode: 'light' | 'dart') {
  if (window.setColorMode != null) {
    window.setColorMode(mode);
  }
}
