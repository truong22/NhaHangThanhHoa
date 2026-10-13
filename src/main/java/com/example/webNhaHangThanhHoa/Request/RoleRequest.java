package com.example.webNhaHangThanhHoa.Request;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class RoleRequest {

    @NotBlank(message = "Tên quyền không được để trống")
    @Size(
            max = 50,
            message = "Tên quyền không được quá 50 ký tự"
    )
    private String name;

    @Size(
            max = 255,
            message = "Mô tả không được quá 255 ký tự"
    )
    private String description;
}
