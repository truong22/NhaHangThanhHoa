package com.example.webNhaHangThanhHoa.Exception;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class GlobalExceptionHandler {


    // =====================================================
    // KHÔNG CÓ QUYỀN
    // =====================================================

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<String>
    handleAccessDeniedException(
            AccessDeniedException ex) {

        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(
                        "Bạn không có quyền thực hiện chức năng này"
                );
    }
}