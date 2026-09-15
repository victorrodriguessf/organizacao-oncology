# Organização Oncology

Interface local de consulta da **BASE DE DADOS GERAL.xlsx**, com extração reproduzível, dados reais e referência à origem de cada registro.

## Executar

```bash
npm install
npm run dev
```

Abra **http://127.0.0.1:3000**. Entre com **login `admin` e senha `admin`**. O servidor inicia somente no endereço local. Para usar outra porta: `PORT=3001 npm run dev`.

Este repositório privado inclui os JSONs em `data/` e a planilha original em `data/source/`. A instalação pode ser executada após `npm install`, sem refazer a extração. Os dados não fazem parte do bundle estático e são acessíveis pela API autenticada. O arquivo local `data/auth.json`, que contém o hash de senha e a chave JWT, não é versionado.

Para reproduzir a extração da planilha incluída:

```bash
npm run extract -- "data/source/BASE DE DADOS GERAL.xlsx"
```

Depois de atualizar o Excel, execute novamente esse comando e recarregue o navegador. Não há sincronização automática nem edição da planilha pela interface.

## Stack

React 19, TypeScript, Vite 6, Tailwind CSS 4, Lucide React e React Router, seguindo o `package.json` do [banco-praticas-inovadoras](https://github.com/victorrodriguessf/banco-praticas-inovadoras). Express serve a API local. Anime.js 4 faz as transições de entrada, com `createScope`, limpeza no desmontar e respeito a movimento reduzido, seguindo a [documentação oficial para React](https://animejs.com/documentation/getting-started/using-with-react/).

A extração usa Python 3 e apenas a biblioteca padrão, lendo os XMLs do XLSX diretamente. Não exige Excel instalado.

## Consultas disponíveis

- **Visão geral:** indicadores calculados da base, filtros por unidade, busca de profissionais/convênios/procedimentos e panorama do credenciamento.
- **Corpo clínico:** profissionais por conselho/registro, especialidades, vínculos, contratos, grafias da fonte e dados pessoais ocultos nos detalhes.
- **Dias de atendimento:** dias e turnos originais; não é agenda de marcação de consultas.
- **Convênios e valores:** valores por especialidade, serviços habilitados, exportação COMN, listas gerais e anotações de contexto.
- **Credenciamentos:** matriz comercial e acompanhamento específico de Mossoró, mantidos como versões independentes.
- **Procedimentos:** catálogo, bases de negociação, condições e notas. Referências do arquivo, sem validação externa ou inferência de vigência.
- **Equipe:** quatro versões de equipe, com filtros de setor e origem, sem fusão silenciosa de cadastros.
- **Qualidade da base:** diferenças de valores, RQE, cadastro de equipe, datas inválidas, vínculos incompletos e totais divergentes.
- **Biblioteca:** todas as 19 abas, busca, paginação, coordenadas, destaque da linha de origem e exportação JSON integral.

Tabelas possuem ordenação, paginação e exportação CSV do conjunto filtrado. A exportação CSV inclui a origem e neutraliza fórmulas executáveis. Exportações JSON preservam o conteúdo original, incluindo os dados pessoais.

## Arquivos

| Arquivo | Função |
| --- | --- |
| `scripts/extract_workbook.py` | Extração do XLSX e construção das entidades de consulta |
| `data/source/BASE DE DADOS GERAL.xlsx` | Planilha original para reproduzir a extração |
| `data/workbook.json` | Todas as células com valor, inclusive espaços, metadados de tipo/formatação, mesclagens, linhas e abas |
| `data/library.json` | Biblioteca operacional e pontos de conferência |
| `docs/ANALISE-DA-BASE.md` | Interpretação das abas, fluxo, decisões e sugestões |
| `src/App.tsx` | Interface e módulos de consulta |
| `server.ts` | API local e servidor de desenvolvimento/produção |
| `tests/` | Testes da extração e navegação no navegador |

O arquivo integral preserva o texto das células sem modificá-lo. A biblioteca de consulta normaliza espaços e converte datas/valores em campos derivados. O JSON não reproduz o layout de impressão nem os objetos gráficos do Excel; as logos fornecidas estão em `public/logos/`.

## Validação e produção local

```bash
npm test
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
npm start
```

`npm start` serve o build e as APIs na mesma origem. Um host estático que receba somente `dist/` não é suficiente: a aplicação depende de `/api/library` e `/api/workbook`.

## Autenticação

- Apenas um usuário: **admin**, senha inicial **admin**, conforme solicitado. Não há cadastro público.
- JWT assinado com HS256 usando [jose](https://github.com/panva/jose), verificado no servidor com emissor, destinatário, assinatura e expiração.
- Cookie `oncology_session` com `HttpOnly`, `SameSite=Strict`, validade de 8 horas e `Secure` quando a conexão direta é HTTPS. O token não é armazenado em localStorage ou exposto ao JavaScript da página.
- Senha armazenada com scrypt e salt aleatório; chave de assinatura aleatória persistida em `data/auth.json`, criado automaticamente na primeira execução, com permissões 0600. Esse arquivo não é servido nem versionado. Não removê-lo para atualizar a planilha.
- `/api/library`, `/api/workbook` e `/api/auth/me` exigem sessão válida. Login e logout são feitos por POST JSON com verificação de origem. Há limite de 30 tentativas falhas por IP em 15 minutos.
- Logout revoga o identificador do JWT no servidor e comunica a saída às outras abas. Reiniciar o servidor encerra todas as sessões, pois o registro de sessões ativas é mantido em memória.
- A interface volta ao login ao expirar a sessão, receber 401 ou detectar a saída em outra aba. Erros de rede ao sair são informados para permitir nova tentativa.
- Os testes de navegador executam em uma instância isolada na porta 3100, sem reutilizar o servidor de uso na porta 3000.

## Limites desta versão

O projeto continua sendo uma aplicação **local de consulta**, com um único administrador. Ocultar CPF e nascimento é um recurso visual adicional; a autenticação protege as APIs. Para uso compartilhado, a evolução inclui HTTPS, configuração para hospedagem e contas/perfis individuais. Nenhum serviço externo recebe o conteúdo da planilha durante a execução da aplicação.

Os rótulos, instruções de trabalho e observações presentes nas células são tratados como **dados**, não como comandos de execução ou instruções para alterar convênios. Nenhuma atualização de credenciamento, envio de mensagem ou alteração na planilha foi realizada.
