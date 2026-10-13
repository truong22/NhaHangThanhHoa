package com.example.webNhaHangThanhHoa.Repository;

import com.example.webNhaHangThanhHoa.Entity.roles;
import com.example.webNhaHangThanhHoa.Entity.users;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Transactional
public class Datalnitializer
        implements ApplicationListener<ApplicationReadyEvent> {

    private final UserRepository userRepository;

    private final RoleRepository roleRepository;

    private final PasswordEncoder passwordEncoder;


    @Override
    public void onApplicationEvent(
            ApplicationReadyEvent event) {

        // =============================================
        // 1. Tạo Role mặc định
        // =============================================

        roles adminRole =
                createRoleIfNotExists("ROLE_ADMIN");

        roles staffRole =
                createRoleIfNotExists("ROLE_STAFF");

        roles kitchenRole =
                createRoleIfNotExists("ROLE_KITCHEN");

        roles cashierRole =
                createRoleIfNotExists("ROLE_CASHIER");


        // =============================================
        // 2. Tạo tài khoản ADMIN
        // =============================================

        createUserIfNotExists(
                "admin@gmail.com",
                "admin123",
                "Administrator",
                adminRole
        );


        // =============================================
        // 3. Tạo tài khoản STAFF
        // =============================================

        createUserIfNotExists(
                "staff@gmail.com",
                "123456",
                "Nhân viên phục vụ",
                staffRole
        );


        // =============================================
        // 4. Tạo tài khoản KITCHEN
        // =============================================

        createUserIfNotExists(
                "kitchen@gmail.com",
                "123456",
                "Nhân viên bếp",
                kitchenRole
        );


        // =============================================
        // 5. Tạo tài khoản CASHIER
        // =============================================

        createUserIfNotExists(
                "cashier@gmail.com",
                "123456",
                "Nhân viên thu ngân",
                cashierRole
        );
    }


    // =====================================================
    // CREATE ROLE
    // =====================================================

    private roles createRoleIfNotExists(
            String roleName) {

        return roleRepository
                .findByName(roleName)
                .orElseGet(() -> {

                    roles role = new roles();

                    role.setName(roleName);

                    return roleRepository.save(role);
                });
    }


    // =====================================================
    // CREATE USER
    // =====================================================

    private void createUserIfNotExists(
            String email,
            String password,
            String fullName,
            roles role) {

        if (userRepository.existsByEmail(email)) {
            return;
        }


        users user = new users();

        user.setEmail(email);

        user.setUsername(email);

        user.setPassword(
                passwordEncoder.encode(password)
        );

        user.setFullName(fullName);

        user.setStatus("ACTIVE");

        user.setRole(role);


        userRepository.save(user);


        System.out.println(
                "Created default user: " + email
        );
    }
}