package com.example.webNhaHangThanhHoa.Service.Category;
import com.example.webNhaHangThanhHoa.DTO.CategoryDto;
import com.example.webNhaHangThanhHoa.Entity.categories;
import com.example.webNhaHangThanhHoa.Request.CategoryRequest;

import java.util.List;
public interface ICategoryService {

        categories getCategoryById(Long id);

        categories getCategoryByName(String name);

        List<categories> getAllCategories();

        categories addCategory(CategoryRequest request);

        categories updateCategory(CategoryRequest request, Long id);

        void deleteCategoryById(Long id);

        CategoryDto convertToDto(categories category);

        List<CategoryDto> convertToDtoList(List<categories> categories);
}

