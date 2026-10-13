package com.example.webNhaHangThanhHoa.Controller;
import com.example.webNhaHangThanhHoa.response.ApiResponse;
import com.example.webNhaHangThanhHoa.Request.TableRequest;
import com.example.webNhaHangThanhHoa.Entity.tables_Restaurant;
import com.example.webNhaHangThanhHoa.Service.Table.ITableService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
//import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tables")
@RequiredArgsConstructor
public class TableController {

    private final ITableService tableService;

    // Xem danh sách toàn bộ bàn (Nhân viên và Quản lý đều xem được sơ đồ bàn)
    @GetMapping@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'CASHIER')")
    public ResponseEntity<ApiResponse> getAllTables() {
        try {
            List<tables_Restaurant> list = tableService.getAllTables();
            return ResponseEntity.ok(new ApiResponse("Lấy danh sách bàn thành công!", list));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse("Lỗi: " + e.getMessage(), null));
        }
    }

    // Thêm bàn mới (Chỉ ADMIN)
    @PostMapping@PreAuthorize("hasRole('ADMIN')")
//    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> createTable(@RequestBody TableRequest request) {
        try {
            tables_Restaurant newTable = tableService.createTable(request);
            return ResponseEntity.ok(new ApiResponse("Thêm bàn mới thành công!", newTable));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse("Lỗi: " + e.getMessage(), null));
        }
    }

    // Cập nhật trạng thái bàn (Ví dụ: Chuyển sang OCCUPIED khi khách ngồi, AVAILABLE khi thanh toán)
    @PatchMapping("/{id}/status")@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'CASHIER')")
    public ResponseEntity<ApiResponse> updateStatus(@PathVariable Long id, @RequestBody TableRequest request) {
        try {
            tables_Restaurant updatedTable = tableService.updateTable(id, request);
            return ResponseEntity.ok(new ApiResponse("Cập nhật trạng thái bàn thành công!", updatedTable));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse("Lỗi: " + e.getMessage(), null));
        }
    }

    // Xóa bàn (Chỉ ADMIN)
    @DeleteMapping("/{id}")@PreAuthorize("hasRole('ADMIN')")
//    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> deleteTable(@PathVariable Long id) {
        try {
            tableService.deleteTable(id);
            return ResponseEntity.ok(new ApiResponse("Xóa bàn thành công!", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse("Lỗi: " + e.getMessage(), null));
        }
    }
}