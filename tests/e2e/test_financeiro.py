import random
import re
import time
from datetime import date

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from conftest import BASE_URL, pause

FINANCEIRO_URL = f"{BASE_URL}/sistema/financeiro"

ERRO_CARGA = "Não foi possível carregar os lançamentos financeiros."


def js_click(driver, element):
    driver.execute_script("arguments[0].click();", element)


def scroll_and_click(driver, element):
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", element)
    time.sleep(0.3)
    driver.execute_script("arguments[0].click();", element)


def set_date_input(driver, element, date_str: str):
    """Aciona o onChange do React usando o native value setter."""
    driver.execute_script(
        "const nativeSet = Object.getOwnPropertyDescriptor("
        "  window.HTMLInputElement.prototype, 'value').set;"
        "nativeSet.call(arguments[0], arguments[1]);"
        "arguments[0].dispatchEvent(new Event('input',  {bubbles: true}));"
        "arguments[0].dispatchEvent(new Event('change', {bubbles: true}));",
        element, date_str,
    )


def _para_float(texto: str) -> float:
    """Converte 'R$ 1.500,50' (ou '- R$ 1.500,50') em float."""
    limpo = re.sub(r"[^\d,.-]", "", texto)
    limpo = limpo.replace(".", "").replace(",", ".")
    return float(limpo)


def _dia_isolado() -> str:
    """Data única por execução, para isolar os lançamentos do teste."""
    return date(2021, random.randint(1, 12), random.randint(1, 28)).isoformat()


def _abrir_financeiro(driver, wait):
    driver.get(FINANCEIRO_URL)
    wait.until(EC.presence_of_element_located(
        (By.XPATH, "//h1[contains(text(),'Controle Financeiro')]")
    ))
    _esperar_carga(driver, wait)
    pause()


def _esperar_carga(driver, wait):
    wait.until(EC.invisibility_of_element_located(
        (By.XPATH, "//*[normalize-space(text())='Carregando...']")
    ))


def _pular_se_api_indisponivel(driver):
    if ERRO_CARGA in driver.page_source:
        pytest.skip("API financeira indisponível")


def _campos_data_do_filtro(driver):
    """Os dois primeiros inputs de data da página são De e Até."""
    return driver.find_elements(By.CSS_SELECTOR, "input[type='date']")[:2]


def _aplicar_periodo(driver, wait, de: str, ate: str):
    campo_de, campo_ate = _campos_data_do_filtro(driver)
    set_date_input(driver, campo_de, de)
    time.sleep(0.3)
    set_date_input(driver, campo_ate, ate)
    _esperar_carga(driver, wait)
    pause()


def _valor_card(driver, rotulo: str) -> str:
    return driver.find_element(
        By.XPATH, f"//p[normalize-space(text())='{rotulo}']/following-sibling::p[1]"
    ).text


def _totais(driver) -> dict:
    return {
        "entradas": _para_float(_valor_card(driver, "Total de Entradas")),
        "saidas":   _para_float(_valor_card(driver, "Total de Saídas")),
        "saldo":    _para_float(_valor_card(driver, "Saldo")),
    }


def _criar_lancamento(driver, wait, botao: str, descricao: str, valor: str, data: str):
    """botao: 'Nova Entrada' ou 'Nova Saída'. valor pode usar vírgula."""
    js_click(driver, wait.until(EC.element_to_be_clickable(
        (By.XPATH, f"//button[contains(.,'{botao}')]")
    )))
    wait.until(EC.presence_of_element_located(
        (By.CSS_SELECTOR, "input[placeholder='0,00']")
    ))
    pause()

    driver.find_element(
        By.CSS_SELECTOR, "input[placeholder*='Honorários']"
    ).send_keys(descricao)
    driver.find_element(By.CSS_SELECTOR, "input[placeholder='0,00']").send_keys(valor)
    # O modal é renderizado por último: o input de data dele é o do fim da lista.
    campo_data = driver.find_elements(By.CSS_SELECTOR, "input[type='date']")[-1]
    set_date_input(driver, campo_data, data)
    pause()

    scroll_and_click(driver, driver.find_element(
        By.XPATH, "//button[contains(.,'Salvar')]"
    ))
    wait.until(EC.invisibility_of_element_located(
        (By.XPATH, "//button[normalize-space(text())='Cancelar']")
    ))
    _esperar_carga(driver, wait)
    pause()


