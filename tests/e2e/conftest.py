import os
import time
import pytest
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.edge.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.microsoft import EdgeChromiumDriverManager

SLOW = float(os.getenv("SLOW", "0"))

BASE_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
TEST_EMAIL = os.getenv("TEST_EMAIL", "admin@advocacia.com")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "senha123")
# Funcionário (papel USER) usado nos testes de permissão; sem valor padrão.
TEST_USER_EMAIL = os.getenv("TEST_USER_EMAIL")
TEST_USER_PASSWORD = os.getenv("TEST_USER_PASSWORD")


@pytest.fixture(scope="session")
def driver():
    options = Options()
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1280,900")

    service = Service(EdgeChromiumDriverManager().install())
    browser = webdriver.Edge(service=service, options=options)
    browser.implicitly_wait(5)

    yield browser

    browser.quit()


@pytest.fixture
def wait(driver):
    return WebDriverWait(driver, 10)


def pause():
    if SLOW:
        time.sleep(SLOW)


def do_login(driver, wait, email=TEST_EMAIL, password=TEST_PASSWORD):
    driver.get(f"{BASE_URL}/login")
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']")))
    pause()

    driver.find_element(By.CSS_SELECTOR, "input[type='email']").clear()
    driver.find_element(By.CSS_SELECTOR, "input[type='email']").send_keys(email)
    pause()
    driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys(password)
    pause()
    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

    wait.until(EC.url_contains("/sistema"))
    pause()


def do_logout(driver):
    driver.execute_script("localStorage.removeItem('advocacia_access_token')")
    driver.get(f"{BASE_URL}/login")


@pytest.fixture
def logged_in(driver, wait):
    do_login(driver, wait)
    yield driver
    do_logout(driver)


@pytest.fixture
def logged_in_user(driver, wait):
    """Sessão de funcionário (papel USER) definida por TEST_USER_EMAIL/TEST_USER_PASSWORD."""
    if not TEST_USER_EMAIL or not TEST_USER_PASSWORD:
        pytest.skip("TEST_USER_EMAIL/TEST_USER_PASSWORD não definidos")
    do_login(driver, wait, TEST_USER_EMAIL, TEST_USER_PASSWORD)
    yield driver
    do_logout(driver)
