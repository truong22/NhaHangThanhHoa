package com.example.webNhaHangThanhHoa.Controller;
import com.example.webNhaHangThanhHoa.DTO.UserDto;
import com.example.webNhaHangThanhHoa.Entity.users;
import com.example.webNhaHangThanhHoa.Request.UserRequest;
import com.example.webNhaHangThanhHoa.Service.User.UserService;
import com.example.webNhaHangThanhHoa.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;


    // =====================================================
    // GET ALL
    // =====================================================

    @GetMapping("/all")@PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> getAllUsers() {

        try {

            List<UserDto> users =
                    userService.getAllUsers();

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Lấy danh sách user thành công",
                            users
                    )
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );

        } catch (Exception e) {

            return ResponseEntity
                    .status(
                            HttpStatus.INTERNAL_SERVER_ERROR
                    )
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // GET BY ID
    // =====================================================

    @GetMapping("/{id}")@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'CASHIER', 'KITCHEN')")
    public ResponseEntity<ApiResponse> getUserById(
            @PathVariable Long id) {

        try {

            UserDto user =
                    userService.getUserById(id);

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Tìm thấy user",
                            user
                    )
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );

        } catch (Exception e) {

            return ResponseEntity
                    .status(
                            HttpStatus.INTERNAL_SERVER_ERROR
                    )
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // GET BY USERNAME
    // =====================================================

    @GetMapping("/username")@PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> getByUsername(
            @RequestParam String username) {

        try {

            UserDto user =
                    userService.getUserByUsername(
                            username
                    );

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Tìm thấy user",
                            user
                    )
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );

        } catch (Exception e) {

            return ResponseEntity
                    .status(
                            HttpStatus.INTERNAL_SERVER_ERROR
                    )
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // SEARCH
    // =====================================================

    @GetMapping("/search")@PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> searchUsers(
            @RequestParam String keyword) {

        try {

            List<UserDto> users =
                    userService.searchUsers(
                            keyword
                    );

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Tìm kiếm user thành công",
                            users
                    )
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );

        } catch (Exception e) {

            return ResponseEntity
                    .status(
                            HttpStatus.INTERNAL_SERVER_ERROR
                    )
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // GET BY STATUS
    // =====================================================

    @GetMapping("/status/{status}")@PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> getByStatus(
            @PathVariable String status) {

        try {

            List<UserDto> users =
                    userService.getByStatus(
                            status
                    );

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Lấy user theo trạng thái thành công",
                            users
                    )
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );

        } catch (Exception e) {

            return ResponseEntity
                    .status(
                            HttpStatus.INTERNAL_SERVER_ERROR
                    )
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // GET BY ROLE
    // =====================================================

    @GetMapping("/role/{roleId}")@PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> getByRole(
            @PathVariable Long roleId) {

        try {

            List<UserDto> users =
                    userService.getByRole(
                            roleId
                    );

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Lấy user theo role thành công",
                            users
                    )
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );

        } catch (Exception e) {

            return ResponseEntity
                    .status(
                            HttpStatus.INTERNAL_SERVER_ERROR
                    )
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // ADD
    // =====================================================

    @PostMapping("/add")@PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> addUser(
            @Valid @RequestBody UserRequest request) {

        try {

            users user =
                    userService.addUser(
                            request
                    );

            UserDto dto =
                    userService.convertToDto(
                            user
                    );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(
                            new ApiResponse(
                                    "Thêm user thành công",
                                    dto
                            )
                    );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );

        } catch (Exception e) {

            return ResponseEntity
                    .status(
                            HttpStatus.INTERNAL_SERVER_ERROR
                    )
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // UPDATE
    // =====================================================

    @PutMapping("/{id}")@PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UserRequest request) {

        try {

            UserDto dto =
                    userService.updateUser(
                            id,
                            request
                    );

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Cập nhật user thành công",
                            dto
                    )
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );

        } catch (Exception e) {

            return ResponseEntity
                    .status(
                            HttpStatus.INTERNAL_SERVER_ERROR
                    )
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // DELETE
    // =====================================================

    @DeleteMapping("/{id}")@PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> deleteUser(
            @PathVariable Long id) {

        try {

            userService.deleteUser(id);

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Xóa user thành công",
                            null
                    )
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );

        } catch (Exception e) {

            return ResponseEntity
                    .status(
                            HttpStatus.INTERNAL_SERVER_ERROR
                    )
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );
        }
    }
}