# ─────────────────────────────────────────────────────────────────────────────
class TestCadastrarEntrada:
    """US-03 — Registrar entradas financeiras do escritório"""

    def test_pagina_financeiro_carrega(self, logged_in, wait):
        _abrir_financeiro(logged_in, wait)
        assert "Controle Financeiro" in logged_in.page_source

    def test_tabela_exibe_colunas_esperadas(self, logged_in, wait):
        _abrir_financeiro(logged_in, wait)
        _pular_se_api_indisponivel(logged_in)
        for coluna in ("Data", "Descrição", "Tipo", "Valor"):
            assert coluna in logged_in.page_source

    def test_botao_nova_entrada_visivel(self, logged_in, wait):
        _abrir_financeiro(logged_in, wait)
        assert logged_in.find_element(
            By.XPATH, "//button[contains(.,'Nova Entrada')]"
        ).is_displayed()

    def test_botao_nova_entrada_abre_modal(self, logged_in, wait):
        _abrir_financeiro(logged_in, wait)
        js_click(logged_in, logged_in.find_element(
            By.XPATH, "//button[contains(.,'Nova Entrada')]"
        ))
        wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "input[placeholder='0,00']")
        ))
        pause()
        assert "Nova Entrada" in logged_in.page_source

    def test_modal_exibe_campos_do_lancamento(self, logged_in, wait):
        _abrir_financeiro(logged_in, wait)
        js_click(logged_in, logged_in.find_element(
            By.XPATH, "//button[contains(.,'Nova Entrada')]"
        ))
        wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "input[placeholder='0,00']")
        ))
        pause()
        for campo in ("Descrição", "Valor (R$)", "Data"):
            assert campo in logged_in.page_source

    def test_cancelar_fecha_modal(self, logged_in, wait):
        _abrir_financeiro(logged_in, wait)
        js_click(logged_in, logged_in.find_element(
            By.XPATH, "//button[contains(.,'Nova Entrada')]"
        ))
        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[normalize-space(text())='Cancelar']")
        ))
        pause()
        logged_in.find_element(
            By.XPATH, "//button[normalize-space(text())='Cancelar']"
        ).click()
        wait.until(EC.invisibility_of_element_located(
            (By.CSS_SELECTOR, "input[placeholder='0,00']")
        ))
        pause()

    def test_descricao_obrigatoria_bloqueia_salvamento(self, logged_in, wait):
        _abrir_financeiro(logged_in, wait)
        js_click(logged_in, logged_in.find_element(
            By.XPATH, "//button[contains(.,'Nova Entrada')]"
        ))
        wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "input[placeholder='0,00']")
        ))
        pause()
        scroll_and_click(logged_in, logged_in.find_element(
            By.XPATH, "//button[contains(.,'Salvar')]"
        ))
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'Descrição é obrigatória')]")
        ))
        pause()
        assert "Descrição é obrigatória." in logged_in.page_source

    def test_valor_invalido_exibe_mensagem(self, logged_in, wait):
        _abrir_financeiro(logged_in, wait)
        js_click(logged_in, logged_in.find_element(
            By.XPATH, "//button[contains(.,'Nova Entrada')]"
        ))
        wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "input[placeholder='0,00']")
        ))
        pause()
        logged_in.find_element(
            By.CSS_SELECTOR, "input[placeholder*='Honorários']"
        ).send_keys("Consultoria")
        logged_in.find_element(
            By.CSS_SELECTOR, "input[placeholder='0,00']"
        ).send_keys("abc")
        scroll_and_click(logged_in, logged_in.find_element(
            By.XPATH, "//button[contains(.,'Salvar')]"
        ))
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'Valor inválido')]")
        ))
        pause()
        assert "Valor inválido" in logged_in.page_source

    def test_cadastrar_entrada_com_virgula_aparece_na_listagem(self, logged_in, wait):
        _abrir_financeiro(logged_in, wait)
        _pular_se_api_indisponivel(logged_in)

        dia = _dia_isolado()
        descricao = f"Honorários contratuais {random.randint(1000, 9999)}"
        _criar_lancamento(logged_in, wait, "Nova Entrada", descricao, "1500,50", dia)

        _aplicar_periodo(logged_in, wait, dia, dia)
        assert descricao in logged_in.page_source
        assert "1.500,50" in logged_in.page_source

    def test_entrada_exibe_badge_de_entrada(self, logged_in, wait):
        _abrir_financeiro(logged_in, wait)
        _pular_se_api_indisponivel(logged_in)

        dia = _dia_isolado()
        descricao = f"Adiantamento {random.randint(1000, 9999)}"
        _criar_lancamento(logged_in, wait, "Nova Entrada", descricao, "300,00", dia)

        _aplicar_periodo(logged_in, wait, dia, dia)
        linha = logged_in.find_element(
            By.XPATH, f"//tr[td[contains(text(),'{descricao}')]]"
        )
        assert "Entrada" in linha.text


