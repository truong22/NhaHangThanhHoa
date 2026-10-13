package com.example.webNhaHangThanhHoa.Service.Product;
import com.example.webNhaHangThanhHoa.Entity.products;
import com.example.webNhaHangThanhHoa.Request.ProductRequest;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;

import com.example.webNhaHangThanhHoa.DTO.ProductDto;

public interface IProductService {

        ProductDto getProductById(Long id);

        List<ProductDto> getAllProducts();

        ProductDto addProduct(
                ProductRequest request,
                MultipartFile image
        );

        ProductDto updateProduct(
                Long id,
                ProductRequest request,
                MultipartFile image
        );

        void deleteProduct(Long id);

        List<ProductDto> searchByName(String name);

        List<ProductDto> getByCategory(Long categoryId);

        List<ProductDto> searchByPrice(
                BigDecimal minPrice,
                BigDecimal maxPrice
        );

        List<ProductDto> getByStatus(String status);
    }