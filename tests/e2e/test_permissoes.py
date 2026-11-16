"""Permissões por aba do /sistema (substitui a permissão única de vencimentos).

Requer TEST_USER_EMAIL/TEST_USER_PASSWORD de um funcionário (papel USER, ativo)
listado na primeira página da tela Usuários. As fixtures definem as abas desse
funcionário pela tela Usuários com o admin (TEST_EMAIL/TEST_PASSWORD), logam
como ele e, ao final, restauram as abas que ele tinha antes.
"""
from urllib.parse import urlparse

import pytest
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from conftest import (
    BASE_URL, TEST_USER_EMAIL, TEST_USER_PASSWORD, do_login, do_logout, pause,
)

USUARIOS_URL = f"{BASE_URL}/sistema/usuarios"
SISTEMA_URL = f"{BASE_URL}/sistema"
SEM_ACESSO_PATH = "/sistema/sem-acesso"
SEM_ACESSO_TEXTO = "Você ainda não tem acesso a nenhuma área. Fale com o administrador."

PERMISSOES = [
    "landing_page", "artigos", "leads", "clientes", "agenda", "pagamentos",
    "processos", "tarefas", "notificacoes", "logs_api", "feriados", "financeiro",
]
ABA_LIBERADA = "clientes"
ABA_LIBERADA_PATH = "/sistema/clientes"

FIELDSET_PERMISSOES = (By.CSS_SELECTOR, "[data-testid='usuario-permissoes']")
CHECKBOXES_PERMISSAO = (By.CSS_SELECTOR, "input[id^='permissao-']")
LINKS_MENU = (By.CSS_SELECTOR, "aside nav a")


def js_click(driver, element):
    driver.execute_script("arguments[0].click();", element)


def _definir_permissoes(driver, wait, chaves):
    """Como admin, deixa marcadas exatamente as abas `chaves` do funcionário
    TEST_USER_EMAIL, encerra a sessão do admin e devolve as abas anteriores."""
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
    wait.until(lambda d: len(d.find_elements(*CHECKBOXES_PERMISSAO)) == len(PERMISSOES))
    pause()
    anteriores = {
        chave for chave in PERMISSOES
        if driver.find_element(By.ID, f"permissao-{chave}").is_selected()
    }

    js_click(driver, driver.find_element(By.XPATH, "//button[normalize-space()='Desmarcar todas']"))
    for chave in chaves:
        js_click(driver, driver.find_element(By.ID, f"permissao-{chave}"))
    pause()
    js_click(driver, driver.find_element(By.XPATH, "//button[contains(., 'Salvar')]"))
    wait.until(EC.invisibility_of_element_located(FIELDSET_PERMISSOES))
    pause()
    do_logout(driver)
    return anteriores


def _sessao_funcionario(request, driver, wait, chaves):
    anteriores = _definir_permissoes(driver, wait, chaves)
    yield request.getfixturevalue("logged_in_user")
    do_logout(driver)
    _definir_permissoes(driver, wait, anteriores)


@pytest.fixture
def funcionario_com_uma_aba(request, driver, wait):
    yield from _sessao_funcionario(request, driver, wait, {ABA_LIBERADA})


@pytest.fixture
def funcionario_sem_abas(request, driver, wait):
    yield from _sessao_funcionario(request, driver, wait, set())


def _caminhos_menu(driver):
    return [urlparse(link.get_attribute("href")).path for link in driver.find_elements(*LINKS_MENU)]


# ─────────────────────────────────────────────────────────────────────────────
class TestFuncionarioComUmaAba:
    """Funcionário só com a aba Clientes vê e acessa somente ela."""

    def test_menu_exibe_somente_a_aba_liberada(self, funcionario_com_uma_aba, wait):
        wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, f"aside nav a[href='{ABA_LIBERADA_PATH}']")
        ))
        pause()
        assert _caminhos_menu(funcionario_com_uma_aba) == [ABA_LIBERADA_PATH]

    def test_sistema_redireciona_para_a_aba_liberada(self, funcionario_com_uma_aba, wait):
        funcionario_com_uma_aba.get(SISTEMA_URL)
        wait.until(EC.url_contains(ABA_LIBERADA_PATH))
        pause()
        assert urlparse(funcionario_com_uma_aba.current_url).path == ABA_LIBERADA_PATH

    @pytest.mark.parametrize("caminho", ["pagamentos", "tarefas", "financeiro", "usuarios"])
    def test_url_direta_de_outra_aba_redireciona(self, funcionario_com_uma_aba, wait, caminho):
        funcionario_com_uma_aba.get(f"{SISTEMA_URL}/{caminho}")
        wait.until(EC.url_contains(ABA_LIBERADA_PATH))
        pause()
        assert f"/sistema/{caminho}" not in funcionario_com_uma_aba.current_url


# ─────────────────────────────────────────────────────────────────────────────
class TestFuncionarioSemAbas:
    """Funcionário sem nenhuma aba cai na página "sem acesso", sem loop."""

    def test_sistema_exibe_pagina_sem_acesso(self, funcionario_sem_abas, wait):
        funcionario_sem_abas.get(SISTEMA_URL)
        wait.until(EC.url_contains(SEM_ACESSO_PATH))
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "[data-testid='sem-acesso']")))
        pause()
        assert SEM_ACESSO_TEXTO in funcionario_sem_abas.page_source
        assert _caminhos_menu(funcionario_sem_abas) == []

    def test_url_direta_redireciona_para_sem_acesso(self, funcionario_sem_abas, wait):
        funcionario_sem_abas.get(f"{SISTEMA_URL}/{ABA_LIBERADA}")
        wait.until(EC.url_contains(SEM_ACESSO_PATH))
        pause()
        assert urlparse(funcionario_sem_abas.current_url).path == SEM_ACESSO_PATH
