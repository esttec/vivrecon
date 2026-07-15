package com.vivrecon

import com.fasterxml.jackson.databind.ObjectMapper
import com.vivrecon.dto.LoginRequest
import com.vivrecon.dto.RegisterRequest
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.get

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthIntegrationTest {

    @Autowired lateinit var mvc: MockMvc
    @Autowired lateinit var mapper: ObjectMapper

    @Test
    fun `register and login returns tokens`() {
        val email = "test_${System.currentTimeMillis()}@vivrecon.test"
        val password = "Test@1234"

        // Register
        val registerResult = mvc.post("/api/auth/register") {
            contentType = MediaType.APPLICATION_JSON
            content = mapper.writeValueAsString(RegisterRequest(email, password))
        }.andExpect {
            status { isOk() }
            jsonPath("$.accessToken") { exists() }
            jsonPath("$.refreshToken") { exists() }
            jsonPath("$.disclaimerAccepted") { value(false) }
        }.andReturn()

        val accessToken = mapper.readTree(registerResult.response.contentAsString)["accessToken"].asText()

        // Get /me with token
        mvc.get("/api/me") {
            header("Authorization", "Bearer $accessToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.email") { value(email) }
        }
    }

    @Test
    fun `login with wrong password returns 400`() {
        mvc.post("/api/auth/login") {
            contentType = MediaType.APPLICATION_JSON
            content = mapper.writeValueAsString(LoginRequest("nobody@vivrecon.test", "wrong"))
        }.andExpect {
            status { isBadRequest() }
        }
    }

    @Test
    fun `unauthenticated access returns 403`() {
        mvc.get("/api/me").andExpect { status { isForbidden() } }
    }
}
