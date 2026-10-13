package com.example.webNhaHangThanhHoa.JWT;

import com.example.webNhaHangThanhHoa.Security.ShopUserDetailsService;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
@Slf4j
public class AuthTokenFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;
    private final ShopUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {
        try {
            // 1. Lấy token từ request (lấy vé)
            String jwt = parseJwt(request);

            // 2. Kiểm tra token không rỗng và hợp lệ
            if (jwt != null && jwtUtils.validateToken(jwt)) {
                // 3. Lấy username (email) từ token (sửa từ JwtUtils viết hoa thành jwtUtils viết thường)
                String username = jwtUtils.getUsernameFromToken(jwt);

                // 4. Lấy thông tin chi tiết user từ database
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                // 5. Tạo "vé thông hành" (Authentication) cho Spring Security
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,
                                userDetails.getAuthorities()
                        );
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                // 6. Đưa thông tin xác thực vào SecurityContext (Lưu lại trạng thái đã đăng nhập)
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (JwtException e) {
            // Bắt lỗi liên quan đến Token (hết hạn, sai chữ ký, v.v.) -> Trả về mã 401 Unauthorized
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write(e.getMessage() + ": Invalid or expired token, you may login and try again!");
            return;
        } catch (Exception e) {
            // Bắt các lỗi hệ thống khác -> Trả về mã 500
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.getWriter().write("Cannot set user authentication: " + e.getMessage());
            return;
        }

        // Cho phép request đi tiếp đến Filter tiếp theo hoặc Controller
        filterChain.doFilter(request, response);
    }

    /**
     * Tách và lấy JWT token bỏ chữ "Bearer " từ header Authorization của request
     */
    private String parseJwt(HttpServletRequest request) {
        String headerAuth = request.getHeader("Authorization");

        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7); // Cắt bỏ 7 ký tự đầu tiên ("Bearer ") để lấy chuỗi token sạch
        }

        return null;
    }
}