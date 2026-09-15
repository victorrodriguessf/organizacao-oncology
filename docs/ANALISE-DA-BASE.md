# Leitura e interpretação da base

## Resultado da leitura integral

- 19 abas, todas lidas; 2.743 linhas com conteúdo e 8.111 células não vazias após desconsiderar espaços.
- Nenhuma fórmula encontrada. Os números são valores armazenados; não há cálculos a recalcular.
- SHA-256 do arquivo: `72c61a19915401697272ceb3c239892e4425f87316df030771e6ec952f39371a`.
- 102 identidades profissionais distintas por conselho/registro, distribuídas em 206 registros de vínculo/cadastro. “Cadastro geral” e “Oncology Group” não foram contados como unidades assistenciais.
- 390 registros de valores em quadros de especialidade e comparativos, incluindo 81 sem valor monetário numérico.
- 116 posições na matriz: 29 convênios × 4 unidades. Promater não aparece nessa matriz.
- 189 registros no catálogo: 179 com código e 10 descrições gerais sem código; 116 códigos distintos. Um código pode aparecer em procedimentos diferentes ou variantes.
- 78 referências de negociação e 49 textos/condições preservados.
- 1.875 linhas na exportação COMN; 64 repetições de pares nome/modalidade e 5 linhas sem nome. São 1.811 pares distintos, incluindo o par sem profissional; isso **não** equivale a 1.811 vínculos clínicos comprovados.
- 235 registros de equipe nas quatro versões, sem presumir que sejam pessoas diferentes.
- 47 pontos de conferência detectados pelas regras implementadas; esse número não é uma auditoria exaustiva de todas as inconsistências possíveis.

## O que esta planilha representa

A base reúne informações de apoio à gestão comercial, administrativa e operacional do grupo. Ela permite localizar profissionais, entender em quais unidades atuam, consultar dias/turnos, identificar convênios e serviços indicados como habilitados, comparar valores, acompanhar a expansão do credenciamento e consultar a estrutura de equipe.

Não há dados de produção assistencial, número de pacientes, faturamento efetivo, taxas de ocupação ou histórico temporal confiável. Por isso, a interface não cria indicadores de receita, crescimento, produtividade, disponibilidade em tempo real ou evolução mensal.

## Abas e propósito

| Aba | Linhas com conteúdo | Interpretação |
| --- | ---: | --- |
| MÉDICOS ONCOLOOGY | 44 | Corpo clínico e contratos |
| CORPO CLÍNICO GERAL | 46 | Cadastro clínico geral |
| CORPO CLINICO COMN | 84 | Corpo clínico COMN |
| CORPO CLINICO OC | 21 | Corpo clínico OC |
| CORPO CLINICO CSM | 14 | Corpo clínico CSM |
| CORPO CLINICO PROMATER | 10 | Corpo clínico Promater |
| CORPO CLINICO Mossoró | 6 | Corpo clínico Mossoró |
| MAPEAMENTO ESPECIALIDADE COMN | 26 | Convênios e valores COMN |
| MAPEAMENTO ESPECIALIDADE MOSSOR | 12 | Convênios e valores Mossoró |
| MAPEAMENTO ESPECIALIDADE OC | 24 | Convênios e valores OC |
| MAPEAMENTO ESPECIALIDADE CSM | 17 | Convênios e valores CSM |
| CONVÊNIOS ESPECIALIDADES | 77 | Comparativos, serviços e credenciamentos |
| Base de dados negociações | 145 | Referências e condições de negociação |
| CODIGOS PROCEDIMENTOS | 190 | Catálogo de procedimentos |
| CORPO CLINICO COMN - EXPORTAÇÃO | 1876 | Relações da exportação COMN |
| LISTAGEM FUNCIONARIOS | 35 | Equipe por unidade — versão 1 |
| LISTAGEM  (2) | 35 | Equipe por unidade — versão 2 |
| LISTAGEM  (3) | 44 | Equipe por setor |
| GRUPOS | 37 | Grupos e estrutura organizacional |

## Fluxo inferido dos dados

1. **Localizar unidade e profissional:** conselho/registro, especialidade, vínculo e contrato.
2. **Consultar atendimento:** dias, turnos e observações locais. Manter expressões como “quinzenal”, “12h/9h” e “em negociação para iniciar”.
3. **Consultar convênio e serviço:** distinguir cadastro, serviço habilitado, vínculo de exportação e etapa comercial.
4. **Consultar referência de valor:** selecionar especialidade/unidade e verificar a aba de origem. Valor não preenchido significa ausência de informação.
5. **Acompanhar credenciamento:** consultar proposta, documentação, suspensão, impedimentos e orientações registradas.
6. **Consultar negociação/procedimento:** código, descrição, contexto, taxa, material, exclusões e condições.
7. **Localizar equipe:** consultar setor, cargo e unidade, verificando a versão do cadastro.

