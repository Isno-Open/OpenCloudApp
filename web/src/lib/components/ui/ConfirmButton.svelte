<script lang="ts">
  // Action destructrice confirmee DANS la page : le premier clic arme (le libelle devient la question),
  // le second execute. Remplace confirm(), que certains navigateurs bloquent.
  import Button from './Button.svelte';
  import { BUTTON, type ButtonVariant } from './button.ts';
  interface Props {
    label: string; confirmLabel: string; onconfirm: () => void | Promise<void>;
    variant?: ButtonVariant; small?: boolean; disabled?: boolean; [key: `data-${string}`]: string | undefined;
  }
  const { label, confirmLabel, onconfirm, variant = BUTTON.danger, small = true, disabled = false, ...data }: Props = $props();
  let armed = $state(false);
</script>

<Button {variant} {small} {disabled} {...data} onclick={() => { if (armed) void onconfirm(); else armed = true; }}>{armed ? confirmLabel : label}</Button>
