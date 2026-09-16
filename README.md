# Organização Oncology

Guia web da rede Oncology Group, construído a partir das 19 abas da **BASE DE DADOS GERAL.xlsx**. A interface mostra unidades, especialidades, profissionais, convênios, dias de atendimento e exames. O cadastro manual atualiza um arquivo JSON no servidor, sem modificar a planilha original.

## Executar

```bash
npm install
npm run dev
```

Abra **http://127.0.0.1:3000** e entre com `admin` / `admin`. O servidor inicia somente no endereço local. Para usar outra porta: `PORT=3001 npm run dev`.

O repositório privado inclui `data/library.json`, `data/workbook.json` e `data/source/BASE DE DADOS GERAL.xlsx`. O arquivo `data/auth.json` (hash de senha e chave JWT) é criado na primeira execução e não é versionado. O arquivo `data/manual.json` guarda as alterações feitas na interface e também não é versionado. A cada atualização, o servidor cria `data/manual.backup.json` com a versão anterior. **Guarde esses dois arquivos no backup da instalação** para preservar os cadastros.

Para atualizar a extração após mudar a planilha:

```bash
npm run extract -- "data/source/BASE DE DADOS GERAL.xlsx"
```

O guia lê a biblioteca extraída e aplica os cadastros manuais por cima dela. Uma nova extração preserva `data/manual.json`; confira os vínculos depois de substituir a planilha. Não há sincronização automática com Excel.

## Como o guia funciona

- **Unidades:** cinco unidades da base atual. CNPJ e razão social ficam vazios até serem confirmados. O administrador pode atualizar a identificação das unidades existentes. Nenhuma unidade nova foi presumida.
- **Especialidades:** aparecem dentro da unidade selecionada, com busca e filtros locais de convênio e dia. A especialidade leva à lista dos profissionais vinculados.
- **Profissional:** o cadastro é único por conselho e registro. Cada unidade tem seus próprios vínculos, especialidades, convênios e horários. A página do profissional mostra esses dados na unidade escolhida e sinaliza campos não informados.
- **Exames:** são cadastrados explicitamente por unidade, com descrição, código, convênios e profissionais associados. O catálogo de procedimentos da planilha auxilia o preenchimento; um item do catálogo não é automaticamente considerado um exame oferecido pela clínica.
- **Origem:** cadastros importados indicam a planilha e suas referências. Atualizações manuais são identificadas. Valores divergentes na fonte permanecem no arquivo de extração, sem fusão silenciosa.

O foco do guia é o corpo clínico e os serviços. Informações de contrato e acompanhamento de credenciamento da planilha não aparecem na interface.

## Stack e arquivos

React 19, TypeScript, Vite 6, Tailwind CSS 4, React Router, Lucide React e Anime.js 4. Express serve a API e a autenticação local. A stack segue o `package.json` do [banco-praticas-inovadoras](https://github.com/victorrodriguessf/banco-praticas-inovadoras). O uso de `createScope` no React e a limpeza das animações seguem a [documentação oficial do Anime.js](https://animejs.com/documentation/getting-started/using-with-react/). A extração usa Python 3 e a biblioteca padrão, lendo o XML do XLSX diretamente.

| Arquivo | Função |
| --- | --- |
| `scripts/extract_workbook.py` | Extração reproduzível da planilha |
| `data/library.json` | Biblioteca operacional importada |
| `data/workbook.json` | Células e abas originais da planilha |
| `guide-store.ts` | Projeção do guia, validação e gravação segura dos cadastros |
| `guide-api.ts` | API autenticada de consulta e cadastro |
| `src/App.tsx` / `src/GuideForms.tsx` | Navegação e formulários administrativos |
| `docs/ANALISE-DA-BASE.md` | Interpretação da planilha e suas divergências |
| `tests/` | Testes da extração, autenticação e fluxos no navegador |

## Autenticação e dados

Há apenas um usuário, `admin`, com senha inicial `admin`, conforme solicitado. O servidor armazena um hash scrypt da senha e assina JWTs HS256 com uma chave aleatória. A sessão fica no cookie `oncology_session`, com `HttpOnly`, `SameSite=Strict` e validade de oito horas. As rotas `/api/guide` e `/api/auth/me` exigem sessão válida; as gravações exigem papel de administrador, JSON e origem permitida. O token não é guardado em localStorage.

O servidor não oferece `data/` como pasta estática. A API de guia serve somente os campos necessários para a interface; a planilha e os JSONs integrais continuam como arquivos locais. Antes de disponibilizar o sistema pela internet, configure HTTPS e substitua a senha inicial por uma senha forte.

## Validar e executar em produção local

```bash
npm test
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
npm start
```

`npm start` serve o build e a API na mesma origem. Hospedar apenas `dist/` não funciona porque o guia depende de `/api/guide`. Os testes de navegador usam a porta 3100 e guardam os cadastros de teste em `test-results/guide-store`, sem tocar em `data/manual.json`.

As observações e instruções nas células da planilha são tratadas como **dados de origem**, não como comandos para o sistema.
