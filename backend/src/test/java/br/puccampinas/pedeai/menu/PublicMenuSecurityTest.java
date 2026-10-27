package br.puccampinas.pedeai.menu;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "jwt.secret=a-test-secret-with-more-than-32-bytes",
                "spring.data.mongodb.uri=mongodb://127.0.0.1:1/pedeai-test"
        })
class PublicMenuSecurityTest {

    private static final String MENU_PATH = "/api/public/stores/demo/menu";

    @Autowired
    private TestRestTemplate restTemplate;

    @MockBean
    private MenuService menuService;

    @Test
    void publicMenuAnswersOkWithoutToken() {
        when(menuService.getMenu("demo")).thenReturn(new MenuResponse(
                new MenuResponse.StoreInfo("1", "demo", "Demo", null, "#D62F1F", null),
                List.of()));

        ResponseEntity<String> response = restTemplate.getForEntity(MENU_PATH, String.class);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().contains("\"slug\":\"demo\""));
    }

    @Test
    void unexpectedFailureOnPublicRouteIsNotReportedAsUnauthorized() {
        when(menuService.getMenu("demo")).thenThrow(new IllegalStateException("boom"));

        ResponseEntity<String> response = restTemplate.getForEntity(MENU_PATH, String.class);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
    }

    @Test
    void databaseFailureOnPublicRouteIsServiceUnavailable() {
        when(menuService.getMenu("demo")).thenThrow(new DataAccessResourceFailureException("bad auth"));

        ResponseEntity<String> response = restTemplate.getForEntity(MENU_PATH, String.class);

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertTrue(response.getBody().contains("\"error\":\"database_unavailable\""));
    }

    @Test
    void protectedRouteStillRequiresToken() {
        ResponseEntity<String> response = restTemplate.getForEntity("/api/auth/me", String.class);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }
}
