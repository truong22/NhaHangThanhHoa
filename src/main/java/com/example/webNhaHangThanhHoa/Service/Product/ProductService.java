package com.example.webNhaHangThanhHoa.Service.Product;
import com.example.webNhaHangThanhHoa.DTO.ProductDto;
import com.example.webNhaHangThanhHoa.Entity.categories;
import com.example.webNhaHangThanhHoa.Entity.products;
import com.example.webNhaHangThanhHoa.Exception.ResourceNotFoundException;
import com.example.webNhaHangThanhHoa.Repository.categoryRepository;
import com.example.webNhaHangThanhHoa.Repository.ProductRepository;
import com.example.webNhaHangThanhHoa.Request.ProductRequest;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ProductService implements IProductService {
        private final ProductRepository productRepository;
        private final categoryRepository categoryRepository;
        private final ModelMapper modelMapper;

        @Override
        public ProductDto getProductById(Long id) {

            products product = productRepository
                    .findById(id)
                    .orElseThrow(() ->
                            new RuntimeException(
                                    "Không tìm thấy sản phẩm"
                            )
                    );

            return convertToDto(product);
        }

        @Override
        public List<ProductDto> getAllProducts() {

            return productRepository.findAll()
                    .stream()
                    .map(this::convertToDto)
                    .toList();
        }

        @Override
        public ProductDto addProduct(
                ProductRequest request,
                MultipartFile image) {

            if (productRepository
                    .existsByNameIgnoreCase(request.getName())) {

                throw new RuntimeException(
                        "Tên món đã tồn tại"
                );
            }

            categories category = categoryRepository
                    .findById(request.getCategoryId())
                    .orElseThrow(() ->
                            new RuntimeException(
                                    "Không tìm thấy danh mục"
                            )
                    );

            products product =
                    modelMapper.map(
                            request,
                            products.class
                    );

            product.setId(null);
            product.setCategory(category);

            if (image != null && !image.isEmpty()) {
                String imageUrl = saveImage(image);
                product.setImageUrl(imageUrl);
            }

            products saved =
                    productRepository.save(product);

            return convertToDto(saved);
        }

        @Override
        public ProductDto updateProduct(
                Long id,
                ProductRequest request,
                MultipartFile image) {

            products product = productRepository
                    .findById(id)
                    .orElseThrow(() ->
                            new RuntimeException(
                                    "Không tìm thấy sản phẩm"
                            )
                    );

            if (productRepository
                    .existsByNameIgnoreCaseAndIdNot(
                            request.getName(),
                            id)) {

                throw new RuntimeException(
                        "Tên món đã tồn tại"
                );
            }

            categories category = categoryRepository
                    .findById(request.getCategoryId())
                    .orElseThrow(() ->
                            new RuntimeException(
                                    "Không tìm thấy danh mục"
                            )
                    );

            // Không map toàn bộ request vào entity
            // để tránh ghi đè ID.
            product.setName(request.getName());
            product.setDescription(
                    request.getDescription()
            );
            product.setPrice(request.getPrice());
            product.setStatus(request.getStatus());
            product.setCategory(category);

            if (image != null && !image.isEmpty()) {
                String imageUrl = saveImage(image);
                product.setImageUrl(imageUrl);
            }

            products updated =
                    productRepository.save(product);

            return convertToDto(updated);
        }

        @Override
        public void deleteProduct(Long id) {

            products product = productRepository
                    .findById(id)
                    .orElseThrow(() ->
                            new RuntimeException(
                                    "Không tìm thấy sản phẩm"
                            )
                    );

            productRepository.delete(product);
        }

        @Override
        public List<ProductDto> searchByName(
                String name) {

            return productRepository
                    .findByNameContainingIgnoreCase(name)
                    .stream()
                    .map(this::convertToDto)
                    .toList();
        }

        @Override
        public List<ProductDto> getByCategory(
                Long categoryId) {

            return productRepository
                    .findByCategoryId(categoryId)
                    .stream()
                    .map(this::convertToDto)
                    .toList();
        }

        @Override
        public List<ProductDto> searchByPrice(
                BigDecimal minPrice,
                BigDecimal maxPrice) {

            return productRepository
                    .findByPriceBetween(
                            minPrice,
                            maxPrice
                    )
                    .stream()
                    .map(this::convertToDto)
                    .toList();
        }

        @Override
        public List<ProductDto> getByStatus(
                String status) {

            return productRepository
                    .findByStatusIgnoreCase(status)
                    .stream()
                    .map(this::convertToDto)
                    .toList();
        }

        private ProductDto convertToDto(
                products product) {

            ProductDto dto =
                    modelMapper.map(
                            product,
                            ProductDto.class
                    );

            dto.setCategoryId(
                    product.getCategory().getId()
            );

            dto.setCategoryName(
                    product.getCategory().getName()
            );

            return dto;
        }

        private String saveImage(MultipartFile image) {
    try {
        String folder = "uploads/";
        java.io.File dir = new java.io.File(folder);
        if (!dir.exists()) {
            dir.mkdirs();
        }
        String filename = image.getOriginalFilename();
        String uniqueFilename = UUID.randomUUID().toString() + "_" + filename;
        Path path = Paths.get(folder + uniqueFilename);
        Files.copy(image.getInputStream(), path, StandardCopyOption.REPLACE_EXISTING);
        return "/uploads/" + uniqueFilename;
    } catch (IOException e) {
        throw new RuntimeException("Failed to store image", e);
    }
}
    }
