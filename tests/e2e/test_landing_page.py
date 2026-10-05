import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoSuchElementException

from conftest import BASE_URL, pause

LANDING_URL = f"{BASE_URL}/sistema/landing-page"
ARTIGOS_URL = f"{BASE_URL}/sistema/artigos"
SITE_URL    = BASE_URL


def _bottombar_visivel(driver):
    """Retorna True quando a barra de alterações não salvas está visível na tela."""
    return driver.execute_script("""
        const el = document.querySelector('[class*="bottomBar"]');
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.top < window.innerHeight;
    """)


def js_click(driver, element):
    """Clica via JavaScript, contornando interceptação por z-index ou animação CSS."""
    driver.execute_script("arguments[0].click();", element)


def scroll_and_click(driver, element):
    """Rola o elemento para o centro do viewport e clica com JS."""
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", element)
    time.sleep(0.3)
    driver.execute_script("arguments[0].click();", element)


# ─────────────────────────────────────────────────────────────────────────────
class TestInformacoesInstitucionais:
    """US-05 — Cadastrar e editar as informações institucionais do escritório"""

    def test_pagina_landing_page_carrega(self, logged_in, wait):
        logged_in.get(LANDING_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h1[contains(text(),'Configuração da Landing Page')]")
        ))
        pause()
        assert "Configuração da Landing Page" in logged_in.page_source

    def test_secao_dados_institucionais_visivel(self, logged_in, wait):
        logged_in.get(LANDING_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'Dados Institucionais')]")
        ))
        pause()
        assert "E-MAIL DE CONTATO" in logged_in.page_source
        assert "TELEFONE"          in logged_in.page_source
        assert "ENDEREÇO"          in logged_in.page_source

    def test_secao_links_visivel(self, logged_in, wait):
        logged_in.get(LANDING_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'Links')]")
        ))
        pause()
        assert "LINKEDIN"  in logged_in.page_source
        assert "INSTAGRAM" in logged_in.page_source
        assert "WHATSAPP"  in logged_in.page_source

    def test_editar_campo_exibe_barra_de_alteracoes(self, logged_in, wait):
        logged_in.get(LANDING_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//label[contains(text(),'E-MAIL DE CONTATO')]")
        ))
        pause()
        email_input = logged_in.find_element(
            By.XPATH, "//label[contains(text(),'E-MAIL DE CONTATO')]/following-sibling::input"
        )
        email_input.clear()
        email_input.send_keys("selenium@teste.com")
        pause()

        wait.until(_bottombar_visivel)
        pause()
        assert logged_in.find_element(By.XPATH, "//button[contains(.,'Descartar')]").is_displayed()
        assert logged_in.find_element(By.XPATH, "//button[contains(.,'Salvar alterações')]").is_displayed()

    def test_descartar_alteracoes_restaura_campo(self, logged_in, wait):
        logged_in.get(LANDING_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//label[contains(text(),'TELEFONE')]")
        ))
        pause()
        tel_input = logged_in.find_element(
            By.XPATH, "//label[contains(text(),'TELEFONE')]/following-sibling::input"
        )
        original = tel_input.get_attribute("value")
        tel_input.clear()
        tel_input.send_keys("(99) 11111-1111")
        pause()

        wait.until(_bottombar_visivel)
        time.sleep(0.4)  # aguarda animação translateY concluir
        js_click(logged_in, logged_in.find_element(By.XPATH, "//button[contains(.,'Descartar')]"))

        wait.until(lambda d: d.find_element(
            By.XPATH, "//label[contains(text(),'TELEFONE')]/following-sibling::input"
        ).get_attribute("value") == original)
        pause()

    def test_salvar_alteracoes_persiste_e_fecha_barra(self, logged_in, wait):
        from selenium.webdriver.common.keys import Keys
        from selenium.webdriver.support.ui import WebDriverWait

        email_unico = f"selenium.{int(time.time())}@escritorio.com"

        logged_in.get(LANDING_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//label[contains(text(),'E-MAIL DE CONTATO')]")
        ))
        pause()
        email_input = logged_in.find_element(
            By.XPATH, "//label[contains(text(),'E-MAIL DE CONTATO')]/following-sibling::input"
        )
        email_input.send_keys(Keys.CONTROL + 'a')
        email_input.send_keys(email_unico)
        pause()

        wait.until(_bottombar_visivel)
        time.sleep(0.4)
        js_click(logged_in, logged_in.find_element(By.XPATH, "//button[contains(.,'Salvar alterações')]"))

        WebDriverWait(logged_in, 20).until(lambda d: not _bottombar_visivel(d))
        pause()


