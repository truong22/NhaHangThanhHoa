package com.example.webNhaHangThanhHoa.Security; // Hoặc package chứa cấu hình của bạn

import com.example.webNhaHangThanhHoa.JWT.AuthTokenFilter;
import com.example.webNhaHangThanhHoa.JWT.JwtAuthEntryPoin;

import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
@EnableMethodSecurity(prePostEnabled = true)
public class ShopConfig {
        private final ShopUserDetailsService userDetailsService;
        private final JwtAuthEntryPoin authEntryPoint;
        private final AuthTokenFilter authTokenFilter;

        private static final List<String> SECURED_URLS = List.of(
                "/api/v1/carts/**",
                "/api/v1/cartItems/**",
                "/api/v1/orders/**",
                "/api/v1/orderItems/**",
                "/api/v1/invoices/**",
                "/api/v1/payments/**"
        );

        @Bean
        public ModelMapper modelMapper() {
            return new ModelMapper();
        }

        @Bean
        public PasswordEncoder passwordEncoder() {
            return new BCryptPasswordEncoder();
        }

        @Bean
        public AuthenticationManager authenticationManager(
                AuthenticationConfiguration authConfig
        ) throws Exception {
            return authConfig.getAuthenticationManager();
        }

        @Bean
        public DaoAuthenticationProvider daoAuthenticationProvider() {

            DaoAuthenticationProvider authProvider =
                    new DaoAuthenticationProvider(userDetailsService);

            authProvider.setPasswordEncoder(passwordEncoder());

            return authProvider;
        }

        @Bean
        public SecurityFilterChain filterChain(
                HttpSecurity http
        ) throws Exception {

            http
                    .csrf(AbstractHttpConfigurer::disable)

                    .exceptionHandling(exception ->
                            exception.authenticationEntryPoint(
                                    authEntryPoint
                            )
                    )

                    .sessionManagement(session ->
                            session.sessionCreationPolicy(
                                    SessionCreationPolicy.STATELESS
                            )
                    )

                    .authorizeHttpRequests(auth ->
                            auth
                                    .requestMatchers(
                                            "/api/v1/auth/**"
                                    ).permitAll()

                                    .requestMatchers(
                                            SECURED_URLS.toArray(
                                                    String[]::new
                                            )
                                    ).authenticated()

                                    .anyRequest().permitAll()
                    )

                    .authenticationProvider(
                            daoAuthenticationProvider()
                    )

                    .addFilterBefore(
                            authTokenFilter,
                            UsernamePasswordAuthenticationFilter.class
                    );

            return http.build();
        }
    }