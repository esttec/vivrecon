package com.vivrecon.repo

import com.vivrecon.domain.ProfileEntity
import org.springframework.data.jpa.repository.JpaRepository

interface ProfileRepository : JpaRepository<ProfileEntity, Long>