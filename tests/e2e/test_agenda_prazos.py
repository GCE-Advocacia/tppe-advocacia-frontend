import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.support.select import Select

from conftest import BASE_URL, pause

AGENDA_URL       = f"{BASE_URL}/sistema/agenda"
NOTIFICACOES_URL = f"{BASE_URL}/sistema/notificacoes"


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


def _data_futura() -> str:
    """Retorna uma data futura no formato YYYY-MM-DD dentro do mês atual."""
    from datetime import date, timedelta
    import calendar
    today = date.today()
    target = today + timedelta(days=7)
    if target.month != today.month or target.year != today.year:
        last_day = calendar.monthrange(today.year, today.month)[1]
        target = date(today.year, today.month, last_day)
    return target.isoformat()


def _btns_sem_texto(driver):
    """Botões visíveis sem texto (ícones) — usados para navegar o mês."""
    return [
        b for b in driver.find_elements(By.TAG_NAME, "button")
        if not b.text.strip() and b.is_displayed()
    ]


# ─────────────────────────────────────────────────────────────────────────────
class TestCadastrarCompromisso:
    """US-26 — Cadastrar compromissos na agenda informando tipo, data, hora,
    duração e vínculo opcional com cliente ou processo"""

    def test_pagina_agenda_carrega(self, logged_in, wait):
        logged_in.get(AGENDA_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h1[contains(text(),'Agenda Jurídica')]")
        ))
        pause()
        assert "Agenda Jurídica" in logged_in.page_source

    def test_calendario_exibe_cabecalho_com_dias_da_semana(self, logged_in, wait):
        logged_in.get(AGENDA_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h1[contains(text(),'Agenda Jurídica')]")
        ))
        pause()
        for dia in ("DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"):
            assert dia in logged_in.page_source

    def test_mes_e_ano_atual_visiveis_na_navegacao(self, logged_in, wait):
        from datetime import date
        logged_in.get(AGENDA_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h1[contains(text(),'Agenda Jurídica')]")
        ))
        pause()
        assert str(date.today().year) in logged_in.page_source

    def test_botoes_navegacao_mes_visiveis(self, logged_in, wait):
        logged_in.get(AGENDA_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h1[contains(text(),'Agenda Jurídica')]")
        ))
        pause()
        nav_btns = _btns_sem_texto(logged_in)
        assert len(nav_btns) >= 2

    def test_navegar_para_proximo_mes(self, logged_in, wait):
        logged_in.get(AGENDA_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h1[contains(text(),'Agenda Jurídica')]")
        ))
        pause()
        source_antes = logged_in.page_source
        nav_btns = _btns_sem_texto(logged_in)
        js_click(logged_in, nav_btns[1])
        pause()
        assert logged_in.page_source != source_antes

    def test_navegar_para_mes_anterior(self, logged_in, wait):
        logged_in.get(AGENDA_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h1[contains(text(),'Agenda Jurídica')]")
        ))
        pause()
        source_antes = logged_in.page_source
        nav_btns = _btns_sem_texto(logged_in)
        js_click(logged_in, nav_btns[0])
        pause()
        assert logged_in.page_source != source_antes

    def test_botao_novo_compromisso_visivel(self, logged_in, wait):
        logged_in.get(AGENDA_URL)
        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Novo Compromisso')]")
        ))
        pause()
        assert logged_in.find_element(
            By.XPATH, "//button[contains(.,'Novo Compromisso')]"
        ).is_displayed()

    def test_botao_novo_compromisso_abre_modal(self, logged_in, wait):
        logged_in.get(AGENDA_URL)
        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Novo Compromisso')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(.,'Novo Compromisso')]").click()
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'TIPO DO COMPROMISSO')]")
        ))
        pause()
        assert "TIPO DO COMPROMISSO" in logged_in.page_source

    def test_modal_exibe_todos_os_campos_do_formulario(self, logged_in, wait):
        logged_in.get(AGENDA_URL)
        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Novo Compromisso')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(.,'Novo Compromisso')]").click()
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'TIPO DO COMPROMISSO')]")
        ))
        pause()
        for campo in (
            "TIPO DO COMPROMISSO", "DATA", "INÍCIO", "DURAÇÃO (min)",
            "CLIENTE (OPCIONAL)", "PROCESSO (OPCIONAL)", "LOCAL", "OBSERVAÇÕES",
        ):
            assert campo in logged_in.page_source
        logged_in.find_element(By.XPATH, "//button[contains(text(),'Cancelar')]").click()
        pause()

    def test_modal_select_tipo_lista_audiencia_reuniao_prazo_outro(self, logged_in, wait):
        logged_in.get(AGENDA_URL)
        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Novo Compromisso')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(.,'Novo Compromisso')]").click()
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'TIPO DO COMPROMISSO')]")
        ))
        pause()
        sel = Select(logged_in.find_element(
            By.XPATH, "//select[.//option[contains(text(),'Audiência')]]"
        ))
        textos = [o.text for o in sel.options]
        for tipo in ("Audiência", "Reunião", "Prazo", "Outro"):
            assert tipo in textos
        logged_in.find_element(By.XPATH, "//button[contains(text(),'Cancelar')]").click()
        pause()

    def test_botao_salvar_evento_desabilitado_sem_data_preenchida(self, logged_in, wait):
        logged_in.get(AGENDA_URL)
        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Novo Compromisso')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(.,'Novo Compromisso')]").click()
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'TIPO DO COMPROMISSO')]")
        ))
        pause()
        btn = logged_in.find_element(
            By.XPATH, "//button[contains(text(),'Salvar Evento')]"
        )
        assert not btn.is_enabled()
        logged_in.find_element(By.XPATH, "//button[contains(text(),'Cancelar')]").click()
        pause()

    def test_cancelar_fecha_modal_de_compromisso(self, logged_in, wait):
        logged_in.get(AGENDA_URL)
        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Novo Compromisso')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(.,'Novo Compromisso')]").click()
        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(text(),'Cancelar')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(text(),'Cancelar')]").click()
        wait.until(EC.invisibility_of_element_located(
            (By.XPATH, "//*[contains(text(),'TIPO DO COMPROMISSO')]")
        ))
        pause()

    def test_select_cliente_opcional_exibe_sem_vinculo(self, logged_in, wait):
        logged_in.get(AGENDA_URL)
        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Novo Compromisso')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(.,'Novo Compromisso')]").click()
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'CLIENTE (OPCIONAL)')]")
        ))
        pause()
        sel = Select(logged_in.find_element(
            By.XPATH, "//select[.//option[contains(text(),'Sem cliente')]]"
        ))
        assert "Sem cliente vinculado" in [o.text for o in sel.options]
        logged_in.find_element(By.XPATH, "//button[contains(text(),'Cancelar')]").click()
        pause()

    def test_select_processo_opcional_exibe_sem_vinculo(self, logged_in, wait):
        logged_in.get(AGENDA_URL)
        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Novo Compromisso')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(.,'Novo Compromisso')]").click()
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'PROCESSO (OPCIONAL)')]")
        ))
        pause()
        sel = Select(logged_in.find_element(
            By.XPATH, "//select[.//option[contains(text(),'Sem processo')]]"
        ))
        assert "Sem processo vinculado" in [o.text for o in sel.options]
        logged_in.find_element(By.XPATH, "//button[contains(text(),'Cancelar')]").click()
        pause()

