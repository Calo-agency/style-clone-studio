export function buildStylePromptRequest(userPrompt: string) {
  return `Voce e um diretor de arte. Analise a referencia de estilo enviada e gere:
1) "style_summary": resumo do estilo (paleta, luz, textura, pinceladas, contraste, atmosfera).
2) "final_prompt": prompt completo (em ingles) combinando o estilo com o pedido do usuario.
3) "negative_prompt": lista curta de elementos a evitar.

Pedido do usuario: "${userPrompt}".

Responda em JSON estrito com as chaves: style_summary, final_prompt, negative_prompt.`;
}
