package com.example.webNhaHangThanhHoa.Controller;
import com.example.webNhaHangThanhHoa.Entity.roles;
import com.example.webNhaHangThanhHoa.Entity.users;
import com.example.webNhaHangThanhHoa.JWT.JwtUtils;
import com.example.webNhaHangThanhHoa.Repository.RoleRepository;
import com.example.webNhaHangThanhHoa.Repository.UserRepository;
import com.example.webNhaHangThanhHoa.Request.LoginRequest;
import com.example.webNhaHangThanhHoa.Request.RegisterWithRoleRequest;
import com.example.webNhaHangThanhHoa.Security.ShopUserDetails;
import com.example.webNhaHangThanhHoa.response.ApiResponse;
import com.example.webNhaHangThanhHoa.response.JwtReponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;

    private final JwtUtils jwtUtils;

    private final UserRepository userRepository;

    private final RoleRepository roleRepository;

    private final PasswordEncoder passwordEncoder;


    // =====================================================
    // LOGIN
    // =====================================================

    @PostMapping("/login")
    public ResponseEntity<ApiResponse> login(
            @Valid @RequestBody LoginRequest request) {

        try {

            Authentication authentication =
                    authenticationManager.authenticate(
                            new UsernamePasswordAuthenticationToken(
                                    request.getEmail(),
                                    request.getPassword()
                            )
                    );

            SecurityContextHolder
                    .getContext()
                    .setAuthentication(authentication);

            String jwt =
                    jwtUtils.generateTokenForUser(authentication);

            ShopUserDetails userDetails =
                    (ShopUserDetails) authentication.getPrincipal();

            String fullName = userRepository.findById(userDetails.getId())
                    .map(u -> (u.getFullName() != null && !u.getFullName().isBlank()) ? u.getFullName() : u.getUsername())
                    .orElse(userDetails.getEmail());

            JwtReponse response =
                    new JwtReponse(
                            userDetails.getId(),
                            jwt,
                            fullName
                    );

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Đăng nhập thành công",
                            response
                    )
            );

        } catch (AuthenticationException e) {

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(
                            new ApiResponse(
                                    "Email hoặc mật khẩu không chính xác",
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // REGISTER USER
    // =====================================================

    @PostMapping("/register")
    public ResponseEntity<ApiResponse> register(
            @Valid @RequestBody RegisterWithRoleRequest request) {

        // Kiểm tra email
        if (userRepository.existsByEmail(
                request.getEmail())) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            new ApiResponse(
                                    "Email đã tồn tại",
                                    null
                            )
                    );
        }

        // User đăng ký bình thường
        roles userRole =
                roleRepository
                        .findByName("ROLE_USER")
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "ROLE_USER chưa tồn tại"
                                )
                        );

        users user = new users();

        user.setUsername(
                request.getEmail()
        );

        user.setEmail(
                request.getEmail()
        );

        user.setFullName(
                request.getFullName()
        );

        user.setPhone(
                request.getPhone()
        );

        // QUAN TRỌNG:
        // Không lưu password dạng plain text
        user.setPassword(
                passwordEncoder.encode(
                        request.getPassword()
                )
        );

        user.setStatus("ACTIVE");

        user.setRole(userRole);

        userRepository.save(user);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(
                        new ApiResponse(
                                "Đăng ký tài khoản thành công",
                                null
                        )
                );
    }


    // =====================================================
    // ADMIN CREATE USER / STAFF / CASHIER / KITCHEN
    // =====================================================

    @PostMapping("/create-user")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> createUserWithRole(
            @Valid
            @RequestBody RegisterWithRoleRequest request) {

        // ---------------------------------------------
        // Kiểm tra email
        // ---------------------------------------------

        if (userRepository.existsByEmail(
                request.getEmail())) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            new ApiResponse(
                                    "Email đã tồn tại",
                                    null
                            )
                    );
        }


        // ---------------------------------------------
        // Tìm Role
        // ---------------------------------------------

        String roleName = request.getRole().toUpperCase();

        if (!roleName.startsWith("ROLE_")) {
            roleName = "ROLE_" + roleName;
        }

        final String searchRoleName = roleName;

        roles role =
                roleRepository
                        .findByName(searchRoleName)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Không tìm thấy role: "
                                                + searchRoleName
                                )
                        );


        // ---------------------------------------------
        // Tạo User
        // ---------------------------------------------

        users user = new users();

        user.setUsername(
                request.getEmail()
        );

        user.setEmail(
                request.getEmail()
        );

        user.setFullName(
                request.getFullName()
        );

        user.setPhone(
                request.getPhone()
        );

        // Mã hóa password
        user.setPassword(
                passwordEncoder.encode(
                        request.getPassword()
                )
        );

        user.setStatus("ACTIVE");

        user.setRole(role);


        userRepository.save(user);


        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(
                        new ApiResponse(
                                "Tạo tài khoản "
                                        + roleName
                                        + " thành công",
                                null
                        )
                );
    }
}