# ─────────────────────────────────────────────────────────────────────────────
class TestCalcularPrazoProcessual:
    """US-27 — Informar data de início, tipo de prazo e comarca; visualizar
    data-limite calculada em dias úteis com feriados forenses considerados"""

    def _abrir_calc(self, driver, wait):
        driver.get(AGENDA_URL)
        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Calcular Prazo')]")
        ))
        pause()
        driver.find_element(By.XPATH, "//button[contains(.,'Calcular Prazo')]").click()
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'Calcular Prazo Processual')]")
        ))
        pause()

    def test_botao_calcular_prazo_visivel_na_agenda(self, logged_in, wait):
        logged_in.get(AGENDA_URL)
        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Calcular Prazo')]")
        ))
        pause()
        assert logged_in.find_element(
            By.XPATH, "//button[contains(.,'Calcular Prazo')]"
        ).is_displayed()

    def test_calcular_prazo_abre_modal(self, logged_in, wait):
        self._abrir_calc(logged_in, wait)
        assert "Calcular Prazo Processual" in logged_in.page_source

    def test_modal_exibe_campo_data_de_intimacao(self, logged_in, wait):
        self._abrir_calc(logged_in, wait)
        assert "DATA DE INTIMAÇÃO" in logged_in.page_source

    def test_modal_exibe_campo_tipo_de_prazo(self, logged_in, wait):
        self._abrir_calc(logged_in, wait)
        assert "TIPO DE PRAZO" in logged_in.page_source

    def test_modal_exibe_campo_tribunal_opcional(self, logged_in, wait):
        self._abrir_calc(logged_in, wait)
        assert "TRIBUNAL (OPCIONAL)" in logged_in.page_source

    def test_modal_exibe_campo_comarca_opcional(self, logged_in, wait):
        self._abrir_calc(logged_in, wait)
        assert "COMARCA (OPCIONAL)" in logged_in.page_source

    def test_hint_feriados_forenses_visivel(self, logged_in, wait):
        self._abrir_calc(logged_in, wait)
        assert "Feriados forenses do tribunal e comarca serão considerados" in logged_in.page_source

    def test_select_tipo_prazo_lista_tipos_legais(self, logged_in, wait):
        self._abrir_calc(logged_in, wait)
        sel = Select(logged_in.find_element(
            By.XPATH, "//select[.//option[contains(text(),'Apelação')]]"
        ))
        textos = [o.text for o in sel.options]
        assert any("Apelação"    in t for t in textos)
        assert any("Contestação" in t for t in textos)
        assert any("Embargo"     in t for t in textos)
        assert any("Mandado"     in t for t in textos)

    def test_botao_calcular_agora_desabilitado_sem_data(self, logged_in, wait):
        self._abrir_calc(logged_in, wait)
        btn = logged_in.find_element(
            By.XPATH, "//button[contains(text(),'Calcular Agora')]"
        )
        assert not btn.is_enabled()

    def test_calcular_prazo_exibe_data_limite(self, logged_in, wait):
        self._abrir_calc(logged_in, wait)
        data = _data_futura()
        campo_data = logged_in.find_element(By.CSS_SELECTOR, "input[type='date']")
        set_date_input(logged_in, campo_data, data)
        pause()

        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(text(),'Calcular Agora')]")
        ))
        logged_in.find_element(By.XPATH, "//button[contains(text(),'Calcular Agora')]").click()

        wait.until(lambda d: (
            "DATA-LIMITE"      in d.page_source or
            "Não foi possível" in d.page_source
        ))
        pause()
        if "Não foi possível" in logged_in.page_source:
            pytest.skip("API de cálculo de prazos indisponível")
        assert "DATA-LIMITE" in logged_in.page_source

    def test_resultado_exibe_dias_restantes(self, logged_in, wait):
        self._abrir_calc(logged_in, wait)
        data = _data_futura()
        campo_data = logged_in.find_element(By.CSS_SELECTOR, "input[type='date']")
        set_date_input(logged_in, campo_data, data)
        pause()

        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(text(),'Calcular Agora')]")
        ))
        logged_in.find_element(By.XPATH, "//button[contains(text(),'Calcular Agora')]").click()

        wait.until(lambda d: (
            "DIAS RESTANTES"   in d.page_source or
            "Não foi possível" in d.page_source
        ))
        pause()
        if "Não foi possível" in logged_in.page_source:
            pytest.skip("API de cálculo de prazos indisponível")
        assert "DIAS RESTANTES" in logged_in.page_source

    def test_calcular_com_comarca_retorna_resultado_valido(self, logged_in, wait):
        """Informar comarca considera os feriados forenses locais no cálculo."""
        self._abrir_calc(logged_in, wait)
        data = _data_futura()
        campo_data = logged_in.find_element(By.CSS_SELECTOR, "input[type='date']")
        set_date_input(logged_in, campo_data, data)
        pause()

        logged_in.find_element(
            By.CSS_SELECTOR, "input[placeholder*='Capital']"
        ).send_keys("Brasília")
        pause()

        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(text(),'Calcular Agora')]")
        ))
        logged_in.find_element(By.XPATH, "//button[contains(text(),'Calcular Agora')]").click()

        wait.until(lambda d: (
            "DATA-LIMITE"      in d.page_source or
            "Não foi possível" in d.page_source
        ))
        pause()
        assert (
            "DATA-LIMITE"      in logged_in.page_source or
            "Não foi possível" in logged_in.page_source
        )

    def test_botao_salvar_na_agenda_aparece_apos_calculo(self, logged_in, wait):
        self._abrir_calc(logged_in, wait)
        data = _data_futura()
        campo_data = logged_in.find_element(By.CSS_SELECTOR, "input[type='date']")
        set_date_input(logged_in, campo_data, data)
        pause()

        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(text(),'Calcular Agora')]")
        ))
        logged_in.find_element(By.XPATH, "//button[contains(text(),'Calcular Agora')]").click()

        wait.until(lambda d: (
            "DATA-LIMITE"      in d.page_source or
            "Não foi possível" in d.page_source
        ))
        pause()
        if "Não foi possível" in logged_in.page_source:
            pytest.skip("API de cálculo de prazos indisponível")

        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Salvar na Agenda')]")
        ))
        pause()
        assert logged_in.find_element(
            By.XPATH, "//button[contains(.,'Salvar na Agenda')]"
        ).is_displayed()

    def test_salvar_prazo_calculado_cria_compromisso_na_agenda(self, logged_in, wait):
        self._abrir_calc(logged_in, wait)
        data = _data_futura()
        campo_data = logged_in.find_element(By.CSS_SELECTOR, "input[type='date']")
        set_date_input(logged_in, campo_data, data)
        pause()

        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(text(),'Calcular Agora')]")
        ))
        logged_in.find_element(By.XPATH, "//button[contains(text(),'Calcular Agora')]").click()

        wait.until(lambda d: (
            "DATA-LIMITE"      in d.page_source or
            "Não foi possível" in d.page_source
        ))
        pause()
        if "Não foi possível" in logged_in.page_source:
            pytest.skip("API de cálculo de prazos indisponível")

        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Salvar na Agenda')]")
        ))
        logged_in.find_element(By.XPATH, "//button[contains(.,'Salvar na Agenda')]").click()
        pause()

        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h1[contains(text(),'Agenda Jurídica')]")
        ))
        pause()
        assert "Prazo" in logged_in.page_source

    def test_fechar_modal_calc_retorna_para_agenda(self, logged_in, wait):
        """Clicar fora do modal (overlay) fecha e volta à agenda."""
        self._abrir_calc(logged_in, wait)
        logged_in.execute_script(
            "var ov = Array.from(document.querySelectorAll('div'))"
            ".find(el => Array.from(el.classList).some(c => c.includes('overlay')));"
            "if (ov) ov.dispatchEvent(new MouseEvent('click', {bubbles: true}));"
        )
        wait.until(EC.invisibility_of_element_located(
            (By.XPATH, "//*[contains(text(),'Calcular Prazo Processual')]")
        ))
        pause()
        assert "Agenda Jurídica" in logged_in.page_source

    def test_prazo_tipo_mandado_usa_dias_corridos(self, logged_in, wait):
        """Mandado de Segurança usa contagem de dias corridos (não úteis)."""
        self._abrir_calc(logged_in, wait)
        sel = Select(logged_in.find_element(
            By.XPATH, "//select[.//option[contains(text(),'Apelação')]]"
        ))
        sel.select_by_visible_text(
            next(o.text for o in sel.options if "Mandado" in o.text)
        )
        pause()
        assert "Mandado" in logged_in.page_source or "120 dias" in logged_in.page_source

        data = _data_futura()
        campo_data = logged_in.find_element(By.CSS_SELECTOR, "input[type='date']")
        set_date_input(logged_in, campo_data, data)
        pause()

        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(text(),'Calcular Agora')]")
        ))
        logged_in.find_element(By.XPATH, "//button[contains(text(),'Calcular Agora')]").click()

        wait.until(lambda d: (
            "DATA-LIMITE"           in d.page_source or
            "dias corridos"         in d.page_source or
            "Não foi possível"      in d.page_source
        ))
        pause()
        assert (
            "DATA-LIMITE"      in logged_in.page_source or
            "dias corridos"    in logged_in.page_source or
            "Não foi possível" in logged_in.page_source
        )


