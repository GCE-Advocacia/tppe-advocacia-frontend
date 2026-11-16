# Avaliação cruzada — temas, cores e sincronização global

Escopo: US07, US09/US10 e US14. Branch: `avaliacao-cruzada` nos dois repositórios.
Bases utilizadas: frontend `87326fd`, backend `a7bb404`. A `main` local não foi alterada.

## Correções

- Backend: temas oficiais não podem ser alterados nem excluídos (403); duplicação via `POST /office-config/themes/{id}/duplicate` com a mesma cota de criação; validação HEX de cores independentes dos botões em configuração e temas.
- Frontend: confirmação de atualização/cópia do tema personalizado; bloqueio e aviso da cota na biblioteca e no modal de salvamento; sufixo `(Cópia)`; suporte a HEX com transparência, mantendo os editores RGB/HSL/HSB e enviando HEX à API; texto escuro sobre a superfície principal clara.
- Os testes existentes de logos, curvatura, botões independentes, isolamento de rascunho, superfícies neutras e Zero-FOUC foram preservados.
- Não foi necessária migration: os campos auditados já existem na base atual.

## Cobertura adicionada

| Cenário | Evidência automatizada |
| --- | --- |
| TC-S1-01 | Teste unitário e HTTP impedem alteração de nome/paleta oficial; exclusão oficial também retorna 403. |
| TC-S1-02 | HTTP cria seis personalizados, verifica nove totais e rejeita criação/duplicação excedente com `THEME_LIMIT_EXCEEDED`. |
| TC-S1-03 | HTTP aplica e exclui tema personalizado; `theme_id` fica nulo e a configuração de cores permanece. |
| TC-S1-04 | HTTP salva e relê os dois valores do vínculo de botões, três campos e HEX de 3/6/8 dígitos; entradas inválidas retornam 422 sem alterar o estado. |
| TC-S1-05 | HTTP verifica 401 sem autenticação e 403 para colaborador nas cinco operações de mutação de temas. |
| TC-S1-06 | Navegador verifica oficiais, criação, duplicação, edição de nome/descrição e exclusão confirmada. |
| TC-S1-07 | Navegador verifica cota 6/6, controles desabilitados e aviso no modal de salvamento. |
| TC-S1-08 | Navegador exige nome para derivar um oficial e cobre atualização/cópia de personalizado, com inspeção das requisições. |
| TC-S1-09 | Navegador descarta apenas cores e salva curvatura/telefone preservados no rascunho. |
| TC-S1-10 | Navegador edita HEX/RGB/HSL/HSB e opacidade, reabre o seletor e verifica preview sem mudança global antes de salvar. |
| TC-S1-11 | Estilos computados dos modais de Processos, paginação disponível, borda ativa da Sidebar e foco do Login. |
| TC-S1-12 | Evento real de armazenamento entre duas abas, atualização dos tokens e contraste sobre fundo claro. |

Arquivos de teste novos/estendidos:

- Frontend: `tests/frontend/themes-and-colors-ui.test.mjs` e fixture `tests/frontend/fixtures/official-themes.mjs`.
- Backend: `tests/unit/modules/office_config/test_theme_service.py`, `tests/e2e/modules/office_config/test_theme_e2e.py` e `tests/e2e/modules/office_config/test_office_config.py`.

Os testes de interface usam o aplicativo React real com API simulada. Os testes HTTP usam FastAPI, autenticação e PostgreSQL temporário real. Isso não substitui a verificação integrada dos ambientes publicados.

## Diferenças entre a descrição da issue e a implementação atual

- A atualização de configuração usa **PATCH /office-config**, não PUT. Foi mantido o contrato existente.
- O terceiro tema oficial da base atual chama-se “Esmeralda & Âmbar Corporativo”; a issue o chama de “Verde Esmeralda & Marfim”. O roteiro usa o nome atual.
- Na base atual, a rota de duplicação não existia e a exclusão de oficial retornava 400. A auditoria acrescenta a rota e padroniza a proteção para 403.
- A biblioteca usa “Criar Novo Tema”, “X/6 temas personalizáveis” e “Confirmar Exclusão”. A edição de metadados ocorre em modal. Os testes seguem esses controles atuais, sem redesenhar a interface.
- Processos mostra “Página X de Y” com setas; não renderiza `.pageActive`. O teste verifica a neutralidade do indicador existente. Notificações atualmente apresenta preferências, sem paginação renderizada. Não foi adicionada paginação fora do escopo. Financeiro, Artigos, Feriados e Usuários têm o botão ativo neutro verificado.
- Frontend e backend são repositórios distintos. A entrega precisa de PRs vinculados, um por repositório, ou de alinhamento com o grupo sobre o requisito de “PR único”. Nenhum PR foi aberto nesta execução.

## Execução local

