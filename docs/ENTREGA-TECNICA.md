# Entrega técnica

Este documento orienta a transferência do projeto **Organização Oncology** para uma nova pessoa desenvolvedora. A entrega do repositório concede acesso técnico para manutenção e evolução nos termos da licença; ela não apaga nem transfere a autoria original.

O projeto foi concebido, projetado e desenvolvido originalmente por **[Victor Rodrigues (@victorrodriguessf)](https://github.com/victorrodriguessf)**. Toda continuação deve preservar o crédito exigido pelo arquivo `LICENSE` e pelo `NOTICE.md`.

## Estado entregue

- Aplicação web full stack em React, TypeScript, Vite e Express.
- Autenticação local com um único administrador.
- Importação de uma planilha XLSX para JSON por script Python.
- Consulta e manutenção de unidades, profissionais, vínculos e exames.
- Persistência atual em arquivos locais.
- Branch principal: `main`.
- Dados reais, credenciais e planilha original não fazem parte do Git.
- O projeto ainda não está adequado a um deploy serverless na Vercel; veja [DEPLOY.md](DEPLOY.md).
- Há riscos de produção pendentes; veja [SEGURANCA.md](SEGURANCA.md).

## Pacote de entrega

O repositório entrega:

- código-fonte e histórico Git sanitizado;
- arquivos de configuração e lockfile;
- script de extração da planilha;
- testes unitários e de navegador;
- documentação técnica;
- imagens de marcas usadas pela interface, sujeitas aos direitos de seus respectivos titulares.

Devem ser enviados separadamente, por canal privado autorizado:

- `data/source/BASE DE DADOS GERAL.xlsx`;
- `data/library.json` e `data/workbook.json`, ou a planilha para regenerá-los;
- `data/manual.json` e `data/manual.backup.json`, se houver cadastros manuais a preservar;
- credenciais novas para o ambiente de destino — nunca o arquivo `data/auth.json` atual;
- acessos ao GitHub, hospedagem, DNS e serviços de armazenamento, conforme a responsabilidade definida entre as partes.

## Primeira execução

Pré-requisitos recomendados:

- Node.js 22 LTS;
- npm compatível com o lockfile;
- Python 3.9 ou superior;
- Git;
- Chromium do Playwright somente para os testes E2E.

```bash
npm ci
mkdir -p data/source
# Copiar a planilha real por canal privado para data/source/BASE DE DADOS GERAL.xlsx
npm run extract -- "data/source/BASE DE DADOS GERAL.xlsx"
npm run dev
```

A aplicação local abre em `http://127.0.0.1:3000`. Na implementação atual, a primeira execução cria `data/auth.json` com `admin` / `admin`. Essa credencial serve apenas para desenvolvimento e deve ser substituída antes de qualquer exposição em rede.

## Verificação da entrega

```bash
npm test
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

O teste E2E usa a porta 3100 e grava somente em `test-results/guide-store`. A suíte atual pressupõe a credencial de desenvolvimento `admin` / `admin`.

## Conhecimento mínimo para manutenção

Leia nesta ordem:

1. [ARQUITETURA.md](ARQUITETURA.md), para entender componentes e requisições;
2. [DADOS-E-OPERACAO.md](DADOS-E-OPERACAO.md), antes de importar, editar ou restaurar dados;
3. [SEGURANCA.md](SEGURANCA.md), antes de disponibilizar o sistema;
4. [DEPLOY.md](DEPLOY.md), antes de escolher a infraestrutura;
5. [ANALISE-DA-BASE.md](ANALISE-DA-BASE.md), para compreender as limitações da planilha de origem;
6. [DIREITOS-E-TERCEIROS.md](DIREITOS-E-TERCEIROS.md), antes de redistribuir código, dados ou marcas.

## Checklist de transição

- [ ] Registrar Victor Rodrigues (`@victorrodriguessf`) como autor e desenvolvedor original no aceite.
- [ ] Confirmar que o receptor leu e aceitou `LICENSE` e `NOTICE.md`.
- [ ] Adicionar a pessoa desenvolvedora ao repositório com o menor privilégio necessário.
- [ ] Entregar dados reais em canal privado e confirmar o recebimento.
- [ ] Gerar credenciais novas; não compartilhar `data/auth.json`.
- [ ] Definir onde ficarão banco, sessões, backups e logs.
- [ ] Definir responsável por LGPD, incidentes, suporte e custos de infraestrutura.
- [ ] Executar build e testes no ambiente do receptor.
- [ ] Registrar versão, commit e hash do pacote entregue no termo assinado.
- [ ] Revogar acessos temporários ao final da transição.

## Aceite técnico sugerido

O receptor deve registrar, em documento externo assinado, ao menos:

- data da entrega;
- URL do repositório e hash do commit aceito;
- relação dos arquivos de dados entregues separadamente e seus hashes SHA-256;
- ambientes e acessos transferidos;
- testes executados e ressalvas conhecidas;
- período e escopo de suporte, se houver;
- confirmação de que dados pessoais e segredos serão tratados em ambiente autorizado.