# ─────────────────────────────────────────────────────────────────────────────
class TestCadastrarSaida:
    """US-03 — Registrar saídas financeiras do escritório"""

    def test_botao_nova_saida_visivel(self, logged_in, wait):
        _abrir_financeiro(logged_in, wait)
        assert logged_in.find_element(
            By.XPATH, "//button[contains(.,'Nova Saída')]"
        ).is_displayed()

    def test_botao_nova_saida_abre_o_mesmo_formulario(self, logged_in, wait):
        _abrir_financeiro(logged_in, wait)
        js_click(logged_in, logged_in.find_element(
            By.XPATH, "//button[contains(.,'Nova Saída')]"
        ))
        wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "input[placeholder='0,00']")
        ))
        pause()
        for campo in ("Descrição", "Valor (R$)", "Data"):
            assert campo in logged_in.page_source

    def test_cadastrar_saida_aparece_na_listagem(self, logged_in, wait):
        _abrir_financeiro(logged_in, wait)
        _pular_se_api_indisponivel(logged_in)

        dia = _dia_isolado()
        descricao = f"Aluguel do escritório {random.randint(1000, 9999)}"
        _criar_lancamento(logged_in, wait, "Nova Saída", descricao, "200,25", dia)

        _aplicar_periodo(logged_in, wait, dia, dia)
        assert descricao in logged_in.page_source
        assert "200,25" in logged_in.page_source

    def test_saida_exibe_badge_de_saida(self, logged_in, wait):
        _abrir_financeiro(logged_in, wait)
        _pular_se_api_indisponivel(logged_in)

        dia = _dia_isolado()
        descricao = f"Custas processuais {random.randint(1000, 9999)}"
        _criar_lancamento(logged_in, wait, "Nova Saída", descricao, "80,00", dia)

        _aplicar_periodo(logged_in, wait, dia, dia)
        linha = logged_in.find_element(
            By.XPATH, f"//tr[td[contains(text(),'{descricao}')]]"
        )
        assert "Saída" in linha.text


# ─────────────────────────────────────────────────────────────────────────────
class TestFiltrarPorPeriodo:
    """US-03 — Filtrar lançamentos por período (datas inclusivas)"""

    def test_campos_de_e_ate_visiveis(self, logged_in, wait):
        _abrir_financeiro(logged_in, wait)
        assert "De"  in logged_in.page_source
        assert "Até" in logged_in.page_source
        assert len(_campos_data_do_filtro(logged_in)) == 2

    def test_filtro_restringe_listagem_ao_periodo(self, logged_in, wait):
        _abrir_financeiro(logged_in, wait)
        _pular_se_api_indisponivel(logged_in)

        dia = _dia_isolado()
        descricao = f"Consultoria avulsa {random.randint(1000, 9999)}"
        _criar_lancamento(logged_in, wait, "Nova Entrada", descricao, "450,00", dia)

        _aplicar_periodo(logged_in, wait, dia, dia)
        assert descricao in logged_in.page_source

        # Um período que não contém a data do lançamento não deve exibi-lo.
        outro = date(2019, 6, 1).isoformat()
        _aplicar_periodo(logged_in, wait, outro, outro)
        assert descricao not in logged_in.page_source

    def test_botao_limpar_remove_o_filtro(self, logged_in, wait):
        _abrir_financeiro(logged_in, wait)
        _pular_se_api_indisponivel(logged_in)

        dia = _dia_isolado()
        _aplicar_periodo(logged_in, wait, dia, dia)
        assert "Limpar" in logged_in.page_source

        scroll_and_click(logged_in, logged_in.find_element(
            By.XPATH, "//button[contains(.,'Limpar')]"
        ))
        _esperar_carga(logged_in, wait)
        pause()

        campo_de, campo_ate = _campos_data_do_filtro(logged_in)
        assert campo_de.get_attribute("value")  == ""
        assert campo_ate.get_attribute("value") == ""

    def test_filtro_volta_para_a_primeira_pagina(self, logged_in, wait):
        _abrir_financeiro(logged_in, wait)
        _pular_se_api_indisponivel(logged_in)

        paginas = logged_in.find_elements(By.XPATH, "//button[normalize-space(text())='2']")
        if not paginas:
            pytest.skip("Sem lançamentos suficientes para paginar")

        scroll_and_click(logged_in, paginas[0])
        _esperar_carga(logged_in, wait)
        pause()

        dia = _dia_isolado()
        _aplicar_periodo(logged_in, wait, dia, dia)

        ativa = logged_in.find_element(
            By.XPATH, "//button[normalize-space(text())='1']"
        )
        assert "pageActive" in (ativa.get_attribute("class") or "")

    def test_periodo_invertido_exibe_mensagem_especifica(self, logged_in, wait):
        _abrir_financeiro(logged_in, wait)
        _pular_se_api_indisponivel(logged_in)

        _aplicar_periodo(logged_in, wait, "2026-09-30", "2026-09-01")
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'Período inválido')]")
        ))
        pause()
        assert "Período inválido" in logged_in.page_source


