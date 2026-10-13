package com.example.webNhaHangThanhHoa.Controller;
import com.example.webNhaHangThanhHoa.DTO.RoleDto;
import com.example.webNhaHangThanhHoa.Entity.roles;
import com.example.webNhaHangThanhHoa.Request.RoleRequest;
import com.example.webNhaHangThanhHoa.Service.Role.RoleService;
import com.example.webNhaHangThanhHoa.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleService roleService;


    // =====================================================
    // GET ALL
    // =====================================================

    @GetMapping("/all")@PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> getAllRoles() {

        try {

            List<RoleDto> roles =
                    roleService.getAllRoles();

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Lấy danh sách quyền thành công",
                            roles
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
                                    "Có lỗi xảy ra",
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // GET BY ID
    // =====================================================

    @GetMapping("/{id}")@PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> getRoleById(
            @PathVariable Long id) {

        try {

            RoleDto role =
                    roleService.getRoleById(id);

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Tìm thấy quyền",
                            role
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
                                    "Có lỗi xảy ra",
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // SEARCH BY NAME
    // =====================================================

    @GetMapping("/search")@PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> getRoleByName(
            @RequestParam String name) {

        try {

            RoleDto role =
                    roleService.getRoleByName(name);

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Tìm thấy quyền",
                            role
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
                                    "Có lỗi xảy ra",
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // ADD
    // =====================================================

    @PostMapping@PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> addRole(
            @Valid
            @RequestBody RoleRequest request) {

        try {

            roles role =
                    roleService.addRole(request);

            RoleDto dto =
                    roleService.convertToDto(role);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(
                            new ApiResponse(
                                    "Thêm quyền thành công",
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
                                    "Có lỗi xảy ra",
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // UPDATE
    // =====================================================

    @PutMapping("/{id}")@PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> updateRole(

            @PathVariable Long id,

            @Valid
            @RequestBody RoleRequest request) {

        try {

            roles role =
                    roleService.updateRole(
                            id,
                            request
                    );

            RoleDto dto =
                    roleService.convertToDto(role);

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Cập nhật quyền thành công",
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
                                    "Có lỗi xảy ra",
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // DELETE
    // =====================================================

    @DeleteMapping("/{id}")@PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> deleteRole(
            @PathVariable Long id) {

        try {

            roleService.deleteRole(id);

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Xóa quyền thành công",
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
                                    "Có lỗi xảy ra",
                                    null
                            )
                    );
        }
    }
}
