# Auditoria antes de publicar no GitHub e na Vercel

Data: 23/09/2026. Commit auditado: `0d73847899d1e5f7809d6ddf16121a415b4f39cb`.

> **Atualização posterior à auditoria:** `data/library.json`, `data/workbook.json` e `data/source/BASE DE DADOS GERAL.xlsx` foram removidos da branch `main` e do histórico Git alcançável atual. O diretório `data/` passou a ser ignorado, os arquivos locais foram preservados e o repositório permaneceu privado. As descrições abaixo registram o estado encontrado antes dessa correção. Os demais bloqueadores, inclusive `admin` / `admin` e a incompatibilidade da persistência atual com a Vercel, continuam pendentes.

**Resultado: há impedimentos para disponibilizar o sistema na internet e para tornar o repositório público.** A senha padrão continua ativa e há dados pessoais e comerciais nos arquivos versionados e no histórico. Não foi encontrada evidência de publicação pública desses dados nesta auditoria.

À época da auditoria, o repositório `victorrodriguessf/organizacao-oncology` já existia no GitHub e estava privado. A branch remota `main` ainda incluía a pasta `data`; esse histórico foi posteriormente reescrito conforme a atualização acima. Manter o repositório privado reduz a exposição, mas não corrige a senha nem os problemas do deploy.

## Achados e ações necessárias

### 1. Alta — credencial padrão funcional e registrada no código

Evidência: `auth.ts:19` cria o usuário `admin` com senha `admin`. O README documenta esse acesso e os testes também o utilizam. A comparação local com o hash armazenado confirmou a senha padrão; uma requisição real de login no servidor de produção local retornou HTTP 200 com essa credencial.

Qualquer pessoa que conheça o padrão poderá consultar e modificar o guia se o sistema for disponibilizado assim. Todos os acessos válidos recebem papel de administrador. Não existe fluxo implementado de troca de senha nem leitura de credenciais de variáveis de ambiente; apenas cadastrar uma senha no painel da Vercel não mudará esse comportamento.

Ação: remover a criação automática com senha conhecida, exigir configuração segura no servidor e trocar a credencial existente antes do deploy. Guardar hash/salt e chave JWT em configuração secreta do servidor ou usar um provedor de autenticação. Nunca colocar segredos em variáveis `VITE_*`, código do navegador ou arquivos versionados. Isolar credenciais fictícias dos testes das credenciais reais. Rotacionar a chave de assinatura ao substituir a configuração de autenticação para invalidar sessões anteriores.

### 2. Alta para publicação pública — dados pessoais e comerciais já versionados

Os três arquivos abaixo aparecem nos dois commits existentes, inclusive no commit remoto atual:

- `data/library.json`;
- `data/workbook.json`;
- `data/source/BASE DE DADOS GERAL.xlsx`.

O `.gitignore:4-8` permite explicitamente o versionamento desses arquivos. A biblioteca contém:

| Informação | Quantidade observada |
| --- | ---: |
| Registros de vínculo com campo CPF preenchido | 102 |
| Registros de vínculo com data de nascimento convertida | 90 |
| Registros de vínculo com informação contratual | 40 |
| Registros de equipe, incluindo versões repetidas | 235 |
| Registros de equipe com data de nascimento | 86 |
| Registros de valores/tarifas | 390 |
| Referências de negociação | 78 |
| Textos/condições de negociação | 49 |

São contagens de registros, não de pessoas distintas. Nenhum CPF, nascimento ou nome de pessoa é reproduzido neste relatório. Exemplos de localização: campos de CPF a partir de `data/library.json:3196`, tarifas em `data/library.json:8130` e equipe em `data/library.json:48416`.

O login do site não protege arquivos acessíveis por um repositório público. O fato de parte dessas informações não aparecer na interface também não as remove dos commits. O arquivo `docs/ANALISE-DA-BASE.md` ainda descreve valores e condições comerciais da base.

Ação: separar a base real do código publicável, usar dados fictícios nos exemplos e armazenar os dados reais em serviço privado com controle de acesso. Revisar também a documentação derivada. Alterar o `.gitignore` e deixar de versionar arquivos não remove as cópias anteriores: antes de tornar o repositório público, será necessário preparar um histórico limpo ou um novo repositório sanitizado. A limpeza do remoto deve considerar clones, forks e outras referências. Consulte o [procedimento oficial do GitHub](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).

Não apagar simplesmente `library.json`: o guia ainda depende desse arquivo. A separação dos dados exige adaptar o carregamento da base e os testes.

### 3. Impedimento de deploy — persistência e sessões dependem do processo local

Evidências:

- `auth.ts:15-27`: lê ou cria `data/auth.json` no disco do servidor;
- `auth.ts:30-39`: sessões válidas dependem de um `Map` em memória;
- `auth.ts:31,62-65`: controle de tentativas também depende da memória local;
- `guide-store.ts:89-110`: grava cadastros, backups e travas em arquivos locais;
- `server.ts:20-26`: o modo de produção depende do argumento `--production`; sem ele, inicia o middleware de desenvolvimento do Vite;
- `server.ts:21`: entrega o frontend com `express.static(dist)`.