# ─────────────────────────────────────────────────────────────────────────────
class TestEdicaoSecoes:
    """US-06 — Editar textos e imagens das seções da landing page"""

    def test_secao_hero_exibe_campos_de_texto(self, logged_in, wait):
        logged_in.get(LANDING_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h2[contains(text(),'Hero')]")
        ))
        pause()
        assert "TÍTULO DO IMPACTO" in logged_in.page_source
        assert "SUBTEXTO DE APOIO" in logged_in.page_source

    def test_secao_sobre_escritorio_exibe_campos(self, logged_in, wait):
        logged_in.get(LANDING_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h2[contains(text(),'Sobre Escritório')]")
        ))
        pause()
        assert "TÍTULO DA SEÇÃO"    in logged_in.page_source
        assert "CONTEÚDO DESCRITIVO" in logged_in.page_source

    def test_secao_sobre_advogado_exibe_campo_oab(self, logged_in, wait):
        logged_in.get(LANDING_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h2[contains(text(),'Sobre Advogado')]")
        ))
        pause()
        assert "OAB" in logged_in.page_source

    def test_secao_diferenciais_exibe_tres_cards(self, logged_in, wait):
        logged_in.get(LANDING_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h2[contains(text(),'Diferenciais')]")
        ))
        pause()
        botoes = logged_in.find_elements(
            By.XPATH, "//h2[contains(text(),'Diferenciais')]/ancestor::div[2]//button"
        )
        assert len(botoes) >= 3

    def test_editar_diferencial_abre_inputs_inline(self, logged_in, wait):
        logged_in.get(LANDING_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h2[contains(text(),'Diferenciais')]")
        ))
        pause()
        primeiro_edit = logged_in.find_element(
            By.XPATH, "(//h2[contains(text(),'Diferenciais')]/ancestor::div[2]//button)[1]"
        )
        scroll_and_click(logged_in, primeiro_edit)

        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h2[contains(text(),'Diferenciais')]/ancestor::div[2]//input")
        ))
        pause()
        assert logged_in.find_element(
            By.XPATH, "//h2[contains(text(),'Diferenciais')]/ancestor::div[2]//input"
        ).is_displayed()
        assert logged_in.find_element(
            By.XPATH, "//h2[contains(text(),'Diferenciais')]/ancestor::div[2]//textarea"
        ).is_displayed()

    def test_confirmar_edicao_diferencial_fecha_inputs(self, logged_in, wait):
        logged_in.get(LANDING_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h2[contains(text(),'Diferenciais')]")
        ))
        pause()
        primeiro_edit = logged_in.find_element(
            By.XPATH, "(//h2[contains(text(),'Diferenciais')]/ancestor::div[2]//button)[1]"
        )
        scroll_and_click(logged_in, primeiro_edit)

        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h2[contains(text(),'Diferenciais')]/ancestor::div[2]//textarea")
        ))
        pause()
        confirm = logged_in.find_element(
            By.XPATH,
            "//h2[contains(text(),'Diferenciais')]/ancestor::div[2]//textarea/following-sibling::button"
        )
        scroll_and_click(logged_in, confirm)

        wait.until(EC.invisibility_of_element_located(
            (By.XPATH, "//h2[contains(text(),'Diferenciais')]/ancestor::div[2]//textarea")
        ))
        pause()

    def test_secao_areas_atuacao_visivel(self, logged_in, wait):
        logged_in.get(LANDING_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h2[contains(text(),'Áreas de Atuação')]")
        ))
        pause()
        assert "Áreas de Atuação" in logged_in.page_source

    def test_editar_titulo_hero_detecta_alteracao(self, logged_in, wait):
        logged_in.get(LANDING_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//label[contains(text(),'TÍTULO DO IMPACTO')]")
        ))
        pause()
        hero_titulo = logged_in.find_element(
            By.XPATH, "//label[contains(text(),'TÍTULO DO IMPACTO')]/following-sibling::input"
        )
        hero_titulo.clear()
        hero_titulo.send_keys("Título Selenium Hero")
        pause()

        wait.until(_bottombar_visivel)
        time.sleep(0.4)
        js_click(logged_in, logged_in.find_element(By.XPATH, "//button[contains(.,'Descartar')]"))
        wait.until(lambda d: not _bottombar_visivel(d))
        pause()


