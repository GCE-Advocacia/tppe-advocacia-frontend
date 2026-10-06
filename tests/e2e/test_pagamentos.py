import pytest
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from conftest import (
    BASE_URL, TEST_USER_EMAIL, TEST_USER_PASSWORD, do_login, do_logout, pause,
)

PAGAMENTOS_URL = f"{BASE_URL}/sistema/pagamentos"
USUARIOS_URL = f"{BASE_URL}/sistema/usuarios"

MENU_PAGAMENTOS = (By.CSS_SELECTOR, "a[href='/sistema/pagamentos']")
TITULO_CALENDARIO = (By.XPATH, "//h1[contains(text(),'Calendário de Pagamentos')]")
BOTAO_NOVO_VENCIMENTO = (By.XPATH, "//button[contains(., 'Novo Vencimento')]")
CHECKBOX_PERMISSAO = (By.ID, "usuario-pode-ver-vencimentos")
SEM_PERMISSAO = "Você não tem permissão para visualizar vencimentos."


def js_click(driver, element):
    driver.execute_script("arguments[0].click();", element)


def _abrir_calendario(driver, wait):
    driver.get(PAGAMENTOS_URL)
    wait.until(EC.presence_of_element_located(TITULO_CALENDARIO))
    wait.until(EC.presence_of_element_located(
        (By.XPATH, "//*[normalize-space(text())='DOM']")
    ))
    pause()


def _definir_permissao(driver, wait, permitido: bool):
    """Como admin, marca/desmarca 'Pode visualizar vencimentos' do funcionário
    TEST_USER_EMAIL na tela Usuários e encerra a sessão do admin."""
    if not TEST_USER_EMAIL or not TEST_USER_PASSWORD:
        pytest.skip("TEST_USER_EMAIL/TEST_USER_PASSWORD não definidos")

    do_login(driver, wait)
    driver.get(USUARIOS_URL)
    try:
        linha = wait.until(EC.presence_of_element_located(
            (By.XPATH, f"//tbody/tr[td[normalize-space()='{TEST_USER_EMAIL}']]")
        ))
    except TimeoutException:
        do_logout(driver)
        pytest.skip(f"{TEST_USER_EMAIL} não está na primeira página de Usuários")
    pause()

    js_click(driver, linha.find_element(By.CSS_SELECTOR, "button[title='Editar']"))
    checkbox = wait.until(EC.presence_of_element_located(CHECKBOX_PERMISSAO))
    pause()
    if checkbox.is_selected() != permitido:
        js_click(driver, checkbox)
        pause()
    js_click(driver, driver.find_element(By.XPATH, "//button[contains(., 'Salvar')]"))
    wait.until(EC.invisibility_of_element_located(CHECKBOX_PERMISSAO))
    pause()
    do_logout(driver)


@pytest.fixture
def usuario_sem_permissao(request, driver, wait):
    _definir_permissao(driver, wait, False)
    return request.getfixturevalue("logged_in_user")


@pytest.fixture
def usuario_com_permissao(request, driver, wait):
    _definir_permissao(driver, wait, True)
    return request.getfixturevalue("logged_in_user")


# ─────────────────────────────────────────────────────────────────────────────
class TestCalendarioPagamentos:
    """US01 — Administrador visualiza o calendário e cadastra vencimentos"""

    def test_menu_pagamentos_visivel_para_admin(self, logged_in, wait):
        wait.until(EC.presence_of_element_located(MENU_PAGAMENTOS))
        pause()
        assert logged_in.find_element(*MENU_PAGAMENTOS).is_displayed()

    def test_calendario_carrega_para_admin(self, logged_in, wait):
        _abrir_calendario(logged_in, wait)
        assert "Calendário de Pagamentos" in logged_in.page_source
        assert SEM_PERMISSAO not in logged_in.page_source

    def test_botao_novo_vencimento_visivel_para_admin(self, logged_in, wait):
        _abrir_calendario(logged_in, wait)
        assert logged_in.find_element(*BOTAO_NOVO_VENCIMENTO).is_displayed()


# ─────────────────────────────────────────────────────────────────────────────
class TestPermissaoVisualizarVencimentos:
    """US01 — Apenas administradores e funcionários autorizados visualizam os
    vencimentos; apenas administradores cadastram, alteram ou excluem.

    Requer TEST_USER_EMAIL/TEST_USER_PASSWORD de um funcionário (papel USER,
    ativo) listado na primeira página da tela Usuários. As fixtures ajustam
    'Pode visualizar vencimentos' desse funcionário via tela Usuários com o
    admin (TEST_EMAIL/TEST_PASSWORD) antes de logar como ele."""

    def test_menu_pagamentos_oculto_sem_permissao(self, usuario_sem_permissao, wait):
        wait.until(EC.url_contains("/sistema"))
        pause()
        assert usuario_sem_permissao.find_elements(*MENU_PAGAMENTOS) == []

    def test_url_direta_redireciona_sem_permissao(self, usuario_sem_permissao, wait):
        usuario_sem_permissao.get(PAGAMENTOS_URL)
        wait.until(EC.url_contains("/sistema/clientes"))
        pause()
        assert "/sistema/pagamentos" not in usuario_sem_permissao.current_url
        assert usuario_sem_permissao.find_elements(*TITULO_CALENDARIO) == []

    def test_menu_pagamentos_visivel_com_permissao(self, usuario_com_permissao, wait):
        wait.until(EC.presence_of_element_located(MENU_PAGAMENTOS))
        pause()
        assert usuario_com_permissao.find_element(*MENU_PAGAMENTOS).is_displayed()

    def test_calendario_sem_novo_vencimento_com_permissao(self, usuario_com_permissao, wait):
        _abrir_calendario(usuario_com_permissao, wait)
        assert SEM_PERMISSAO not in usuario_com_permissao.page_source
        assert usuario_com_permissao.find_elements(*BOTAO_NOVO_VENCIMENTO) == []
