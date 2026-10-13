package com.example.webNhaHangThanhHoa.Service.User;
import com.example.webNhaHangThanhHoa.DTO.UserDto;
import com.example.webNhaHangThanhHoa.Entity.users;
import com.example.webNhaHangThanhHoa.Request.UserRequest;

import java.util.List;

public interface IUserService {
    users getAuthenticatedUser();

    // GET ALL
    List<UserDto> getAllUsers();

    // GET BY ID
    UserDto getUserById(Long id);

    // GET BY USERNAME
    UserDto getUserByUsername(String username);

    // SEARCH
    List<UserDto> searchUsers(String keyword);

    // FILTER STATUS
    List<UserDto> getByStatus(String status);

    // FILTER ROLE
    List<UserDto> getByRole(Long roleId);

    // ADD
    users addUser(UserRequest request);

    // UPDATE
    UserDto updateUser(
            Long id,
            UserRequest request
    );

    // DELETE
    void deleteUser(Long id);

    // CONVERT
    UserDto convertToDto(users user);
}