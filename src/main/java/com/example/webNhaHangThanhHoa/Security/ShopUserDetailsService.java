package com.example.webNhaHangThanhHoa.Security;

import com.example.webNhaHangThanhHoa.Entity.users; // Đảm bảo đúng package của entity User
import com.example.webNhaHangThanhHoa.Repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ShopUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    @Transactional
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        users user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email)); // Đã thêm đủ ngoặc và thông báo lỗi

        return ShopUserDetails.buildUserDetails(user);
    }
}