# ─────────────────────────────────────────────────────────────────────────────
class TestArtigosPublicos:
    """US-07 — Visitante acessa seção de artigos na landing page pública"""

    def test_landing_page_tem_secao_artigos(self, driver, wait):
        driver.get(SITE_URL)
        wait.until(EC.presence_of_element_located((By.ID, "artigos")))
        pause()
        assert "Artigos e Notícias" in driver.page_source

    def test_secao_artigos_exibe_conteudo_ou_estado_vazio(self, driver, wait):
        driver.get(SITE_URL)
        wait.until(EC.presence_of_element_located((By.ID, "artigos")))
        wait.until(lambda d: (
            "Leia mais" in d.page_source or
            "Nenhum artigo publicado" in d.page_source
        ))
        pause()
        assert (
            "Leia mais" in driver.page_source or
            "Nenhum artigo publicado" in driver.page_source
        )

    def test_link_leia_mais_navega_para_pagina_do_artigo(self, driver, wait):
        driver.get(SITE_URL)
        wait.until(EC.presence_of_element_located((By.ID, "artigos")))
        wait.until(lambda d: (
            "Leia mais" in d.page_source or
            "Nenhum artigo publicado" in d.page_source
        ))
        pause()
        try:
            link = driver.find_element(By.LINK_TEXT, "Leia mais →")
            scroll_and_click(driver, link)
            wait.until(EC.url_contains("/artigos/"))
            pause()
            assert "/artigos/" in driver.current_url
        except NoSuchElementException:
            pytest.skip("Nenhum artigo publicado disponível para testar navegação")


