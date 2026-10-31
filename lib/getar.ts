/**
 * Getaran maklum balas.
 *
 * Android: navigator.vibrate dengan corak penuh.
 * iPhone: Safari tidak menyokong navigator.vibrate, tetapi sejak iOS 17.4
 * menogol <input type="checkbox" switch> menghasilkan ketukan haptik sistem.
 * Satu suis tersembunyi ditogol untuk setiap denyut dalam corak, jadi iPhone
 * merasai bilangan denyut yang sama walaupun bukan tempohnya.
 */

let suis: HTMLLabelElement | null = null;

function ketukIos() {
  if (typeof document === 'undefined') return;
  if (!suis) {
    suis = document.createElement('label');
    suis.setAttribute('aria-hidden', 'true');
    suis.style.cssText = 'position:fixed;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    suis.appendChild(input);
    document.body.appendChild(suis);
  }
  suis.click();
}

/** Corak dalam ms: [getar, rehat, getar, …], seperti navigator.vibrate. */
export function getar(corak: number | number[]) {
  if (typeof navigator === 'undefined') return;
  try {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(corak);
      return;
    }
  } catch { /* jatuh ke laluan iOS */ }
  // iOS: satu ketukan bagi setiap denyut, dijarakkan mengikut corak.
  const senarai = Array.isArray(corak) ? corak : [corak];
  let masa = 0;
  senarai.forEach((ms, i) => {
    if (i % 2 === 0) setTimeout(ketukIos, masa);
    masa += ms;
  });
}

/** Rasa "selesai!" — denyut, rehat, denyut lebih panjang. */
export const getarSiap = () => getar([35, 60, 90]);
