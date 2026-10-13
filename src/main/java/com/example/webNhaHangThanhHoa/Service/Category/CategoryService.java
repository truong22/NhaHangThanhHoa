package com.example.webNhaHangThanhHoa.Service.Category;

import com.example.webNhaHangThanhHoa.DTO.CategoryDto;
import com.example.webNhaHangThanhHoa.Entity.categories;
import com.example.webNhaHangThanhHoa.Exception.AlreadyExitsException;
import com.example.webNhaHangThanhHoa.Exception.ResourceNotFoundException;
import com.example.webNhaHangThanhHoa.Repository.categoryRepository;
import com.example.webNhaHangThanhHoa.Request.CategoryRequest;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;

import java.util.List;
    @Service
    @RequiredArgsConstructor
    public class CategoryService implements ICategoryService {

        private final categoryRepository categoryRepository;
        private final ModelMapper modelMapper;

        @Override
        public categories getCategoryById(Long id) {
            return categoryRepository.findById(id)
                    .orElseThrow(() ->
                            new ResourceNotFoundException(
                                    "Không tìm thấy danh mục"
                            )
                    );
        }

        @Override
        public categories getCategoryByName(String name) {
            categories category =
                    categoryRepository.findByName(name);

            if (category == null) {
                throw new ResourceNotFoundException(
                        "Không tìm thấy danh mục"
                );
            }

            return category;
        }

        @Override
        public List<categories> getAllCategories() {
            return categoryRepository.findAll();
        }

        @Override
        public categories addCategory(CategoryRequest request) {

            if (categoryRepository.existsByName(request.getName())) {
                throw new AlreadyExitsException(
                        request.getName() + " đã tồn tại"
                );
            }

            categories category =
                    modelMapper.map(
                            request,
                            categories.class
                    );

            return categoryRepository.save(category);
        }

        @Override
        public categories updateCategory(
                CategoryRequest request,
                Long id) {

            categories category =
                    getCategoryById(id);

            // Nếu đổi tên thì kiểm tra trùng
            if (!category.getName()
                    .equalsIgnoreCase(request.getName())
                    && categoryRepository.existsByName(
                    request.getName())) {

                throw new AlreadyExitsException(
                        request.getName() + " đã tồn tại"
                );
            }

            category.setName(request.getName());
            category.setDescription(request.getDescription());

            return categoryRepository.save(category);
        }

        @Override
        public void deleteCategoryById(Long id) {

            categories category =
                    getCategoryById(id);

            categoryRepository.delete(category);
        }

        @Override
        public CategoryDto convertToDto(categories category) {

            return modelMapper.map(
                    category,
                    CategoryDto.class
            );
        }

        @Override
        public List<CategoryDto> convertToDtoList(
                List<categories> categories) {

            return categories.stream()
                    .map(this::convertToDto)
                    .toList();
        }
    }