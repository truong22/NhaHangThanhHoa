package com.example.webNhaHangThanhHoa.Repository;
import com.example.webNhaHangThanhHoa.Entity.users;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository
        extends JpaRepository<users, Long> {

    // ==============================
    // USERNAME
    // ==============================

    Optional<users> findByUsername(String username);
    Optional<users> findByEmail(String email);
    boolean existsByUsername(String username);

    // ==============================
    // EMAIL
    // ==============================

    boolean existsByEmail(String email);

    // ==============================
    // PHONE
    // ==============================

    List<users> findByPhoneContaining(String phone);

    // ==============================
    // STATUS
    // ==============================

    List<users> findByStatus(String status);

    // ==============================
    // ROLE
    // ==============================

    List<users> findByRoleId(Long roleId);

    // ==============================
    // SEARCH
    // ==============================

    @Query("""
        SELECT u
        FROM users u
        WHERE LOWER(u.username)
              LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(u.fullName)
              LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(u.phone)
              LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(u.email)
              LIKE LOWER(CONCAT('%', :keyword, '%'))
        """)
    List<users> search(
            @Param("keyword") String keyword
    );
}