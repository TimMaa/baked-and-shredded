<script lang="ts">
  interface Props {
    type?: 'text' | 'number' | 'email' | 'password' | 'textarea';
    placeholder?: string;
    value?: string | number;
    disabled?: boolean;
    required?: boolean;
    rows?: number;
    name?: string;
    id?: string;
    min?: string | number;
    max?: string | number;
    step?: string | number;
    onchange?: (value: string | number) => void;
    oninput?: (value: string | number) => void;
  }

  let {
    type = 'text',
    placeholder = '',
    value = $bindable(),
    disabled = false,
    required = false,
    rows = 3,
    name = '',
    id = '',
    min,
    max,
    step,
    onchange,
    oninput,
    ...rest
  }: Props = $props();

  const handleChange = (e: Event) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    value = type === 'number' ? Number(target.value) : target.value;
    onchange?.(value);
  };

  const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    value = type === 'number' ? Number(target.value) : target.value;
    oninput?.(value);
  };
</script>

{#if type === 'textarea'}
  <textarea
    {placeholder}
    {disabled}
    {required}
    {rows}
    {name}
    {id}
    bind:value
    onchange={handleChange}
    oninput={handleInput}
    {...rest}
  ></textarea>
{:else}
  <input
    {type}
    {placeholder}
    {value}
    {disabled}
    {required}
    {name}
    {id}
    {min}
    {max}
    {step}
    onchange={handleChange}
    oninput={handleInput}
    {...rest}
  />
{/if}

<style>
  input,
  textarea {
    width: 100%;
  }
</style>