# ─────────────────────────────────────────────────────────────────────────────
class TestResumoFinanceiro:
    """US-03 — Visualizar totais de entradas, saídas e saldo do período"""

    def test_cards_de_resumo_visiveis(self, logged_in, wait):
        _abrir_financeiro(logged_in, wait)
        for rotulo in ("Total de Entradas", "Total de Saídas", "Saldo"):
            assert rotulo in logged_in.page_source

    def test_periodo_sem_lancamentos_zera_os_totais(self, logged_in, wait):
        _abrir_financeiro(logged_in, wait)
        _pular_se_api_indisponivel(logged_in)

        vazio = date(2018, 2, 3).isoformat()
        _aplicar_periodo(logged_in, wait, vazio, vazio)

        totais = _totais(logged_in)
        assert totais == {"entradas": 0.0, "saidas": 0.0, "saldo": 0.0}
        assert "Nenhum lançamento encontrado." in logged_in.page_source

    def test_totais_e_saldo_refletem_os_lancamentos_do_periodo(self, logged_in, wait):
        _abrir_financeiro(logged_in, wait)
        _pular_se_api_indisponivel(logged_in)

        dia = _dia_isolado()
        _aplicar_periodo(logged_in, wait, dia, dia)
        antes = _totais(logged_in)

        sufixo = random.randint(1000, 9999)
        _criar_lancamento(
            logged_in, wait, "Nova Entrada", f"Honorários {sufixo}", "1500,00", dia,
        )
        _criar_lancamento(
            logged_in, wait, "Nova Saída", f"Despesa cartório {sufixo}", "200,25", dia,
        )

        _aplicar_periodo(logged_in, wait, dia, dia)
        depois = _totais(logged_in)

        assert round(depois["entradas"] - antes["entradas"], 2) == 1500.00
        assert round(depois["saidas"]   - antes["saidas"],   2) == 200.25
        assert round(depois["saldo"], 2) == round(
            depois["entradas"] - depois["saidas"], 2
        )

    def test_saldo_negativo_e_destacado(self, logged_in, wait):
        _abrir_financeiro(logged_in, wait)
        _pular_se_api_indisponivel(logged_in)

        dia = _dia_isolado()
        descricao = f"Prejuízo do dia {random.randint(1000, 9999)}"
        _criar_lancamento(logged_in, wait, "Nova Saída", descricao, "999,00", dia)

        _aplicar_periodo(logged_in, wait, dia, dia)
        totais = _totais(logged_in)
        if totais["saldo"] >= 0:
            pytest.skip("Período já possuía entradas suficientes para saldo positivo")

        saldo = logged_in.find_element(
            By.XPATH, "//p[normalize-space(text())='Saldo']/following-sibling::p[1]"
        )
        assert "summaryValueRed" in (saldo.get_attribute("class") or "")
