package com.example.webNhaHangThanhHoa.DTO;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class CategoryDto {

    private Long id;
    private String name;
    private String description;
}