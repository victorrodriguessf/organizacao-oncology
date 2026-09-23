# Deploy

## Situação atual

O projeto está pronto para execução local em um único processo persistente. Ele **não deve ser importado diretamente na Vercel como se fosse apenas um site Vite**, pois depende de API, escrita durável em arquivos e estado de sessão em memória.

O build de frontend é produzido por:

```bash
npm run build
```

A produção local é iniciada por:

```bash
npm start
```

## Por que a Vercel exige adaptação

- `data/manual.json` é alterado em tempo de execução;
- `data/auth.json` pode ser criado em tempo de execução;
- sessões e limites de login vivem em `Map` no processo;
- a trava de escrita depende de um único disco;
- `express.static(dist)` não é a estratégia de assets da integração Express da Vercel;
- o comportamento de HTTPS depende da configuração correta do proxy.

Em ambiente serverless, instâncias podem iniciar, encerrar e executar em paralelo. Arquivos do pacote não são um banco de dados durável e memória local não é compartilhada.

## Caminhos de implantação

### Servidor persistente

É a menor mudança técnica. Use VM, container ou plataforma que ofereça processo Node persistente e volume durável. Ainda será necessário:

- substituir `admin` / `admin`;
- configurar proxy HTTPS e cookies seguros;
- restringir acesso à aplicação e aos backups;
- automatizar backup e monitoramento;
- garantir que somente uma instância grave nos arquivos, ou migrar a persistência;
- definir reinício, logs e atualização sem perda de dados.

### Vercel

Exige refatoração antes do deploy:

1. mover `library.json` para armazenamento privado ou empacotá-lo apenas como fonte de leitura autorizada;
2. mover `manual.json` para banco transacional;
3. trocar sessões em memória por autenticação compatível com múltiplas instâncias;
4. mover limitação de tentativas para armazenamento compartilhado;
5. separar/exportar o Express no formato suportado;
6. configurar build e roteamento do frontend;
7. configurar segredos no ambiente da Vercel;
8. validar cookies, origem, IP do cliente e HTTPS atrás do proxy;
9. executar testes de concorrência, reinício e persistência.

Possíveis categorias de serviço são banco PostgreSQL gerenciado, provedor de identidade e armazenamento privado de objetos. A escolha deve considerar LGPD, região, contrato, backup, acesso e custo.

## Variáveis atuais

| Variável | Padrão | Uso |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP |
| `GUIDE_DATA_DIR` | `<raiz>/data` | Diretório de `manual.json`, backup e lock |

Não há suporte atual a usuário, senha ou segredo JWT via variável de ambiente.

## Checklist antes de produção

- [ ] Remover credencial padrão e implementar provisionamento seguro.
- [ ] Definir armazenamento persistente e testar restauração.
- [ ] Garantir sessões e rate limit entre instâncias.
- [ ] Configurar HTTPS, `trust proxy` e cookie `Secure` corretamente.
- [ ] Definir permissões por pessoa; hoje existe apenas um administrador compartilhado.
- [ ] Definir logs sem dados pessoais ou segredos.
- [ ] Implementar monitoramento e alertas.
- [ ] Rever proteção de dados e contratos dos fornecedores.
- [ ] Executar `npm test`, `npm run lint`, `npm run build` e `npm run test:e2e`.
- [ ] Fazer teste de aceite com dados não produtivos.
