# Nossia

App web para casais (React + TypeScript + Vite, Supabase, Vercel). Antes de fazer merge: `npm test`, `npm run lint`, `npm run build`, e o preview da Vercel verde.

## Design

Dois skills de design estão instalados em `.claude/skills/` e devem ser usados em qualquer trabalho de interface:

- **ui-ux-pro-max** (nextlevelbuilder/ui-ux-pro-max-skill, commit 6ae86f6, MIT): regras de UI/UX e pesquisa local. O script corre a partir da raiz do repositório:
  `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<pesquisa>" --domain ux` (ou `--stack react`).
- **design-motion-principles** (kylezantos/design-motion-principles, commit 4a9ca87, MIT): movimento. Na Nossia a ponderação é Jakub (polimento) em primeiro, Jhey para os momentos da casa e da Summer, Emil para o que se toca muitas vezes.

Regras da casa (decididas com o Ricardo e a Marta):
- As cores, a letra (DM Sans) e os desenhos são da Marta: não trocar a paleta nem as fontes sem ela.
- Sem travessões nos textos que o utilizador lê.
- Todo o movimento tem versão para `prefers-reduced-motion`.
- Só animar `transform`, `opacity` e `filter`.