Na arquitetura de Functions da Vercel, dados duráveis e sessões compartilhadas devem ficar em serviços externos. O disco temporário não substitui um banco persistente. Reinícios e múltiplas instâncias também invalidariam ou fragmentariam as sessões e os limites de tentativas desta implementação. Essa conclusão decorre do código e da [documentação da Vercel sobre armazenamento e sessões](https://vercel.com/i/serverless-container-storage).

A Vercel suporta Express, inclusive com `app.listen`; portanto, Express em si não é o impedimento. Contudo, sua integração documenta que `express.static()` é ignorado: o frontend precisa de configuração de saída/roteamento adequada. Hospedar só `dist` como site Vite também não disponibiliza a API exigida pelo guia. Consulte [Express na Vercel](https://vercel.com/docs/frameworks/backend/express) e [arquivos em Functions](https://vercel.com/kb/guide/how-can-i-use-files-in-serverless-functions).

Ação: migrar os cadastros para armazenamento persistente, configurar autenticação e limites de tentativas que funcionem entre instâncias e preparar o frontend/API para o ambiente de produção. Validar gravação, leitura e sessão após reinício e em mais de uma instância antes da publicação.

### 4. Média — HTTPS por proxy não está configurado

`auth.ts:33` define o atributo `Secure` do cookie por `req.secure`. As verificações de origem em `auth.ts:52` e `guide-api.ts:12` dependem de `req.protocol`. O servidor não configura `trust proxy`.

No teste local que simulou terminação HTTPS em um proxy, o login com `Origin` HTTPS do mesmo host retornou 403; uma chamada sem `Origin`, com `X-Forwarded-Proto: https`, conseguiu autenticar, mas recebeu cookie sem `Secure`. Isso demonstra o comportamento da aplicação sob essa simulação, não de um deploy real na Vercel, que não foi realizado.

Ação: configurar a confiança no proxy conforme a infraestrutura real, assegurar cookies `Secure` em produção e testar a validação de origem e o IP utilizado para limitar tentativas. Não confiar indiscriminadamente em cabeçalhos enviados pelo cliente. Referência: [Express atrás de proxies](https://expressjs.com/en/guide/behind-proxies/).

## Verificações que passaram

- `data/auth.json` e `data/manual.json` estão ignorados pelo Git; `auth.json` não consta em nenhum dos dois commits. O arquivo de autenticação local tem permissão `0600`.
- A chave JWT, o hash e o salt atuais não apareceram em nenhum dos 44 blobs Git examinados, por comparação exata. Os valores não foram impressos nem incluídos neste relatório.
- A varredura de padrões não encontrou outras credenciais de provedores, tokens GitHub, chaves privadas, JWTs literais ou URLs com usuário/senha nos arquivos textuais analisados. As ocorrências de senha em testes correspondem ao padrão já reportado. Uma ocorrência no frontend é o atributo HTML de preenchimento de senha, não um segredo.
- `.env*`, `node_modules`, `dist`, resultados de testes e capturas de tela são ignorados. Não havia arquivos `.env` na árvore inspecionada. A exceção `.env.example` exige manter exemplos sem valores reais, caso seja criada.
- `npm run build` passou, incluindo verificação TypeScript.
- `npm audit --json`, consultando o registro oficial do npm, retornou **zero vulnerabilidades conhecidas** na árvore de dependências auditada nesta data. Não foi executado `npm audit fix`.
- O build gerado não contém correspondências exatas dos CPFs extraídos nem da chave, hash ou salt locais.
- Em produção local, `/api/guide` e `/api/auth/me` sem sessão retornaram 401; senha incorreta retornou 401; login válido retornou 200; logout retornou 204 e a reutilização do cookie encerrado retornou 401.
- A resposta autenticada do guia não inclui os campos estruturados `cpf`, `birthDate`, `employees`, `tariffs`, `negotiations`, `passwordHash` ou `jwtSecret`.
- Requisições diretas a `/data/auth.json`, `/data/library.json`, `/data/workbook.json`, à planilha, `/.git/config`, `/auth.ts` e `/.env` no modo de produção retornaram o HTML da aplicação, sem os conteúdos privados. O HTTP 200 nesses caminhos é consequência do fallback da SPA.
- O cookie usa `HttpOnly` e `SameSite=Strict`. A revisão do frontend não identificou persistência do token em `localStorage`.

## Escopo e limites

Foram inspecionados o código, configuração, README, documentação, arquivos de dados locais, build e testes existentes. A varredura inicial enumerou 52 arquivos de trabalho, excluindo `.git` e `node_modules`; analisou 44 blobs dos dois commits alcançáveis pelas referências/reflogs locais e leu o XML interno do XLSX. A API do GitHub confirmou a visibilidade privada, o commit remoto e a presença da pasta de dados. Dependências foram avaliadas pelo npm audit, sem revisão manual de todo o código de terceiros.

Não foram executados Gitleaks/TruffleHog, que não estavam instalados. A busca usou padrões locais, revisão manual e comparação exata dos segredos existentes. Não houve OCR nem inspeção visual das imagens, inclusive imagens embutidas na planilha. Não houve inspeção de clones externos, histórico de visibilidade do repositório, logs de acesso, secrets de Actions ou configurações de uma conta Vercel. A auditoria não prova ausência absoluta de segredos ou acesso indevido.

O teste HTTP usou um servidor temporário restrito a `127.0.0.1`, encerrado ao final, sem alterações nos cadastros. Não foram executados os testes E2E completos, que gravam dados e pressupõem a senha padrão. Esta entrega adiciona apenas o relatório ao código versionável; não altera credenciais, dados, histórico Git, visibilidade do repositório ou deploy. Os achados acima ainda precisam ser corrigidos.
