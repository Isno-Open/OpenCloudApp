// Types propres a l'app SvelteKit.
declare global {
  namespace App {
    interface Locals { lang: import('#lib/i18n.ts').Lang }
  }
}
export {};
