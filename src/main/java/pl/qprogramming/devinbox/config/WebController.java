package pl.qprogramming.devinbox.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * SPA fallback — serves index.html for all non-API, non-static routes.
 */
@Controller
public class WebController {

    @RequestMapping({
        "/",
        "/inbox",
        "/notes",
        "/settings"
    })
    public String forward() {
        return "forward:/index.html";
    }
}
