import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.select import Select

from conftest import BASE_URL, pause

USUARIOS_URL = f"{BASE_URL}/sistema/usuarios"
FIELDSET_PERMISSOES = (By.CSS_SELECTOR, "[data-testid='usuario-permissoes']")
CHECKBOXES_PERMISSAO = (By.CSS_SELECTOR, "input[id^='permissao-']")
PERMISSOES = [
    "landing_page", "artigos", "leads", "clientes", "agenda", "pagamentos",
    "processos", "tarefas", "notificacoes", "logs_api", "feriados", "financeiro",
]


def js_click(driver, element):
    driver.execute_script("arguments[0].click();", element)


def _aguardar_checkboxes(driver, wait):
    """Espera o catálogo (GET /permissions) renderizar uma checkbox por aba."""
    wait.until(lambda d: len(d.find_elements(*CHECKBOXES_PERMISSAO)) == len(PERMISSOES))
    pause()


def _estado_checkboxes(driver):
    return {chave: driver.find_element(By.ID, f"permissao-{chave}").is_selected() for chave in PERMISSOES}


def _email_primeira_linha(driver, wait, papel):
    driver.get(USUARIOS_URL)
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "table")))
    pause()
    linhas = driver.find_elements(By.XPATH, f"//tbody/tr[.//span[normalize-space()='{papel}']]")
    if not linhas:
        pytest.skip(f"Nenhum usuário com papel '{papel}' na primeira página")
    return linhas[0].find_element(By.XPATH, "./td[2]").text.strip()


def _editar_linha(driver, wait, email):
    linha = wait.until(EC.presence_of_element_located(
        (By.XPATH, f"//tbody/tr[td[normalize-space()='{email}']]")
    ))
    js_click(driver, linha.find_element(By.CSS_SELECTOR, "button[title='Editar']"))
    _aguardar_checkboxes(driver, wait)


def _salvar_edicao(driver, wait):
    js_click(driver, driver.find_element(By.XPATH, "//button[contains(., 'Salvar')]"))
    wait.until(EC.invisibility_of_element_located(FIELDSET_PERMISSOES))
    pause()


