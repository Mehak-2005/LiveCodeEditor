
package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@SpringBootApplication
public class DemoApplication {

    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }

    @RestController
    static class HomeController {

        @GetMapping("/")
        public Map<String, Object> home() {
            return Map.of(
                "success", true,
                "message", "Your Spring Boot application is running!",
                "framework", "Spring Boot"
            );
        }

        @GetMapping("/api/hello")
        public Map<String, Object> hello() {
            return Map.of(
                "success", true,
                "message", "Hello Mehak! API updated successfully!",
                "framework", "Spring Boot"
            );
        }
@GetMapping("/api/status")
public java.util.Map<String, Object> status() {
    return java.util.Map.of(
        "success", true,
        "status", "Application is healthy",
        "framework", "Spring Boot"
    );
}
    }
}
