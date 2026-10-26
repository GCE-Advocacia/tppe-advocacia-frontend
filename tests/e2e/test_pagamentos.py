from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from conftest import BASE_URL, pause

PAGAMENTOS_URL = f"{BASE_URL}/sistema/pagamentos"

MENU_PAGAMENTOS = (By.CSS_SELECTOR, "a[href='/sistema/pagamentos']")
TITULO_CALENDARIO = (By.XPATH, "//h1[contains(text(),'Calendário de Pagamentos')]")
BOTAO_NOVO_VENCIMENTO = (By.XPATH, "//button[contains(., 'Novo Vencimento')]")
SEM_PERMISSAO = "Você não tem permissão para acessar esta área."


def _abrir_calendario(driver, wait):
    driver.get(PAGAMENTOS_URL)
    wait.until(EC.presence_of_element_located(TITULO_CALENDARIO))
    wait.until(EC.presence_of_element_located(
        (By.XPATH, "//*[normalize-space(text())='DOM']")
    ))
    pause()


# ─────────────────────────────────────────────────────────────────────────────
class TestCalendarioPagamentos:
    """US01 — Administrador visualiza o calendário e cadastra vencimentos.
    O acesso de funcionários por aba é coberto em test_permissoes.py."""

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