# ─────────────────────────────────────────────────────────────────────────────
class TestGerenciarArtigos:
    """US-08 — Criar e editar artigos com título, conteúdo, imagem e categoria"""

    def test_pagina_artigos_carrega(self, logged_in, wait):
        logged_in.get(ARTIGOS_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h1[contains(text(),'Gerenciar Artigos')]")
        ))
        pause()
        assert "Gerenciar Artigos" in logged_in.page_source

    def test_tabela_artigos_exibe_colunas(self, logged_in, wait):
        logged_in.get(ARTIGOS_URL)
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "table")))
        pause()
        assert "Título" in logged_in.page_source
        assert "Status" in logged_in.page_source
        assert "Data"   in logged_in.page_source
        assert "Ações"  in logged_in.page_source

    def test_botao_novo_artigo_abre_editor(self, logged_in, wait):
        logged_in.get(ARTIGOS_URL)
        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Novo Artigo')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(.,'Novo Artigo')]").click()

        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h1[contains(text(),'Criar Artigo')]")
        ))
        pause()
        assert "Criar Artigo" in logged_in.page_source

    def test_editor_artigo_tem_campo_titulo(self, logged_in, wait):
        logged_in.get(ARTIGOS_URL)
        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Novo Artigo')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(.,'Novo Artigo')]").click()

        wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "input[placeholder*='título']")
        ))
        pause()
        assert logged_in.find_element(
            By.CSS_SELECTOR, "input[placeholder*='título']"
        ).is_displayed()

    def test_editor_artigo_tem_toggle_status(self, logged_in, wait):
        logged_in.get(ARTIGOS_URL)
        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Novo Artigo')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(.,'Novo Artigo')]").click()

        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'Rascunho') or contains(text(),'Publicado')]")
        ))
        pause()
        assert (
            "Rascunho" in logged_in.page_source or
            "Publicado" in logged_in.page_source
        )

    def test_editor_artigo_tem_selecao_de_categoria(self, logged_in, wait):
        logged_in.get(ARTIGOS_URL)
        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Novo Artigo')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(.,'Novo Artigo')]").click()

        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h1[contains(text(),'Criar Artigo')]")
        ))
        pause()
        assert "Jurisprudência" in logged_in.page_source

    def test_voltar_do_editor_retorna_para_lista(self, logged_in, wait):
        logged_in.get(ARTIGOS_URL)
        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Novo Artigo')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(.,'Novo Artigo')]").click()

        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Voltar')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(.,'Voltar')]").click()

        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h1[contains(text(),'Gerenciar Artigos')]")
        ))
        pause()
        assert "Gerenciar Artigos" in logged_in.page_source

    def test_criar_artigo_com_titulo_aparece_na_lista(self, logged_in, wait):
        titulo_unico = f"Artigo Selenium {int(time.time())}"

        logged_in.get(ARTIGOS_URL)
        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Novo Artigo')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(.,'Novo Artigo')]").click()

        wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "input[placeholder*='título']")
        ))
        pause()
        logged_in.find_element(
            By.CSS_SELECTOR, "input[placeholder*='título']"
        ).send_keys(titulo_unico)
        pause()

        logged_in.find_element(
            By.CSS_SELECTOR, "textarea[placeholder*='resumo']"
        ).send_keys("Resumo do artigo criado pelo Selenium para teste E2E.")
        pause()

        editor = logged_in.find_element(By.CSS_SELECTOR, "[contenteditable='true']")
        editor.click()
        editor.send_keys("Conteúdo do artigo criado pelo Selenium para teste E2E.")
        pause()

        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Salvar Artigo')]")
        ))
        logged_in.find_element(By.XPATH, "//button[contains(.,'Salvar Artigo')]").click()

        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h1[contains(text(),'Gerenciar Artigos')]")
        ))
        pause()
        assert titulo_unico in logged_in.page_source

    def test_filtro_busca_por_titulo_exibe_contagem(self, logged_in, wait):
        logged_in.get(ARTIGOS_URL)
        wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "input[placeholder*='título ou autor']")
        ))
        pause()
        busca = logged_in.find_element(
            By.CSS_SELECTOR, "input[placeholder*='título ou autor']"
        )
        busca.send_keys("Selenium")
        pause()

        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'resultado')]")
        ))
        pause()
        assert "resultado" in logged_in.page_source

    def test_filtro_status_funciona(self, logged_in, wait):
        logged_in.get(ARTIGOS_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//option[text()='Publicado']")
        ))
        pause()
        from selenium.webdriver.support.select import Select
        selects = logged_in.find_elements(By.CSS_SELECTOR, "select")
        Select(selects[1]).select_by_visible_text("Publicado")
        pause()

        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'resultado')]")
        ))
        pause()
        assert "resultado" in logged_in.page_source

    def test_limpar_filtros_remove_contagem(self, logged_in, wait):
        logged_in.get(ARTIGOS_URL)
        wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "input[placeholder*='título ou autor']")
        ))
        pause()
        logged_in.find_element(
            By.CSS_SELECTOR, "input[placeholder*='título ou autor']"
        ).send_keys("Selenium")
        pause()

        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Limpar')]")
        ))
        logged_in.find_element(By.XPATH, "//button[contains(.,'Limpar')]").click()

        wait.until(EC.invisibility_of_element_located(
            (By.XPATH, "//button[contains(.,'Limpar')]")
        ))
        pause()

    def test_botao_visualizar_artigo_abre_detalhe(self, logged_in, wait):
        logged_in.get(ARTIGOS_URL)
        wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "button[title='Visualizar']")
        ))
        pause()
        logged_in.find_element(By.CSS_SELECTOR, "button[title='Visualizar']").click()

        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'Visualização do Artigo')]")
        ))
        pause()
        assert "Visualização do Artigo" in logged_in.page_source

        logged_in.find_element(By.XPATH, "//button[contains(.,'Voltar')]").click()
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h1[contains(text(),'Gerenciar Artigos')]")
        ))
        pause()

    def test_botao_editar_artigo_abre_editor_em_modo_edicao(self, logged_in, wait):
        logged_in.get(ARTIGOS_URL)
        wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "button[title='Editar']")
        ))
        pause()
        logged_in.find_element(By.CSS_SELECTOR, "button[title='Editar']").click()

        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h1[contains(text(),'Editar Artigo')]")
        ))
        pause()
        assert "Editar Artigo" in logged_in.page_source

        logged_in.find_element(By.XPATH, "//button[contains(.,'Voltar')]").click()
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//h1[contains(text(),'Gerenciar Artigos')]")
        ))
        pause()

    def test_toggle_rapido_de_status_altera_badge(self, logged_in, wait):
        logged_in.get(ARTIGOS_URL)
        wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "table")
        ))
        pause()
        assert (
            logged_in.find_elements(By.CSS_SELECTOR, "button[title='Publicar']") or
            logged_in.find_elements(By.CSS_SELECTOR, "button[title='Despublicar']")
        )


