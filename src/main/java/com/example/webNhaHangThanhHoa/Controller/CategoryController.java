
package com.example.webNhaHangThanhHoa.Controller;

import com.example.webNhaHangThanhHoa.DTO.CategoryDto;
import com.example.webNhaHangThanhHoa.Entity.categories;
import com.example.webNhaHangThanhHoa.Exception.AlreadyExitsException;
import com.example.webNhaHangThanhHoa.Exception.ResourceNotFoundException;
import com.example.webNhaHangThanhHoa.Request.CategoryRequest;
import com.example.webNhaHangThanhHoa.response.ApiResponse;
import com.example.webNhaHangThanhHoa.Service.Category.ICategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RequiredArgsConstructor
@RestController
@RequestMapping("${api.prefix}/categories")
public class CategoryController {

    private final ICategoryService categoryService;


    // =====================================================
    // GET ALL CATEGORY
    // =====================================================
    @GetMapping("/all")@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'KITCHEN', 'CASHIER')")
    public ResponseEntity<ApiResponse> getAllCategories() {

        try {

            List<categories> categories =
                    categoryService.getAllCategories();

            List<CategoryDto> dto =
                    categoryService.convertToDtoList(categories);

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Lấy danh sách danh mục thành công",
                            dto
                    )
            );

        } catch (Exception e) {

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(
                            new ApiResponse(
                                    "Không thể lấy danh sách danh mục",
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // GET CATEGORY BY ID
    // =====================================================
    @GetMapping("/{id}")@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'KITCHEN', 'CASHIER')")
    public ResponseEntity<ApiResponse> getCategoryById(
            @PathVariable Long id) {

        try {

            categories category =
                    categoryService.getCategoryById(id);

            CategoryDto dto =
                    categoryService.convertToDto(category);

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Tìm thấy danh mục",
                            dto
                    )
            );

        } catch (ResourceNotFoundException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );

        } catch (Exception e) {

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(
                            new ApiResponse(
                                    "Có lỗi xảy ra khi tìm danh mục",
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // SEARCH CATEGORY BY NAME
    // =====================================================
    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'KITCHEN', 'CASHIER')")
    public ResponseEntity<ApiResponse> getCategoryByName(
            @RequestParam String name) {

        try {

            categories category =
                    categoryService.getCategoryByName(name);

            if (category == null) {

                return ResponseEntity
                        .status(HttpStatus.NOT_FOUND)
                        .body(
                                new ApiResponse(
                                        "Không tìm thấy danh mục: " + name,
                                        null
                                )
                        );
            }

            CategoryDto dto =
                    categoryService.convertToDto(category);

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Tìm thấy danh mục",
                            dto
                    )
            );

        } catch (Exception e) {

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(
                            new ApiResponse(
                                    "Có lỗi xảy ra khi tìm danh mục",
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // ADD CATEGORY
    // =====================================================
    @PostMapping@PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> addCategory(
            @Valid @RequestBody CategoryRequest request) {

        try {

            categories category =
                    categoryService.addCategory(request);

            CategoryDto dto =
                    categoryService.convertToDto(category);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(
                            new ApiResponse(
                                    "Thêm danh mục thành công",
                                    dto
                            )
                    );

        } catch (AlreadyExitsException e) {

            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
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
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(
                            new ApiResponse(
                                    "Có lỗi xảy ra khi thêm danh mục",
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // UPDATE CATEGORY
    // =====================================================
    @PutMapping("/{id}")@PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> updateCategory(
            @PathVariable Long id,
            @Valid @RequestBody CategoryRequest request) {

        try {

            categories category =
                    categoryService.updateCategory(
                            request,
                            id
                    );

            CategoryDto dto =
                    categoryService.convertToDto(category);

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Cập nhật danh mục thành công",
                            dto
                    )
            );

        } catch (ResourceNotFoundException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );

        } catch (AlreadyExitsException e) {

            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
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
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(
                            new ApiResponse(
                                    "Có lỗi xảy ra khi cập nhật danh mục",
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // DELETE CATEGORY
    // =====================================================
    @DeleteMapping("/{id}")@PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> deleteCategory(
            @PathVariable Long id) {

        try {

            categoryService.deleteCategoryById(id);

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Xóa danh mục thành công",
                            null
                    )
            );

        } catch (ResourceNotFoundException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
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
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(
                            new ApiResponse(
                                    "Có lỗi xảy ra khi xóa danh mục",
                                    null
                            )
                    );
        }
    }
}