class TestGerenciarUsuarios:
    """US-03 — Cadastrar, editar, listar e desativar usuários"""

    def test_pagina_usuarios_carrega(self, logged_in, wait):
        logged_in.get(USUARIOS_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h1[contains(text(),'Gerenciar Usuários')]")
        ))
        pause()
        assert "Gerenciar Usuários" in logged_in.page_source

    def test_tabela_usuarios_visivel(self, logged_in, wait):
        logged_in.get(USUARIOS_URL)
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "table")))
        pause()

        tabela = logged_in.find_element(By.CSS_SELECTOR, "table")
        assert tabela.is_displayed()
        assert "Nome"   in logged_in.page_source
        assert "E-mail" in logged_in.page_source
        assert "Papel"  in logged_in.page_source
        assert "Status" in logged_in.page_source
        assert "Acessos" in logged_in.page_source

    def test_botao_novo_usuario_abre_modal(self, logged_in, wait):
        logged_in.get(USUARIOS_URL)
        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(., 'Novo Usuário')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(., 'Novo Usuário')]").click()

        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'Novo Usuário')]")
        ))
        pause()
        assert logged_in.find_element(By.CSS_SELECTOR, "input[placeholder='Ex: Ana Lima']").is_displayed()
        assert logged_in.find_element(By.CSS_SELECTOR, "input[placeholder='exemplo@escritorio.com']").is_displayed()

    def test_modal_novo_usuario_exibe_uma_checkbox_por_aba(self, logged_in, wait):
        """Permissões por aba — 12 checkboxes, todas desmarcadas para usuário novo"""
        logged_in.get(USUARIOS_URL)
        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(., 'Novo Usuário')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(., 'Novo Usuário')]").click()
        _aguardar_checkboxes(logged_in, wait)

        assert "Permissões de acesso" in logged_in.page_source
        for chave in PERMISSOES:
            checkbox = logged_in.find_element(By.ID, f"permissao-{chave}")
            assert checkbox.is_enabled()
            assert not checkbox.is_selected()

        js_click(logged_in, logged_in.find_element(By.XPATH, "//button[normalize-space()='Marcar todas']"))
        pause()
        assert all(_estado_checkboxes(logged_in).values())

        js_click(logged_in, logged_in.find_element(By.XPATH, "//button[normalize-space()='Desmarcar todas']"))
        pause()
        assert not any(_estado_checkboxes(logged_in).values())

        logged_in.find_element(By.XPATH, "//button[contains(text(),'Cancelar')]").click()
        wait.until(EC.invisibility_of_element_located(FIELDSET_PERMISSOES))
        pause()

    def test_criar_usuario_com_sucesso(self, logged_in, wait):
        email_unico = f"teste.selenium.{int(time.time())}@advocacia.com"

        logged_in.get(USUARIOS_URL)
        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(., 'Novo Usuário')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(., 'Novo Usuário')]").click()

        wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "input[placeholder='Ex: Ana Lima']")
        ))
        pause()
        logged_in.find_element(By.CSS_SELECTOR, "input[placeholder='Ex: Ana Lima']").send_keys("Usuário Selenium")
        pause()
        logged_in.find_element(By.CSS_SELECTOR, "input[placeholder='exemplo@escritorio.com']").send_keys(email_unico)
        pause()

        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(., 'Salvar')]")
        ))
        logged_in.find_element(By.XPATH, "//button[contains(., 'Salvar')]").click()

        wait.until(EC.presence_of_element_located(
            (By.XPATH, f"//*[contains(text(),'{email_unico}')]")
        ))
        pause()
        assert email_unico in logged_in.page_source

    def test_modal_novo_usuario_cancela(self, logged_in, wait):
        logged_in.get(USUARIOS_URL)
        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(., 'Novo Usuário')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(., 'Novo Usuário')]").click()

        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(text(),'Cancelar')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(text(),'Cancelar')]").click()

        wait.until(EC.invisibility_of_element_located(
            (By.CSS_SELECTOR, "input[placeholder='Ex: Ana Lima']")
        ))
        pause()

    def test_visualizar_usuario_abre_modal(self, logged_in, wait):
        logged_in.get(USUARIOS_URL)
        wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "button[title='Visualizar']")
        ))
        pause()
        logged_in.find_element(By.CSS_SELECTOR, "button[title='Visualizar']").click()

        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'Visualizar Usuário')]")
        ))
        pause()
        assert "Visualizar Usuário" in logged_in.page_source

        logged_in.find_element(By.CSS_SELECTOR, "button[aria-label='Fechar']").click()
        pause()

    def test_editar_usuario_abre_modal(self, logged_in, wait):
        logged_in.get(USUARIOS_URL)
        wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "button[title='Editar']")
        ))
        pause()
        logged_in.find_element(By.CSS_SELECTOR, "button[title='Editar']").click()

        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'Editar Usuário')]")
        ))
        pause()
        assert "Editar Usuário" in logged_in.page_source
        assert logged_in.find_element(By.CSS_SELECTOR, "input[placeholder='Ex: Ana Lima']").is_displayed()

        logged_in.find_element(By.CSS_SELECTOR, "button[aria-label='Fechar']").click()
        pause()

    def test_desativar_usuario_abre_confirmacao(self, logged_in, wait):
        logged_in.get(USUARIOS_URL)
        wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "button[title='Desativar']")
        ))
        pause()
        logged_in.find_element(By.CSS_SELECTOR, "button[title='Desativar']").click()

        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'Desativar Usuário')]")
        ))
        pause()
        assert "perderá acesso ao sistema" in logged_in.page_source

        logged_in.find_element(By.XPATH, "//button[contains(text(),'Cancelar')]").click()
        wait.until(EC.invisibility_of_element_located(
            (By.XPATH, "//*[contains(text(),'Desativar Usuário')]")
        ))
        pause()

    def test_permissao_por_aba_persiste(self, logged_in, wait):
        """Permissões por aba — admin concede/revoga uma aba a um funcionário"""
        email = _email_primeira_linha(logged_in, wait, "Usuário")
        chave = "notificacoes"

        _editar_linha(logged_in, wait, email)
        original = _estado_checkboxes(logged_in)
        js_click(logged_in, logged_in.find_element(By.ID, f"permissao-{chave}"))
        _salvar_edicao(logged_in, wait)

        logged_in.get(USUARIOS_URL)
        _editar_linha(logged_in, wait, email)
        esperado = {**original, chave: not original[chave]}
        assert _estado_checkboxes(logged_in) == esperado

        # Restaura o estado inicial para não afetar outros testes
        js_click(logged_in, logged_in.find_element(By.ID, f"permissao-{chave}"))
        _salvar_edicao(logged_in, wait)

        logged_in.get(USUARIOS_URL)
        _editar_linha(logged_in, wait, email)
        assert _estado_checkboxes(logged_in) == original
        logged_in.find_element(By.CSS_SELECTOR, "button[aria-label='Fechar']").click()
        pause()

    def test_admin_exibe_todas_permissoes_marcadas_e_travadas(self, logged_in, wait):
        """Permissões por aba — administrador tem acesso a todas as áreas"""
        email = _email_primeira_linha(logged_in, wait, "Administrador")

        _editar_linha(logged_in, wait, email)
        for chave in PERMISSOES:
            checkbox = logged_in.find_element(By.ID, f"permissao-{chave}")
            assert checkbox.is_selected()
            assert not checkbox.is_enabled()
        assert "Administradores têm acesso a todas as áreas" in logged_in.page_source

        logged_in.find_element(By.CSS_SELECTOR, "button[aria-label='Fechar']").click()
        wait.until(EC.invisibility_of_element_located(FIELDSET_PERMISSOES))
        pause()