# ─────────────────────────────────────────────────────────────────────────────
class TestPreviewArtigo:
    """US-09 — Visualizar preview do artigo antes de publicar"""

    def test_editor_tem_botao_visualizar_preview(self, logged_in, wait):
        logged_in.get(ARTIGOS_URL)
        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Novo Artigo')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(.,'Novo Artigo')]").click()

        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//button[contains(.,'Visualizar Preview')]")
        ))
        pause()
        assert logged_in.find_element(
            By.XPATH, "//button[contains(.,'Visualizar Preview')]"
        ).is_displayed()

    def test_clicar_preview_exibe_visualizacao_do_artigo(self, logged_in, wait):
        logged_in.get(ARTIGOS_URL)
        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Novo Artigo')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(.,'Novo Artigo')]").click()

        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Visualizar Preview')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(.,'Visualizar Preview')]").click()

        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'Visualização do Artigo')]")
        ))
        pause()
        assert "Visualização do Artigo" in logged_in.page_source

    def test_preview_exibe_status_do_artigo(self, logged_in, wait):
        logged_in.get(ARTIGOS_URL)
        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Novo Artigo')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(.,'Novo Artigo')]").click()

        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Visualizar Preview')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(.,'Visualizar Preview')]").click()

        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'Visualização do Artigo')]")
        ))
        pause()
        assert (
            "Rascunho" in logged_in.page_source or
            "Publicado" in logged_in.page_source
        )

    def test_preview_exibe_botao_publicar_para_rascunho(self, logged_in, wait):
        logged_in.get(ARTIGOS_URL)
        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Novo Artigo')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(.,'Novo Artigo')]").click()

        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Visualizar Preview')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(.,'Visualizar Preview')]").click()

        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//button[contains(.,'Publicar')]")
        ))
        pause()
        assert "Publicar" in logged_in.page_source

    def test_voltar_ao_editor_retorna_ao_formulario(self, logged_in, wait):
        logged_in.get(ARTIGOS_URL)
        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Novo Artigo')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(.,'Novo Artigo')]").click()

        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Visualizar Preview')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(.,'Visualizar Preview')]").click()

        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Voltar ao Editor')]")
        ))
        pause()
        logged_in.find_element(By.XPATH, "//button[contains(.,'Voltar ao Editor')]").click()

        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//button[contains(.,'Visualizar Preview')]")
        ))
        pause()
        assert "Criar Artigo" in logged_in.page_source


# ─────────────────────────────────────────────────────────────────────────────
class TestTemasLandingPage:
    """US-09 — Selecionar temas pré-definidos e gerenciar temas personalizados"""

    def test_secao_temas_e_regua_visiveis(self, logged_in, wait):
        logged_in.get(LANDING_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'Tema Base') or contains(text(),'Tema base')]")
        ))
        pause()
        assert "Tema Base" in logged_in.page_source or "Tema base" in logged_in.page_source
        assert logged_in.find_element(
            By.XPATH, "//button[contains(.,'Biblioteca de Temas')]"
        ).is_displayed()

    def test_abrir_modal_biblioteca_de_temas(self, logged_in, wait):
        logged_in.get(LANDING_URL)
        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Biblioteca de Temas')]")
        ))
        pause()
        logged_in.find_element(
            By.XPATH, "//button[contains(.,'Biblioteca de Temas')]"
        ).click()

        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'Biblioteca de Temas')]")
        ))
        pause()
        assert "Biblioteca de Temas" in logged_in.page_source
        assert "Padrão" in logged_in.page_source
        assert logged_in.find_element(
            By.XPATH, "//button[contains(.,'Aplicar tema selecionado')]"
        ).is_displayed()

    def test_fechar_modal_biblioteca_ao_cancelar(self, logged_in, wait):
        logged_in.get(LANDING_URL)
        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Biblioteca de Temas')]")
        ))
        pause()
        logged_in.find_element(
            By.XPATH, "//button[contains(.,'Biblioteca de Temas')]"
        ).click()

        wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Cancelar')]")
        ))
        pause()
        logged_in.find_element(
            By.XPATH, "//button[contains(.,'Cancelar')]"
        ).click()

        wait.until(EC.invisibility_of_element_located(
            (By.XPATH, "//*[contains(text(),'Biblioteca de Temas')]")
        ))
        pause()

    def test_barra_inferior_descartar_oculta_quando_inalterado(self, logged_in, wait):
        logged_in.get(LANDING_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'Tema Base') or contains(text(),'Tema base')]")
        ))
        pause()
        assert not _bottombar_visivel(logged_in)