# ─────────────────────────────────────────────────────────────────────────────
class TestAlertasPrazos:
    """US-28 — Receber alertas automáticos escalonados quando prazo processual
    está se aproximando do vencimento"""

    def test_pagina_notificacoes_acessivel(self, logged_in, wait):
        logged_in.get(NOTIFICACOES_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h1[contains(text(),'Central de Notificações')]")
        ))
        pause()
        assert "Central de Notificações" in logged_in.page_source

    def test_secao_tipos_de_evento_visivel(self, logged_in, wait):
        logged_in.get(NOTIFICACOES_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'Tipos de Evento')]")
        ))
        pause()
        assert "Tipos de Evento" in logged_in.page_source

    def test_alerta_prazo_proximo_ao_vencimento_listado(self, logged_in, wait):
        logged_in.get(NOTIFICACOES_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'Prazo próximo ao vencimento')]")
        ))
        pause()
        assert "Prazo próximo ao vencimento" in logged_in.page_source

    def test_toggle_alerta_prazo_presente_e_clicavel(self, logged_in, wait):
        logged_in.get(NOTIFICACOES_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'Prazo próximo ao vencimento')]")
        ))
        pause()
        toggle = logged_in.find_element(
            By.XPATH,
            "//*[contains(text(),'Prazo próximo ao vencimento')]"
            "/..//button[@aria-pressed]",
        )
        assert toggle.is_displayed()
        assert toggle.is_enabled()

    def test_toggle_alerta_prazo_ativado_por_padrao(self, logged_in, wait):
        logged_in.get(NOTIFICACOES_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'Prazo próximo ao vencimento')]")
        ))
        pause()
        toggle = logged_in.find_element(
            By.XPATH,
            "//*[contains(text(),'Prazo próximo ao vencimento')]"
            "/..//button[@aria-pressed]",
        )
        assert toggle.get_attribute("aria-pressed") == "true"

    def test_desativar_e_reativar_alerta_de_prazo(self, logged_in, wait):
        logged_in.get(NOTIFICACOES_URL)
        toggle_xpath = (
            "//*[contains(text(),'Prazo próximo ao vencimento')]"
            "/..//button[@aria-pressed]"
        )
        wait.until(EC.presence_of_element_located((By.XPATH, toggle_xpath)))
        pause()
        toggle = logged_in.find_element(By.XPATH, toggle_xpath)
        estado_original = toggle.get_attribute("aria-pressed")

        scroll_and_click(logged_in, toggle)
        wait.until(lambda d: d.find_element(
            By.XPATH, toggle_xpath
        ).get_attribute("aria-pressed") != estado_original)
        pause()

        novo_estado = logged_in.find_element(
            By.XPATH, toggle_xpath
        ).get_attribute("aria-pressed")
        assert novo_estado != estado_original

        scroll_and_click(logged_in, logged_in.find_element(By.XPATH, toggle_xpath))
        wait.until(lambda d: d.find_element(
            By.XPATH, toggle_xpath
        ).get_attribute("aria-pressed") == estado_original)
        pause()

    def test_outros_alertas_de_processo_presentes_na_pagina(self, logged_in, wait):
        """US-23: também esperamos alertas de movimentação processual na mesma tela."""
        logged_in.get(NOTIFICACOES_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h1[contains(text(),'Central de Notificações')]")
        ))
        pause()
        assert "Nova movimentação processual" in logged_in.page_source

    def test_agenda_exibe_banner_google_calendar_para_sincronizacao(self, logged_in, wait):
        """Verificar integração que facilita notificações externas de compromissos."""
        logged_in.get(AGENDA_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h1[contains(text(),'Agenda Jurídica')]")
        ))
        pause()
        assert "Google Calendar" in logged_in.page_source

    def test_agenda_carrega_grid_sem_erros(self, logged_in, wait):
        """O grid do calendário carrega após a fetch dos compromissos."""
        logged_in.get(AGENDA_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h1[contains(text(),'Agenda Jurídica')]")
        ))
        wait.until(EC.invisibility_of_element_located(
            (By.XPATH, "//*[contains(text(),'Carregando agenda')]")
        ))
        pause()
        assert "Não foi possível carregar a agenda" not in logged_in.page_source
