package com.example.webNhaHangThanhHoa.Request;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TableRequest {
    private String tableName;
    private Integer capacity;
    private String status;
}
