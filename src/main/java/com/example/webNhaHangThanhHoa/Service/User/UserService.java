package com.example.webNhaHangThanhHoa.Service.User;
import com.example.webNhaHangThanhHoa.DTO.UserDto;
import com.example.webNhaHangThanhHoa.Entity.roles;
import com.example.webNhaHangThanhHoa.Entity.users;
import com.example.webNhaHangThanhHoa.Exception.AlreadyExitsException;
import com.example.webNhaHangThanhHoa.Exception.ResourceNotFoundException;
import com.example.webNhaHangThanhHoa.Repository.RoleRepository;
import com.example.webNhaHangThanhHoa.Repository.UserRepository;
import com.example.webNhaHangThanhHoa.Request.UserRequest;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService implements IUserService {

    private final UserRepository userRepository;

    private final RoleRepository roleRepository;

    private final ModelMapper modelMapper;
    private final PasswordEncoder passwordEncoder;
    public users getAuthenticatedUser() {

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        String email = authentication.getName();

        return userRepository
                .findByEmail(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Không tìm thấy user đang đăng nhập"
                        )
                );
    }
    // =====================================================
    // GET ALL
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<UserDto> getAllUsers() {

        return userRepository.findAll()
                .stream()
                .map(this::convertToDto)
                .toList();
    }


    // =====================================================
    // GET BY ID
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public UserDto getUserById(Long id) {

        users user =
                userRepository.findById(id)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Không tìm thấy user với id: " + id
                                )
                        );

        return convertToDto(user);
    }


    // =====================================================
    // GET BY USERNAME
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public UserDto getUserByUsername(
            String username) {

        users user =
                userRepository.findByUsername(username)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Không tìm thấy username: "
                                                + username
                                )
                        );

        return convertToDto(user);
    }


    // =====================================================
    // SEARCH
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<UserDto> searchUsers(
            String keyword) {

        return userRepository
                .search(keyword)
                .stream()
                .map(this::convertToDto)
                .toList();
    }


    // =====================================================
    // GET BY STATUS
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<UserDto> getByStatus(
            String status) {

        return userRepository
                .findByStatus(
                        status.toUpperCase()
                )
                .stream()
                .map(this::convertToDto)
                .toList();
    }


    // =====================================================
    // GET BY ROLE
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<UserDto> getByRole(
            Long roleId) {

        return userRepository
                .findByRoleId(roleId)
                .stream()
                .map(this::convertToDto)
                .toList();
    }


    // =====================================================
    // ADD USER
    // =====================================================

    @Override
    @Transactional
    public users addUser(
            UserRequest request) {

        // ---------------------------------------------
        // Kiểm tra username
        // ---------------------------------------------

        if (userRepository
                .existsByUsername(
                        request.getUsername()
                )) {

            throw new AlreadyExitsException(
                    "Tên đăng nhập đã tồn tại"
            );
        }


        // ---------------------------------------------
        // Kiểm tra email
        // ---------------------------------------------

        if (request.getEmail() != null
                && !request.getEmail().isBlank()
                && userRepository.existsByEmail(
                request.getEmail()
        )) {

            throw new AlreadyExitsException(
                    "Email đã tồn tại"
            );
        }


        // ---------------------------------------------
        // Tìm role
        // ---------------------------------------------

        roles role =
                roleRepository.findById(
                        request.getRoleId()
                ).orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Không tìm thấy role"
                        )
                );


        // ---------------------------------------------
        // Tạo user
        // ---------------------------------------------

        users user = new users();

        user.setUsername(
                request.getUsername()
        );

        user.setPassword
                (passwordEncoder.encode(request.getPassword()));

        user.setFullName(
                request.getFullName()
        );

        user.setPhone(
                request.getPhone()
        );

        user.setEmail(
                request.getEmail()
        );

        user.setStatus(
                request.getStatus() == null
                        ? "ACTIVE"
                        : request.getStatus().toUpperCase()
        );

        user.setRole(role);


        // ---------------------------------------------
        // SAVE
        // ---------------------------------------------

        return userRepository.save(user);
    }


    // =====================================================
    // UPDATE
    // =====================================================

    @Override
    @Transactional
    public UserDto updateUser(
            Long id,
            UserRequest request) {

        users user =
                userRepository.findById(id)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Không tìm thấy user"
                                )
                        );


        // ---------------------------------------------
        // Username
        // ---------------------------------------------

        if (!user.getUsername()
                .equals(request.getUsername())) {

            if (userRepository
                    .existsByUsername(
                            request.getUsername()
                    )) {

                throw new AlreadyExitsException(
                        "Tên đăng nhập đã tồn tại"
                );
            }

            user.setUsername(
                    request.getUsername()
            );
        }


        // ---------------------------------------------
        // Email
        // ---------------------------------------------

        if (request.getEmail() != null
                && !request.getEmail().isBlank()
                && !request.getEmail()
                .equals(user.getEmail())) {

            if (userRepository
                    .existsByEmail(
                            request.getEmail()
                    )) {

                throw new AlreadyExitsException(
                        "Email đã tồn tại"
                );
            }

            user.setEmail(
                    request.getEmail()
            );
        }


        // ---------------------------------------------
        // Password
        // ---------------------------------------------

        if (request.getPassword() != null
                && !request.getPassword().isBlank()) {

            user.setPassword(
                    request.getPassword()
            );
        }


        // ---------------------------------------------
        // Các thông tin khác
        // ---------------------------------------------

        user.setFullName(
                request.getFullName()
        );

        user.setPhone(
                request.getPhone()
        );


        if (request.getStatus() != null
                && !request.getStatus().isBlank()) {

            user.setStatus(
                    request.getStatus().toUpperCase()
            );
        }


        // ---------------------------------------------
        // Role
        // ---------------------------------------------

        if (request.getRoleId() != null) {

            roles role =
                    roleRepository.findById(
                            request.getRoleId()
                    ).orElseThrow(() ->
                            new ResourceNotFoundException(
                                    "Không tìm thấy role"
                            )
                    );

            user.setRole(role);
        }


        // ---------------------------------------------
        // SAVE
        // ---------------------------------------------

        users saved =
                userRepository.save(user);

        return convertToDto(saved);
    }


    // =====================================================
    // DELETE
    // =====================================================

    @Override
    @Transactional
    public void deleteUser(Long id) {

        users user =
                userRepository.findById(id)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Không tìm thấy user"
                                )
                        );

        userRepository.delete(user);
    }


    // =====================================================
    // ENTITY → DTO
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public UserDto convertToDto(
            users user) {

        UserDto dto =
                modelMapper.map(
                        user,
                        UserDto.class
                );

        if (user.getRole() != null) {

            dto.setRoleId(
                    user.getRole().getId()
            );

            dto.setRoleName(
                    user.getRole().getName()
            );
        }

        return dto;
    }
}