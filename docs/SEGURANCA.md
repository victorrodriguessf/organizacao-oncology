# Segurança

## Bloqueadores de produção

1. A aplicação ainda cria e aceita `admin` / `admin` na primeira execução.
2. Há somente uma conta compartilhada e todas as ações têm papel de administrador.
3. Sessões e limitação de tentativas ficam em memória local.
4. Cadastros são gravados em disco local.
5. HTTPS por proxy ainda não foi configurado e validado para o ambiente de destino.
6. Não há trilha de auditoria de alterações por usuário.

Não disponibilize o sistema na internet antes de resolver esses itens.

## Controles existentes

- senha armazenada como hash scrypt com salt;
- JWT HS256 com emissor, audiência, expiração e identificador;
- cookie `HttpOnly` e `SameSite=Strict`;
- sessão revogável enquanto o processo permanece ativo;
- rejeição de origem cruzada nas escritas;
- API aceita JSON com limite de 128 KiB;
- validação de tamanho e formato dos campos;
- concorrência otimista por revisão;
- arquivos temporários e de credencial criados com permissão `0600`;
- respostas da API com `Cache-Control: no-store` e `X-Content-Type-Options: nosniff`;
- diretório de dados não é servido como pasta estática;
- `.env`, `data/`, relatórios e artefatos locais são ignorados pelo Git.

## Histórico da auditoria

Em 23/09/2026 foi feita uma varredura de código, arquivos de trabalho e histórico Git. Não foram encontrados tokens de provedores, chaves privadas ou a chave JWT local no histórico. O `npm audit` não indicou vulnerabilidades conhecidas naquela data, e o build passou.

Foram encontrados dados pessoais e comerciais em dois JSONs e na planilha original. Esses três arquivos foram removidos da branch `main` e do histórico alcançável atual, e `data/` passou a ser ignorado. O repositório permanece privado. Commits antigos ainda podem permanecer temporariamente em caches internos do GitHub ou em clones anteriores.

O relatório detalhado produzido antes da limpeza está em [AUDITORIA-SEGURANCA.md](AUDITORIA-SEGURANCA.md). Considere as referências ao estado do Git anteriores à limpeza como registro histórico.

## Próximas medidas

- autenticação individual e MFA quando possível;
- armazenamento central de sessões e rate limit;
- banco com transações e backup;
- logs de autenticação e alterações, sem registrar conteúdo sensível;
- cabeçalhos HTTP de segurança apropriados;
- gestão de segredos e rotação;
- testes de autorização e concorrência;
- revisão de dependências e varredura de segredos no CI;
- plano de resposta a incidentes e contatos responsáveis.
