package com.vivrecon.domain

import jakarta.persistence.*
import java.time.Instant

enum class CategoryKind { INCOME, EXPENSE }

@Entity
@Table(name = "user_categories")
data class UserCategoryEntity(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    val user: UserEntity,

    @Column(nullable = false, length = 100)
    var name: String,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    val kind: CategoryKind,

    /** Null for a top-level category; set to the parent's id for a subcategory. */
    @Column(name = "parent_id")
    val parentId: Long? = null,

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now()
)
