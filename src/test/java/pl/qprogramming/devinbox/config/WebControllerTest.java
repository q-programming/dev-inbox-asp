package pl.qprogramming.devinbox.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verifies that the SPA fallback controller forwards all known frontend routes
 * to {@code /index.html} without a redirect (server-side forward).
 * Uses standalone MockMvc — no Spring context needed, WebController has no dependencies.
 */
class WebControllerTest {

    MockMvc mockMvc = MockMvcBuilders
            .standaloneSetup(new WebController())
            .build();

    @ParameterizedTest(name = "GET {0} forwards to /index.html")
    @DisplayName("SPA routes forward to index.html")
    @ValueSource(strings = {"/", "/inbox", "/notes", "/settings"})
    void spaRoutesForwardToIndexHtml(String path) throws Exception {
        mockMvc.perform(get(path))
                .andExpect(status().isOk())
                .andExpect(forwardedUrl("/index.html"));
    }
}
