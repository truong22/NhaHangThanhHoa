package com.example.webNhaHangThanhHoa.DTO;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
public class UserDto {

    private Long id;

    private String username;

    private String fullName;

    private String phone;

    private String email;

    private String status;

    private Long roleId;

    private String roleName;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}