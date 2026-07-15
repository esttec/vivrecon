package com.vivrecon.domain

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.Instant

enum class FabricType { COTTON, LINEN, WOOL, SILK, BAMBOO, HEMP, OTHER_NATURAL, SYNTHETIC }
enum class ClothingStatus { NEEDED, FOUND, PURCHASED }

@Entity
@Table(name = "clothing_items")
data class ClothingItemEntity(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: UserEntity,

    @Column(nullable = false)
    var itemName: String,

    @Column
    var description: String? = null,

    @Enumerated(EnumType.STRING)
    @Column
    var preferredFabric: FabricType? = null,

    @Column(precision = 10, scale = 2)
    var maxBudget: BigDecimal? = null,

    @Column(precision = 10, scale = 2)
    var actualPrice: BigDecimal? = null,

    @Column
    var storeName: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: ClothingStatus = ClothingStatus.NEEDED,

    @Column(nullable = false, length = 7)
    val yearMonth: String,   // "YYYY-MM"

    @Column(nullable = false)
    val createdAt: Instant = Instant.now()
)
