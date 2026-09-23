# Dados e operação

## Arquivos locais

Todo o diretório `data/` está ignorado pelo Git.

| Arquivo | Conteúdo | Pode ser regenerado? | Backup |
| --- | --- | --- | --- |
| `data/source/BASE DE DADOS GERAL.xlsx` | Fonte original | Não | Obrigatório |
| `data/workbook.json` | Representação quase integral das células | Sim, pela planilha | Recomendado |
| `data/library.json` | Biblioteca normalizada consumida pelo sistema | Sim, pela planilha | Recomendado |
| `data/manual.json` | Cadastros e alterações da interface | Não | Obrigatório |
| `data/manual.backup.json` | Versão anterior de `manual.json` | Parcialmente | Obrigatório junto do atual |
| `data/auth.json` | Usuário, salt, hash e chave JWT | Deve ser substituído | Não transferir; gerar novo |

Esses arquivos podem conter dados pessoais, profissionais e comerciais. A autorização de acesso aos dados é independente da autorização para acessar o código.

## Extração

```bash
npm run extract -- "data/source/BASE DE DADOS GERAL.xlsx"
```

O script valida a estrutura esperada das 19 abas e substitui `workbook.json` e `library.json` por renomeação de arquivos temporários. Ele não altera `manual.json`.

Depois de trocar a planilha:

1. faça backup de todo o diretório `data/`;
2. execute a extração;
3. leia o resumo de contagens exibido no terminal;
4. execute `npm test`;
5. abra a aplicação e confira unidades, profissionais, vínculos e divergências;
6. valide se as sobreposições de `manual.json` ainda apontam para entidades existentes.

## Gravação manual

O arquivo `manual.json` tem versão de esquema `1`, número de revisão e mapas de profissionais, unidades e exames. A API exige que cada gravação informe a revisão lida pelo cliente.

Durante uma gravação, o sistema:

1. cria `data/.manual.lock/`;
2. valida a revisão e o registro;
3. escreve um arquivo temporário com permissão `0600`;
4. copia o arquivo anterior para `manual.backup.json`;
5. renomeia o temporário para `manual.json`;
6. remove temporário e trava.

O lock é local ao sistema de arquivos. Ele não coordena duas máquinas ou instâncias com discos diferentes.

## Backup e restauração

Frequência mínima sugerida:

- antes e depois de cada importação;
- depois de alterações administrativas relevantes;
- automaticamente todos os dias em ambiente de produção.

O backup deve ser criptografado, ter acesso restrito e política de retenção definida pelo responsável pelos dados. Teste restauração periodicamente.

Para restaurar em ambiente local:

1. pare o processo;
2. preserve uma cópia do diretório atual;
3. recoloque `library.json` e `manual.json` compatíveis;
4. remova apenas uma trava comprovadamente órfã em `data/.manual.lock/`;
5. inicie o servidor e confira a revisão e os registros;
6. execute os fluxos críticos de consulta e gravação.

## Segredos

Nunca enviar ao Git, chat, e-mail comum ou documentação:

- `data/auth.json`;
- cookies ou JWTs;
- variáveis de ambiente reais;
- tokens do GitHub, Vercel, banco ou DNS;
- backups não criptografados.

Na troca de responsável, gere novas credenciais e revogue as anteriores. A posse de uma cópia do repositório não deve implicar acesso permanente à produção.

## Retenção e privacidade

A base já foi identificada como contendo CPF, nascimento, dados de profissionais, funcionários e negociações. Antes de produção, o controlador dos dados deve definir finalidade, base legal, perfis de acesso, retenção, descarte, resposta a incidentes e atendimento aos titulares conforme a LGPD. O código atual não implementa essas decisões organizacionais.