Use um banco PostgreSQL **descartável e exclusivo para testes**. Os testes HTTP executam migrations e alteram dados; não aponte para Homologação/Produção ou seu banco de trabalho.

Frontend, com Playwright e Chromium instalados:

```sh
node --test --test-concurrency=1 tests/frontend/*.test.mjs
npm run build
```

Se Playwright estiver instalado fora do repositório, configure `PLAYWRIGHT_MODULE_PATH` com o caminho absoluto de `playwright/index.mjs`. Para navegadores em outra pasta, configure `PLAYWRIGHT_BROWSERS_PATH`.

Backend, após instalar `requirements.txt` e `requirements-dev.txt` e configurar as variáveis `POSTGRES_*` do banco temporário:

```sh
SCHEDULER_ENABLED=false PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 python -m pytest tests/unit/modules/office_config tests/integration/modules/office_config tests/e2e/modules/office_config -q --disable-warnings
```

### Resultados locais — 15/11/2026

- Frontend: **57/57 testes passaram** (`node --test`), incluindo os 15 novos cenários desta auditoria.
- Build de produção: **aprovado**. Permanece o aviso de bundle acima de 500 kB.
- Modal de atualização/cópia: conferido visualmente em 1440px e 390px; controles visíveis e cancelamento preservando o rascunho.
- Backend, suíte de configuração/temas: **409/409 testes passaram** com Python 3.10 e PostgreSQL temporário exclusivo.
- Ruff: lint e formatação aprovados nos sete arquivos Python alterados.
- A verificação ampla inicial teve 1.652 aprovações e três falhas preexistentes (lembretes de pagamento e captura de logs após migrations), reproduzidas na base original. Essas correções ficam fora desta entrega; a suíte específica de configuração/temas passou integralmente.

A coleta completa com Python 3.10 falha em quatro testes existentes de usuários, artigos e auditoria que importam `datetime.UTC`, disponível somente a partir do Python 3.11. O Dockerfile usa Python 3.10 e o workflow GitHub usa Python 3.13. Foi preparado um ambiente temporário Python 3.12 para conferir a suíte completa, sem alterar esses módulos ou a configuração do projeto.

## Roteiro manual pendente — TC-S1-13 e TC-S1-14

Status: **não executado em Homologação/Produção**. Necessário informar URLs, acesso administrativo e janela autorizada para alterar a identidade visual global em cada ambiente.

Antes de começar, registrar versão implantada, configuração original e tema ativo. Restaurar essa configuração ao finalizar.

Para cada ambiente e cada tema oficial — Clássico Navy & Wine, Dourado & Ônix Nobre, Esmeralda & Âmbar Corporativo:

- [ ] Aplicar o tema na Personalização e salvar pela barra inferior.
- [ ] Conferir Login, Esqueci Senha, Processos, Clientes, Agenda, Financeiro, Artigos, Usuários, Configurações e Personalização.
- [ ] Conferir textos, foco, hover, ícones, cabeçalhos de ação, modais de consulta e contraste.
- [ ] Confirmar as cores semânticas de valores financeiros e Google Calendar.
- [ ] Abrir outra aba e conferir a atualização após salvar, sem recarregar.
- [ ] Desvincular cores dos botões do sistema, escolher cores diferentes da Landing Page e salvar como tema personalizado quando solicitado.
- [ ] Recarregar `/login` e `/sistema/processos` com Ctrl+F5; observar/gravar o primeiro quadro para verificar ausência de flash de paleta antiga.
- [ ] Restaurar a configuração original e remover somente os temas criados pela auditoria.

| Ambiente | URL/versão | Temas e telas TC-S1-13 | Botões/Zero-FOUC TC-S1-14 | Evidências e responsável |
| --- | --- | --- | --- | --- |
| Homologação | A informar | Pendente | Pendente | A informar |
| Produção | A informar | Pendente | Pendente | A informar |

## Checklist de entrega

- [x] Registrar os resultados locais de frontend, build e suíte de configuração/temas.
- [ ] Alinhar e vincular PRs dos dois repositórios à issue.
- [ ] Executar e documentar o roteiro em Homologação.
- [ ] Executar e documentar o roteiro em Produção na janela autorizada.

A issue não deve ser marcada como concluída enquanto os itens de ambiente e entrega estiverem pendentes.

## Texto proposto para o PR do frontend

**Título:** test: avaliação cruzada de temas, cores e sincronização global

Audita US07, US09/US10 e US14 com 15 novos cenários de interface. Corrige a perda de transparência e a emissão de formatos incompatíveis no ColorPicker, oferece atualização ou cópia ao salvar temas personalizados, apresenta o bloqueio da cota e ajusta o contraste da superfície principal clara.

Validação local: 57 testes de interface aprovados, build aprovado e modal conferido em desktop/celular. Os testes HTTP e as correções da API estão na branch de mesmo nome do backend. A validação em Homologação/Produção permanece pendente conforme o roteiro deste documento.
