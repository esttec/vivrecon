package com.vivrecon.domain

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.LocalDate
import java.time.Instant

enum class TravelStatus { PLANNING, BOOKED, COMPLETED, CANCELLED }
enum class OfferType { FLIGHT, TRAIN, BUS, HOTEL, PACKAGE }

@Entity
@Table(name = "trips")
data class TripEntity(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: UserEntity,

    @Column(nullable = false)
    var destination: String,

    @Column
    var departureFrom: String? = null,

    @Column
    var startDate: LocalDate? = null,

    @Column
    var endDate: LocalDate? = null,

    @Column(precision = 15, scale = 2)
    var totalBudget: BigDecimal? = null,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: TravelStatus = TravelStatus.PLANNING,

    /** Selected hotel */
    @Column
    var selectedHotel: String? = null,

    @Column(precision = 10, scale = 2)
    var hotelPricePerNight: BigDecimal? = null,

    @Column(nullable = false)
    val createdAt: Instant = Instant.now(),

    /** last time offers were scanned for this trip */
    @Column
    var lastScannedAt: Instant? = null
)

@Entity
@Table(name = "travel_offers")
data class TravelOfferEntity(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    val trip: TripEntity,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    val offerType: OfferType,

    @Column(nullable = false)
    var provider: String,

    @Column(nullable = false)
    var title: String,

    @Column(precision = 10, scale = 2, nullable = false)
    var price: BigDecimal,

    @Column(length = 2048)
    var url: String? = null,

    @Column(nullable = false)
    val scannedAt: Instant = Instant.now(),

    @Column(nullable = false)
    var selected: Boolean = false
)
