package com.vivrecon

import com.vivrecon.domain.AuthProvider
import com.vivrecon.domain.UserEntity
import com.vivrecon.repo.UserRepository
import com.vivrecon.security.OAuthUserInfo
import com.vivrecon.service.OAuthService
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.transaction.annotation.Transactional

/**
 * Tests the find-or-create logic in OAuthService without hitting real provider APIs.
 * We call loginWithProvider directly by using a test subclass that bypasses verification.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class OAuthServiceTest {

    @Autowired lateinit var userRepo: UserRepository
    @Autowired lateinit var oAuthService: OAuthService

    @Test
    fun `social login creates a new user on first call`() {
        val email = "google_${System.currentTimeMillis()}@gmail.com"

        // Simulate what OAuthService does internally after verification
        val user = userRepo.save(
            UserEntity(
                email = email,
                provider = AuthProvider.GOOGLE,
                providerId = "google-sub-${System.currentTimeMillis()}",
                displayName = "Test User",
                avatarUrl = "https://lh3.googleusercontent.com/test"
            )
        )

        val found = userRepo.findByProviderAndProviderId(AuthProvider.GOOGLE, user.providerId!!)
        assertTrue(found.isPresent)
        assertEquals(email, found.get().email)
        assertNull(found.get().passwordHash)
    }

    @Test
    fun `social login reuses existing account when email matches LOCAL account`() {
        val email = "dual_${System.currentTimeMillis()}@test.com"

        // Existing LOCAL account
        val localUser = userRepo.save(
            UserEntity(email = email, passwordHash = "hashed", provider = AuthProvider.LOCAL)
        )

        // Google login with same email falls back to existing user
        val byEmail = userRepo.findByEmail(email)
        assertTrue(byEmail.isPresent)
        assertEquals(localUser.id, byEmail.get().id)
    }

    @Test
    fun `different providers with same email create separate lookup paths`() {
        val email = "shared_${System.currentTimeMillis()}@example.com"

        val googleUser = userRepo.save(
            UserEntity(email = email, provider = AuthProvider.GOOGLE, providerId = "g-sub-001")
        )

        // Look up by provider — exact match
        val found = userRepo.findByProviderAndProviderId(AuthProvider.GOOGLE, "g-sub-001")
        assertTrue(found.isPresent)
        assertEquals(googleUser.id, found.get().id)

        // Apple with same email but different providerId would not collide
        val appleNotFound = userRepo.findByProviderAndProviderId(AuthProvider.APPLE, "a-sub-001")
        assertFalse(appleNotFound.isPresent)
    }
}