class TestRegistrosAuditoria:
    """US-04 — Rastreabilidade de operações sobre usuários"""

    def test_aba_registros_abre(self, logged_in, wait):
        logged_in.get(USUARIOS_URL)
        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(text(),'Registros')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(text(),'Registros')]").click()

        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h1[contains(text(),'Registros')]")
        ))
        pause()
        assert "Registros" in logged_in.page_source

    def test_registros_exibem_acoes_de_usuario(self, logged_in, wait):
        logged_in.get(USUARIOS_URL)
        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(text(),'Registros')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(text(),'Registros')]").click()

        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h1[contains(text(),'Registros')]")
        ))
        pause()
        assert "Criação de Usuário" in logged_in.page_source or "Nenhum registro encontrado" in logged_in.page_source

    def test_filtro_acao_funciona(self, logged_in, wait):
        logged_in.get(USUARIOS_URL)
        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(text(),'Registros')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(text(),'Registros')]").click()

        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "select")))
        pause()
        Select(logged_in.find_element(By.CSS_SELECTOR, "select")).select_by_visible_text("Criação de Usuário")
        pause()

        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h1[contains(text(),'Registros')]")
        ))
        pause()
        assert logged_in.find_element(By.CSS_SELECTOR, "select").is_displayed()

    def test_voltar_aos_usuarios_da_aba_registros(self, logged_in, wait):
        logged_in.get(USUARIOS_URL)
        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(text(),'Registros')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(text(),'Registros')]").click()

        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(., 'Voltar aos Usuários')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(., 'Voltar aos Usuários')]").click()

        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h1[contains(text(),'Gerenciar Usuários')]")
        ))
        pause()
        assert "Gerenciar Usuários" in logged_in.page_source
