package com.example.webNhaHangThanhHoa.Controller;

import com.example.webNhaHangThanhHoa.Exception.ResourceNotFoundException;
import com.example.webNhaHangThanhHoa.response.ApiResponse;
import com.example.webNhaHangThanhHoa.Request.ProductRequest;
import com.example.webNhaHangThanhHoa.Service.Product.IProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
public class ProductController {

    private final IProductService productService;


    // =====================================================
    // GET ALL PRODUCTS
    // =====================================================
    @GetMapping("/all")@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'KITCHEN', 'CASHIER')")
    public ResponseEntity<ApiResponse> getAllProducts() {

        try {

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Lấy danh sách sản phẩm thành công",
                            productService.getAllProducts()
                    )
            );

        } catch (Exception e) {

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(
                            new ApiResponse(
                                    "Không thể lấy danh sách sản phẩm",
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // GET PRODUCT BY ID
    // =====================================================
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse> getProductById(
            @PathVariable Long id) {

        try {

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Tìm thấy sản phẩm",
                            productService.getProductById(id)
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
                                    "Có lỗi xảy ra khi tìm sản phẩm",
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // ADD PRODUCT
    // =====================================================
    @PostMapping(
            value = "/add",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )@PreAuthorize("hasRole('ADMIN')")

    public ResponseEntity<ApiResponse> addProduct(

            @Valid
            @ModelAttribute ProductRequest request,

            @RequestPart(
                    value = "image",
                    required = false
            )
                    MultipartFile image) {

        try {

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(
                            new ApiResponse(
                                    "Thêm sản phẩm thành công",
                                    productService.addProduct(
                                            request,
                                            image
                                    )
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
                                    "Có lỗi xảy ra khi thêm sản phẩm",
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // UPDATE PRODUCT
    // =====================================================
    @PutMapping(
            value = "/{id}",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )@PreAuthorize("hasRole('ADMIN')")

    public ResponseEntity<ApiResponse> updateProduct(

            @PathVariable Long id,

            @Valid
            @ModelAttribute ProductRequest request,

            @RequestPart(
                    value = "image",
                    required = false
            )
                    MultipartFile image) {

        try {

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Cập nhật sản phẩm thành công",
                            productService.updateProduct(
                                    id,
                                    request,
                                    image
                            )
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
                                    "Có lỗi xảy ra khi cập nhật sản phẩm",
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // DELETE PRODUCT
    // =====================================================
    @DeleteMapping("/{id}")@PreAuthorize("hasRole('ADMIN')")

    public ResponseEntity<ApiResponse> deleteProduct(
            @PathVariable Long id) {

        try {

            productService.deleteProduct(id);

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Xóa sản phẩm thành công",
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
                                    "Có lỗi xảy ra khi xóa sản phẩm",
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // SEARCH BY NAME
    // =====================================================
    @GetMapping("/search")@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'KITCHEN', 'CASHIER')")
    public ResponseEntity<ApiResponse> searchByName(
            @RequestParam String name) {

        try {

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Tìm kiếm sản phẩm thành công",
                            productService.searchByName(name)
                    )
            );

        } catch (Exception e) {

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(
                            new ApiResponse(
                                    "Có lỗi xảy ra khi tìm kiếm sản phẩm",
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // GET BY CATEGORY
    // =====================================================
    @GetMapping("/category/{categoryId}")@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'KITCHEN', 'CASHIER')")
    public ResponseEntity<ApiResponse> getByCategory(
            @PathVariable Long categoryId) {

        try {

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Lấy sản phẩm theo danh mục thành công",
                            productService.getByCategory(
                                    categoryId
                            )
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
                                    "Có lỗi xảy ra khi tìm sản phẩm theo danh mục",
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // SEARCH BY PRICE
    // =====================================================
    @GetMapping("/price")@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'KITCHEN', 'CASHIER')")
    public ResponseEntity<ApiResponse> searchByPrice(

            @RequestParam BigDecimal min,

            @RequestParam BigDecimal max) {

        try {

            if (min.compareTo(max) > 0) {

                return ResponseEntity
                        .status(HttpStatus.BAD_REQUEST)
                        .body(
                                new ApiResponse(
                                        "Giá thấp nhất không được lớn hơn giá cao nhất",
                                        null
                                )
                        );
            }

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Tìm kiếm sản phẩm theo giá thành công",
                            productService.searchByPrice(
                                    min,
                                    max
                            )
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
                                    "Có lỗi xảy ra khi tìm kiếm theo giá",
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // GET BY STATUS
    // =====================================================
    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'KITCHEN', 'CASHIER')")
    public ResponseEntity<ApiResponse> getByStatus(
            @PathVariable String status) {

        try {

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Lấy sản phẩm theo trạng thái thành công",
                            productService.getByStatus(status)
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
                                    "Có lỗi xảy ra khi lấy sản phẩm theo trạng thái",
                                    null
                            )
                    );
        }
    }
}
