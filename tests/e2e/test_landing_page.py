        # Aguarda o modal customizado de alterações não salvas.
        modal_title = wait.until(
            EC.visibility_of_element_located((By.ID, "unsaved-modal-title"))
        )
        assert "alterações não salvas" in modal_title.text.lower()

        dialog = logged_in.find_element(By.XPATH, "//*[@role='dialog']")
        assert dialog.is_displayed()

        # Continuar editando cancela a navegação e preserva o rascunho.
        btn_continuar = logged_in.find_element(
            By.XPATH, "//button[normalize-space()='Continuar editando']"
        )
        scroll_and_click(logged_in, btn_continuar)
        wait.until(EC.invisibility_of_element_located((By.ID, "unsaved-modal-title")))
        assert "/sistema/personalizacao" in logged_in.current_url
        assert tel_input.get_attribute("value") == "(11) 99999-0000"

        # Tenta sair novamente e confirma o descarte do rascunho.
        link_processos = logged_in.find_element(
            By.XPATH, "//a[contains(@href, '/sistema/processos')]"
        )
        scroll_and_click(logged_in, link_processos)

        wait.until(
            EC.visibility_of_element_located((By.ID, "unsaved-modal-title"))
        )
        logged_in.find_element(
            By.XPATH, "//button[normalize-space()='Sair e descartar']"
        ).click()
        wait.until(EC.url_contains("/sistema/processos"))