Este fluxo é uma interpretação da organização da planilha, não uma declaração de processos internos formalmente aprovados.

## Decisão sobre versões

O usuário escolheu **exibir versões e sinalizar divergências**. Nenhuma aba substitui outra. Os módulos mostram todos os registros relevantes com origem; a tela de qualidade destaca diferenças detectadas. Não há escolha automática de valores mais recentes, porque a fonte não fornece vigência consistente.

Exemplos concretos:

- Oncoclínicas / Oncologia / Bradesco Saúde tem valores diferentes no mapeamento e no comparativo.
- RQE de um mesmo profissional difere entre cadastros. Os dois valores permanecem na base.
- Código 60023082 aparece com R$ 150,00, R$ 172,76 e R$ 207,94; há diferenças de contexto, inclusive uma taxa específica de hematologia.
- Código 60026081 aparece associado a descrições e valores distintos.
- O acompanhamento de Mossoró informa “TOTAL: 17”, mas lista 20 registros.
- Algumas funções, unidades e datas de nascimento divergem entre versões de equipe.
- A exportação inclui cartão, transferência, particular, cortesia, nomes de serviços e entidades; contar tudo como convênio ou médico seria incorreto.
- “Não solicitar”, “não credenciou”, “suspenso”, “aguardando proposta” e “documentação enviada” têm significados distintos.

## Extração e identidade

- O arquivo `workbook.json` preserva todas as células que contêm valor, com texto original, coordenada, tipo, estilo, linhas ocultas e intervalos mesclados. Inclui células que contêm apenas espaços; estas não entram na contagem de conteúdo útil.
- Códigos, CRM, RQE e CPF permanecem como texto; valores monetários derivados são arredondados para centavos.
- Datas seriais são convertidas a partir da base Excel 1899-12-30, usada neste arquivo. Datas inválidas são preservadas no campo original e não corrigidas por suposição.
- Identidades clínicas usam conselho + número de registro. Conselho é inferido de Nutrição/Psicologia quando a coluna mistura conselho e RQE; essa regra é explícita no extrator. Grafias e especialidades originais continuam disponíveis.
- Relações da exportação só são associadas a um profissional quando o nome normalizado corresponde exatamente a uma das grafias cadastradas; nomes parecidos não são fundidos.
- Convênios são normalizados apenas quanto a caixa, acentos e espaços para comparação pontual de valores. Siglas e modalidades comerciais não são unificadas por inferência.
- Linhas de título, observações e blocos horizontais são tratados conforme cada aba. Todo conteúdo permanece acessível na biblioteca original, mesmo quando não vira uma entidade operacional.

## Identidade visual

As imagens fornecidas identificam Oncology Group, COMN, Oncoclínicas, Clínica São Marcos e Nossa Clínica. A interface usa as logos correspondentes e uma paleta verde/turquesa com neutros claros, detalhes dourados e cores de situação. A logo Nossa Clínica foi preservada nos assets, mas não associada a uma unidade sem evidência na planilha. Não foi fornecida logo da Promater; a identificação dessa unidade é textual.

## Sugestões para a evolução

1. **Prioridade: vigência e responsável por registro.** Adicionar data de atualização, responsável, fonte oficial e validade de preços facilita resolver diferenças com contexto.
2. **Glossário de convênios e serviços.** Definir quais grafias representam a mesma operadora e quais são produtos ou modalidades distintos.
3. **Fluxo de credenciamento estruturado.** Campos separados de etapa, próxima ação, responsável e prazo; manter “não solicitar” como decisão própria.
4. **Atualização por importação.** Evoluir o comando local para uma importação com comparação antes/depois e relatório de alterações, sem sobrescrever dados silenciosamente.
5. **Acesso compartilhado.** A autenticação JWT com um único administrador foi implementada. Antes de compartilhar, evoluir para contas individuais, autorização por perfil e HTTPS, especialmente para CPF, nascimento e negociações comerciais.
6. **Qualidade assistida.** Permitir marcar uma diferença como revisada, com justificativa e histórico, preservando o Excel de origem.
