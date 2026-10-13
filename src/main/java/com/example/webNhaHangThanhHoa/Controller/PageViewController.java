package com.example.webNhaHangThanhHoa.Controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Controller điều hướng giao diện không có đuôi .html
 * Hỗ trợ các URL chuyên nghiệp:
 * - /login
 * - /admin (hoặc /dashboard)
 * - /pos-tables (hoặc /pos)
 * - /order
 * - /kitchen
 */
@Controller
public class PageViewController {

    @GetMapping({
            "/login", "/login/",
            "/dang-nhap", "/dang-nhap/"
    })
    public String login() {
        return "forward:/login/login.html";
    }

    @GetMapping({
            "/admin", "/admin/",
            "/admin/{tab:[a-zA-Z0-9_-]+}",
            "/dashboard", "/dashboard/",
            "/dashboard/1", "/dashboard/1/",
            "/dashboard/{tab:[a-zA-Z0-9_-]+}",
            "/quan-tri", "/quan-tri/",
            "/quan-tri/{tab:[a-zA-Z0-9_-]+}"
    })
    public String admin() {
        return "forward:/dashboard/1/index.html";
    }

    @GetMapping({
            "/order", "/order/",
            "/dat-mon", "/dat-mon/",
            "/goi-mon", "/goi-mon/"
    })
    public String order() {
        return "forward:/order.html";
    }

    @GetMapping({
            "/pos-tables", "/pos-tables/",
            "/pos", "/pos/",
            "/tables", "/tables/",
            "/so-do-ban", "/so-do-ban/"
    })
    public String posTables() {
        return "forward:/pos-tables.html";
    }

    @GetMapping({
            "/kitchen", "/kitchen/",
            "/bep", "/bep/"
    })
    public String kitchen() {
        return "forward:/kitchen.html";
    }

    @GetMapping("/")
    public String root() {
        return "redirect:/pos-tables";
    }
}
