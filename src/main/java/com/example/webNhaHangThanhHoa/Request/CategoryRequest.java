package com.example.webNhaHangThanhHoa.Request;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

    @Getter
    @Setter
    @NoArgsConstructor
    public class CategoryRequest {

        @NotBlank(message = "Tên danh mục không được để trống")
        @Size(
                max = 100,
                message = "Tên danh mục không được quá 100 ký tự"
        )
        private String name;

        private String description;
}
