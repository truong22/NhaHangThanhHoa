package com.example.webNhaHangThanhHoa.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class JwtReponse {
    private Long id;
    private String token;
    private String fullName;
}
