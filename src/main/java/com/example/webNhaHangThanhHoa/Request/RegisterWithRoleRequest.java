package com.example.webNhaHangThanhHoa.Request;

import lombok.Data;

@Data
public class RegisterWithRoleRequest {
    private String email;
    private String password;
    private String fullName;
    private String phone;
    private String role;
}
